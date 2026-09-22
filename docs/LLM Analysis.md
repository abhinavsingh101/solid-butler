# Expert LLM Analysis: House Butler

> Reviewed: all `/docs`, full Prisma schema, `src/lib/`, `src/app/api/`. OpenClaw docs read from primary sources.  
> Date: 2026-02-24

---

## 1. Where Things Actually Stand

The gap between the plan and the code is large, and it matters to name it clearly.

**What the LLM layer is today:**  
Free text → static system prompt + a string of context summaries (currently always empty) → Claude → `JSON.parse` → Zod validation → DB write.

This is a sound MVP starting point. The schema and planning docs are well ahead of it — the right tables exist, the right events are modeled. But several loops that make the system learn are missing their write paths. Until those exist, the LLM generates checklists from the raw input description alone, with no household knowledge.

| Component | Status |
|---|---|
| `claude.ts` — LLM call + fallback | ✅ Done |
| `situations.ts` — Zod validation, context builder | ✅ Done |
| `MemorySummary`, `AiFeedbackEvent`, `AssignmentEvent` tables | ✅ Schema exists |
| Memory refresh job (`memory:refresh`) | ❌ Not built |
| Feedback write paths in the UI | ❌ Not built |
| `LlmMemory` populated with any data | ❌ Empty |
| Deterministic candidate scorer | ❌ Not built |
| Observability (latency, parse failures) | ❌ Not built |

---

## 2. The Core Product Promise vs the Current Reality

The product value is: *"learns from actual household behavior, gets better over time."* Three things must close for that to be real:

**Loop 1 — Behavioral capture:** Every meaningful app action (who assigned what, who completed when, who changed a suggestion) writes an event. This loop is **partially closed** — `COMPLETED`, `SKIPPED`, `REASSIGNED` events are modeled, but acceptance/rejection of AI suggestions and edits to generated checklists are not written anywhere.

**Loop 2 — Memory consolidation:** A scheduled job reads raw events and writes stable patterns to `MemorySummary`. This loop is **not yet built**. Until it runs, the `buildHouseholdHistoryContext` function always returns "none yet" for all three context sections.

**Loop 3 — Retrieval into prompts:** At generation time, recent events and summaries are fetched and injected into the Claude prompt. This loop is **structurally built** but inert because Loop 2 has no output to feed it.

The architecture is correct. The delivery sequence needs to prioritize closing Loop 1 and Loop 2 before expanding AI features.

---

## 3. Specific Issues in the Current Code

### `max_tokens: 1500` is the output cap, not the input
This caps the *generation*, not the context. A long checklist (15 items × detailed descriptions) can hit this ceiling, producing a mid-JSON response that silently fails Zod validation, falls through to the generic fallback, and gives the user two placeholder items with no indication something went wrong. **Fix: raise to at least 4,096.**

