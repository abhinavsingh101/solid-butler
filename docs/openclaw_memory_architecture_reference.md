# OpenClaw Memory Architecture Reference

## At a Glance
OpenClaw memory is designed around one strict idea:
- if it is not written to durable storage, it is not dependable memory.

In practice, OpenClaw separates:
- short-lived model context (can be pruned/compacted), and
- durable workspace memory files (source of truth).

This document reflects primary source documentation as of 2026-02-24.

## Scope and Confidence
- Last reviewed: 2026-02-24 from primary sources (docs.openclaw.ai).
- Sections marked `[Research]` come from the v2 research notes page, not stable product docs.

---

## 1) Core Mental Model
OpenClaw memory is **file-first**.

- Durable memory lives in Markdown files in the workspace.
- In-session context helps the model reason now, but is not long-term truth.
- Compaction and pruning optimize context window use; they do not replace durable memory writing.

---

## 2) Default Memory Files

### Daily log
- Path: `memory/YYYY-MM-DD.md`
- Append-only. Loaded for today + yesterday at session start.

### Curated durable memory
- Path: `MEMORY.md` (optional, user-maintained)
- Stable preferences, decisions, durable facts.
- Only loaded in the main/private session context — never in group/shared contexts.

**Design implication:** Keep high-churn notes and durable knowledge separate.

---

## 3) Memory Tools
Two tools are exposed to the agent:

- `memory_search` — semantic search over Markdown chunks from `MEMORY.md` + `memory/**/*.md`. Returns snippet text (capped ~700 chars), file path, line range, score, provider/model. Does NOT return full files.
- `memory_get` — targeted read of a specific memory Markdown file, optionally from a line range. Paths outside `MEMORY.md` / `memory/` are rejected.

Both tools are only active when `memorySearch.enabled` resolves true.

---

## 4) Retrieval Pipeline (Full Detail)

OpenClaw does not use simple vector search. The actual pipeline is:

```
Vector + BM25 → Weighted Merge → Temporal Decay → Sort → MMR → Top-K
```

### Step 1: Candidate generation
- **Vector (semantic):** top `maxResults × candidateMultiplier` results by cosine similarity.
- **BM25 (lexical):** top `maxResults × candidateMultiplier` by FTS5 BM25 rank.

### Step 2: Weighted merge
```
finalScore = vectorWeight × vectorScore + textWeight × textScore
```
- Default: `vectorWeight=0.7`, `textWeight=0.3` (normalized to 1.0).
- If embeddings are unavailable, BM25-only results are still returned (no hard failure).
- If FTS5 creation fails, falls back to vector-only.

### Step 3: Temporal decay (recency boost)
```
decayedScore = score × e^(-λ × ageInDays)
where λ = ln(2) / halfLifeDays
```
- Default `halfLifeDays=30`: score halves every 30 days.
- Today: 100% of score. 7 days ago: ~84%. 30 days ago: 50%. 90 days ago: ~12.5%.
- **Exempt from decay:** `MEMORY.md` and non-dated files in `memory/` (e.g., `memory/network.md`) — these are durable reference files that should always rank normally.

### Step 4: MMR re-ranking (diversity)
```
λ × relevance − (1−λ) × max_similarity_to_selected
```
- Default `lambda=0.7` (slight relevance bias, some diversity).
- MMR prevents near-duplicate chunks from filling the result set.

### Step 5: Top-K output
- Snippet-only, with provenance (file path, line range, score).

### Why hybrid matters
- Semantic catches paraphrases ("cleaned the kitchen" vs "wiped down counters").
- Lexical catches exact terms — names, IDs, chore titles.

---

## 5) Indexing Pipeline

- **Chunks:** Markdown chunked at ~400 token target with 80-token overlap.
- **Index store:** Per-agent SQLite at `~/.openclaw/memory/<agentId>.sqlite`.
- **Freshness:** File watcher on `MEMORY.md` + `memory/` marks index dirty (1.5s debounce). Sync runs on session start, on search, or on interval — asynchronously.
- **Stale risk:** Search can briefly return slightly stale results during background sync.
- **Reindex triggers:** If embedding provider/model, endpoint fingerprint, or chunking params change, the entire index is reset and rebuilt.

---

## 6) Automatic Memory Flush (Pre-Compaction)

Before a session's context window approaches compaction, OpenClaw can trigger a silent turn to encourage the model to write durable notes:

```
Soft threshold: contextWindow - reserveTokensFloor - softThresholdTokens
```

- Flush is silent (`NO_REPLY` — not shown to user).
- Runs once per compaction cycle, tracked in `sessions.json` via `memoryFlushAt`.
- Skipped if workspace is read-only (`workspaceAccess: "ro"` or `"none"`).

**Important:** This is relevant for OpenClaw's chat-agent model, not for stateless API routes. Butler's request-response architecture has no session to compact.

---

## 7) Compaction vs Pruning (Distinct Operations)

These are separate mechanisms — often confused:

- **Compaction:** Summarises the session conversation and persists it to the JSONL transcript. The model context for future turns becomes: [compaction summary] + [recent messages after the compaction point]. Run manually via `/compact` or automatically when token threshold is crossed.
- **Session pruning:** Trims old `toolResult` messages in-memory, per request, before sending to the model. Does not modify the JSONL transcript. Only prunes tool results (never user/assistant messages). Primarily a cost optimization for Anthropic prompt caching.

---

## 8) Session Persistence

Two layers:

1. **Session store (`sessions.json`):** Key/value map of session metadata — current session ID, last activity, token counters, compaction count, model overrides. Small, mutable, safe to edit.
2. **Transcripts (`<sessionId>.jsonl`):** Append-only, tree-structured (each entry has `id` + `parentId`). Contains user/assistant messages, tool calls, compaction summaries. Used to rebuild model context for future turns.

**Session isolation (important for multi-user setups):**
- Default: `dmScope: "main"` — all DMs share one session. Fine for single-user.
- For multi-user: `dmScope: "per-channel-peer"` isolates each conversation partner's context. Without this, context bleeds between users.

---

## 9) Research: Memory v2 — Retain / Recall / Reflect (Research)

From OpenClaw's v2 research notes (not yet stable product behavior, but the design direction):

### The three-phase loop

**Retain:** At end of day, add a `## Retain` section to the daily log with 2–5 self-contained, tagged facts:
```
## Retain
- W @Entity: objective world fact
- B @Entity: what the agent/user did (biographical)
- O(c=0.9) @Entity: opinion/preference with confidence
- S: observation or generated summary
```

**Recall:** Queries over the derived index support: lexical (FTS5), entity-based, temporal, opinion (with confidence + evidence), and kind-filtered queries.

**Reflect:** A scheduled job that:
- Updates entity pages in `bank/entities/` from recent facts.
- Updates `bank/opinions.md` confidence based on new reinforcing or contradicting evidence.
- Small confidence deltas for incremental evidence; large jumps require strong contradiction + repeated signals.

### Confidence-bearing opinions
Each opinion has: statement, confidence `c ∈ [0,1]`, `last_updated`, and evidence links (supporting + contradicting). This is the mechanism for "learns individual preferences" — preferences are opinions that strengthen or weaken based on observed behavior.

This pattern is directly relevant to Butler's `MemorySummary.confidence` field, which currently has no defined update rule.

---

## 10) Reusable Patterns for Butler

Patterns confirmed from primary sources that apply to an app context (not just a chat agent):

1. **Durable-first writes**: any signal not written as an event row doesn't exist for learning purposes.
2. **Append-only raw events + periodic curated summaries**: raw history is immutable; summaries are derived and refreshable.
3. **Bounded retrieval**: return snippets with provenance, not full documents.
4. **Temporal decay**: recent behavioral patterns should outweigh older ones.
5. **Confidence-bearing opinions** with defined update rules: don't just store a confidence score — define when and how it moves.
6. **Typed facts (W/B/O/S)**: distinguishing between objective facts, behavioral patterns, and preferences helps retrieval and avoids mixing durable truths with stale observations.

## 11) What Does NOT Apply to Butler

OpenClaw is a long-running conversational agent. Butler is a stateless web app. The following OpenClaw mechanisms are **not relevant** to Butler's architecture:

- Pre-compaction memory flush (no persistent session context)
- JSONL transcript management and session compaction
- Session pruning for prompt cache optimization
- `dmScope` session isolation (Butler uses JWT-authenticated HTTP sessions)
- Wake-word / always-on session management

---

## Sources (Primary)
- [OpenClaw Memory](https://docs.openclaw.ai/concepts/memory)
- [OpenClaw Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace)
- [OpenClaw Session Management](https://docs.openclaw.ai/concepts/session)
- [OpenClaw Compaction](https://docs.openclaw.ai/concepts/compaction)
- [OpenClaw Session Pruning](https://docs.openclaw.ai/concepts/session-pruning)
- [OpenClaw Session Management Deep Dive](https://docs.openclaw.ai/reference/session-management-compaction)
- [OpenClaw Memory v2 Research](https://docs.openclaw.ai/research/memory)