### JSON fence stripping is fragile
```typescript
const jsonText = content.text.trim().replace(/^```json/, '').replace(/```$/, '')
```
This strips ` ```json ` at the start but not ` ``` ` (without language tag), and fails if Claude adds any prose before or after the block. Claude 3.5 Sonnet is well-behaved with explicit instructions but this will occasionally break under long context. **Fix: add `"Output only valid JSON, no surrounding text or markdown"` to the system prompt, which eliminates the need for stripping.** This is more reliable than regex cleanup.

### `LlmMemory` is a shared global
The model has one row per `contextType` with no `userId` — it's household-global. For a 2-user MVP this is fine, but per-user preference learning (Abhinav's patterns vs the other member's) requires a user dimension. The `MemorySummary.subjectKey` field can carry this (`user:abhinav:CHORE_TYPE`) but this convention is never defined anywhere. **Define it now, before the tables accumulate data shaped incorrectly.**

### No token budget awareness
The `buildHouseholdHistoryContext` function concatenates sections without counting tokens. Once `MemorySummary` has real data and `recentSituations` grows, the context string could be very large. Claude 3.5 Sonnet's 200K window makes this low-risk at MVP scale, but there's no guardrail if retrieved sections grow unboundedly. A simple character count check would prevent prompt bloat during the early learning phase.

---

## 4. What the OpenClaw Architecture Actually Teaches Here

> OpenClaw's approach was used in the planning docs but with some important details missing or imprecisely translated. Having now read the primary sources, here's what's actually useful vs what isn't directly applicable.

**What's directly applicable:**

OpenClaw separates two memory types that map cleanly onto the Butler schema:
- *Daily append-only log* → the Butler's raw event tables (`chore_history`, `assignment_events`, etc.)
- *Curated durable memory (MEMORY.md)* → `MemorySummary` / `LlmMemory`

The key principle from the primary docs: **"If it is not written to durable storage, it is not dependable memory."** In Butler's context, this means a suggestion acceptance or a checklist edit that isn't written as an event row simply didn't happen for learning purposes.

OpenClaw's retrieval pipeline is more sophisticated than the Butler reference doc described: it runs `Vector + BM25 → weighted merge → temporal decay → MMR reranking → Top-K`. The temporal decay is particularly relevant for Butler — older behavioral patterns should influence suggestions less than recent ones. The Butler retrieval plan doesn't yet model recency weighting.

The **Retain / Recall / Reflect** loop from OpenClaw's v2 research aligns with the Butler plan but adds a precision the Butler docs don't have: typed facts with confidence scores. In OpenClaw v2, a fact is typed as World (W), Experience (B), Opinion/preference (O), or Observation (S), and opinions explicitly carry a confidence value that decays under contradiction. For Butler, this maps to: a pattern like "Abhinav tends to do kitchen tasks" is an **opinion** with a confidence that should rise when he keeps doing them and fall when he doesn't. The Butler schema stores `confidence` in `MemorySummary` but doesn't define how it moves.

**What's not directly applicable:**

OpenClaw is a *conversational agent* that persists JSONL chat transcripts and runs compaction when its context window fills. Butler is a *web app* with stateless API routes — there's no persistent session to compact, no context window to manage across turns. The pre-compaction memory flush pattern, session pruning, and JSONL transcript structure are all session-management concerns for a long-running chat agent. They don't translate to Butler's request-response architecture. This distinction matters: Butler's "memory" problem is fundamentally about feature engineering from a relational database, not about managing a sliding context window.

---

## 5. Learning Signal Quality

The plan identifies three signal classes. Here's how complete the write paths are today:

| Signal | Schema | Write path |
|---|---|---|
| Who completed which chore, when | `ChoreHistory(COMPLETED)` + `completedAt` | ✅ |
| Who assigned to whom (self vs other) | `AssignmentEvent(CREATED)` with `actorUserId` | ✅ |
| Skip/defer patterns | `AssignmentEvent(SKIPPED)` | ✅ |
| Reassignment away from suggestion | `AssignmentEvent(REASSIGNED)` | ✅ |
| Suggestion accepted/rejected | `AiFeedbackEvent` | ❌ No write path |
| Checklist item edited after LLM generation | `SituationItem` update | ❌ No edit-event logged |
| Completion timing (hour of day, weekday) | Derivable from `completedAt` | ✅ (derivable) |

The two missing write paths are not optional — they are the primary feedback signal distinguishing "the AI suggested X and the user kept it" from "the AI suggested X and the user immediately changed it." Without this, the memory consolidation job cannot produce meaningful preference patterns, and the suggestion quality can never improve.

---

## 6. Voice Interaction — Honest Assessment

Voice is correctly deferred. But there are a few design decisions worth settling now because they affect the schema and service architecture:

**The unified event envelope is the right call.** The `SourceChannel` enum (`UI | TEXT | VOICE | SYSTEM`) on `AssignmentEvent` means voice-captured actions participate in the same learning pipeline as manual ones. This is the correct abstraction.

**What's unresolved that needs a decision eventually:**

- *STT choice:* Web Speech API (free, on-device, offline-capable, lower accuracy particularly for Indian English) vs Whisper API (excellent accuracy, ~$0.006/min, round-trip adds latency) vs streaming options like Deepgram. For a private household app used mostly at home on Wi-Fi, Whisper is probably the right call when the time comes.

- *Intent extraction:* A raw voice transcript ("mark kitchen clean" vs "we're having guests this weekend" vs "what's left for today?") routes to completely different app actions. This needs a thin classification step before entering any memory pipeline. The plan doesn't yet include this component.

- *Hands-free UX:* The product scope mentions hands-free capture. This implies some form of always-on activation, which is a battery and privacy tradeoff. Push-to-talk (a persistent floating button) is much simpler and avoids both concerns. Worth deciding before design work starts.

---

## 7. Model and Stack Choices

**Claude 3.5 Sonnet — correct choice for user-facing generation.** Strong instruction following, excellent at structured JSON output, and 200K context is ample for the foreseeable data volumes. No reason to change this.

**Consider claude-3-5-haiku for background jobs.** Once the memory refresh job is built, it will run daily over potentially large event windows and synthesize summaries. This doesn't need Sonnet quality — it needs throughput and low cost. Haiku is ~20× cheaper and well-suited for summarization.

**No vector store yet — correct.** For 2 users and modest event volume, `pg_trgm` full-text search over `MemorySummary.summaryText` is sufficient and already available in Postgres. Adding a vector store before retrieval quality can even be measured would be premature.

**Streaming is missing and would noticeably improve UX.** The current implementation blocks while Claude generates the full checklist. Using `stream: true` with the Anthropic SDK and Server-Sent Events would let item cards appear progressively — a meaningful improvement for something that currently shows a blank screen for 3–5 seconds.

---

## 8. What the Plans Get Right

Worth naming explicitly:

- **Manual control first, AI suggestions second.** This is the right sequencing. Automating assignment before trust is established is a common AI product failure.
- **Deterministic scoring before LLM refinement.** Rule engine + LLM is more robust than LLM-only for structured decisions with sparse early data.
- **Append-only event history from day 1.** This is non-negotiable for a learning system and was done correctly.
- **Strict schema validation gating every LLM write.** The Zod validation in `situations.ts` and the fallback pattern are solid.
- **The decision log.** 22 live, dated, rationale-bearing decisions is unusually disciplined for an MVP-stage project. It will pay dividends when AI behavior is later tuned.

---

## 9. Prioritized Actions

### Immediately (before any new AI features)

1. **Raise `max_tokens` to 4096** in `claude.ts`. Current 1,500 cap silently truncates long checklists.
2. **Add `"Output only valid JSON, no surrounding text"` to the system prompt.** Remove the fragile fence-stripping regex.
3. **Write `AiFeedbackEvent` when a user changes a suggested assignee** in the situation editor. This is the highest-leverage change — it unblocks the entire learning loop.
4. **Log edit events when generated checklist items are modified** (title, description, or assignee changed post-generation). Store the original suggested value and the new value.

### Before building the suggestion engine (R1 milestone)

5. **Build and run the memory refresh job** before R2 work starts. The deterministic scorer in R2 needs populated `MemorySummary` rows to compute features from. This is a hidden dependency the roadmap doesn't call out.
6. **Define the `subjectKey` convention** for per-user patterns in `MemorySummary` (e.g. `user:{username}:{choreCategory}`). Document it in `decision_log.md`. Do this before data accumulates in an undefined format.
7. **Define how `confidence` in `MemorySummary` moves.** The field exists; it needs a simple rule (e.g., accepted suggestion raises by 0.05, rejected lowers by 0.1, capped 0.1–0.95). This connects the feedback loop to actual memory quality.

### In R2–R3

8. **Implement streaming** for checklist generation using SSE. Users shouldn't wait staring at a blank screen.
9. **Add recency weighting to retrieval.** When the context builder fetches `recentSituations`, weight recent ones more. A simple approach: filter to last 30 days, with a secondary bucket for older ones.
10. **Use Haiku for the daily memory refresh job**, Sonnet only for user-facing generation.

### Voice (design decisions to settle before development)

11. **Commit to push-to-talk** (not always-on wake word) as the MVP voice interaction model. Simpler, better battery, no privacy concern.
12. **Design the intent classifier** — the thin step that maps a voice transcript to one of {command, new-situation, query, unknown} before routing to the memory pipeline.
