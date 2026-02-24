# OpenClaw Memory Architecture Reference

## At a Glance
OpenClaw memory is designed around one strict idea:
- if it is not written to durable storage, it is not dependable memory.

In practice, OpenClaw separates:
- short-lived model context (can be pruned/compacted), and
- durable workspace memory files (source of truth).

This document summarizes the architecture in a readable, implementation-focused way.

## Scope and Confidence
- Retrieval date: 2026-02-24.
- Primary sources: official OpenClaw docs and OpenClaw research pages.
- Stability labels used in this doc:
  - `Stable`: documented platform behavior.
  - `Experimental`: documented but explicitly marked experimental.
  - `Research`: design direction from research notes, not guaranteed product behavior.

## 1) Core Mental Model (`Stable`)
OpenClaw memory is file-first.

Meaning:
- Durable memory lives in Markdown files in the workspace.
- In-session context helps the model reason now, but is not long-term truth.
- Compaction and pruning optimize context window use; they do not replace durable memory writing.

Why this matters:
- Long sessions are safe only when important facts are persisted to disk.

## 2) Default Memory Layers (`Stable`)
OpenClaw defines two default memory layers.

### Layer A: Daily log
- Path: `memory/YYYY-MM-DD.md`
- Usage: day-level notes and running context.
- Pattern: append-oriented.

### Layer B: Durable curated memory
- Path: `MEMORY.md` (optional)
- Usage: stable preferences, decisions, durable facts.
- Scope rule: loaded for private/main contexts, not shared group contexts.

Design implication:
- Keep high-churn notes and durable knowledge separate.

## 3) Workspace and Trust Boundary (`Stable`)
OpenClaw separates workspace content from platform internals.

Typical split:
- Workspace: agent files, memory markdown, project docs.
- `~/.openclaw/`: config, credentials, transcripts, managed runtime artifacts.

Security implication:
- Filesystem access is the practical trust boundary.
- Durability and privacy depend on OS-level controls.

## 4) Compaction and Pre-Compaction Memory Flush (`Stable`)
OpenClaw supports a pre-compaction memory flush pattern.

What happens:
1. Session token usage approaches a soft threshold.
2. OpenClaw can run a silent turn to encourage writing durable notes.
3. The turn is suppressed from user output via `NO_REPLY` behavior.
4. Flush runs once per compaction cycle and only when workspace is writable.

Why this exists:
- Prevents losing important context when compaction runs.

Important nuance:
- Compaction summarizes session context.
- Pruning trims old tool-output clutter in memory context.
- Neither is a substitute for durable writes.

## 5) Memory Plugin Slot and Tools (`Stable`)
Memory behavior is plugin-driven (`memory-core` by default).

Key tools:
- `memory_search`
  - semantic retrieval over indexed memory chunks
  - returns snippets + metadata (path/line range/score), not full files
- `memory_get`
  - targeted read of allowed memory files/lines

Design value:
- Reduces accidental context overload.
- Keeps retrieval auditable and bounded.

## 6) Indexing Pipeline (`Stable`)
OpenClaw uses a derived index over memory sources.

Documented characteristics:
- Markdown chunking (token-targeted with overlap).
- Per-agent SQLite index store.
- Watchers mark index dirty on file updates (debounced).
- Sync can run on session start, search trigger, and schedule.
- Sync is asynchronous; search can briefly be stale during background updates.

Reindex behavior:
- Embedding/index parameter changes can trigger full reindex.
- Index is rebuildable derived state; source files remain canonical.

## 7) Hybrid Retrieval (`Stable` + `Research`)
OpenClaw docs describe hybrid retrieval direction:
- semantic/vector retrieval for meaning-level matches
- lexical/BM25/FTS retrieval for exact token matches

Why hybrid matters:
- semantic catches paraphrases
- lexical catches exact terms (IDs, env vars, symbols)

Research-level ranking concepts (use cautiously):
- weighted merge of vector + lexical scores
- candidate expansion before rerank
- optional recency decay
- optional diversity rerank (MMR-like)

## 8) Session Transcript Memory (`Experimental`)
OpenClaw can optionally include session transcripts in retrieval.

Documented behavior:
- opt-in feature
- async indexing with debounce and thresholds
- best-effort freshness (retrieval never blocks on indexing)
- isolation per agent

Operational caution:
- transcript files exist on disk; apply strict filesystem controls.

## 9) Retain / Recall / Reflect Pattern (`Research`)
OpenClaw research pages describe a useful memory lifecycle:

### Retain
Write self-contained facts/events durably.

### Recall
Retrieve relevant evidence with ranking.

### Reflect
Consolidate raw events into higher-quality durable summaries.

Why this pattern is valuable:
- It keeps long-term memory useful instead of becoming a noisy log dump.

## 10) Concrete Flow Example
Example: user says, "Remember I prefer chores in the evening."

Recommended OpenClaw-aligned behavior:
1. Record note in daily log.
2. If preference looks durable, copy/merge into curated memory.
3. Index update marks dirty and syncs asynchronously.
4. Future `memory_search` retrieves concise relevant snippet with source metadata.

## 11) Design Strengths and Risks

### Strengths
- Durable-file source of truth.
- Bounded retrieval tools.
- Rebuildable index model.
- Works with long-running sessions through compaction + flush.

### Risks
- Overwriting curated memory with noisy facts.
- Reliance on async index freshness.
- Potential privacy leakage if filesystem access is weak.

## 12) Reusable Patterns for Other Apps
Patterns worth carrying into application design:
- append-only raw events + curated durable summaries
- hybrid retrieval, not vector-only
- explicit durability guardrails before context compaction
- provenance-friendly snippets and evidence trails
- periodic consolidation jobs

## 13) Implementation Checklist (When Adopting)
Use this checklist when reusing OpenClaw memory ideas:
1. Define raw event source-of-truth storage.
2. Define curated summary storage and refresh cadence.
3. Set retrieval contract (max snippets, time window, ranking policy).
4. Add schema validation for model outputs.
5. Add observability: retrieval hit rate, acceptance rate, stale index incidents.
6. Add safety: path restrictions, read/write scopes, access controls.

## Glossary
- `Durable memory`: persisted storage intended to survive sessions.
- `Compaction`: compressing conversation context for token efficiency.
- `Pruning`: trimming low-value tool-result context.
- `Hybrid retrieval`: semantic + lexical retrieval combined.
- `Curated memory`: stable distilled facts, not raw logs.

## Sources (Primary)
- [OpenClaw Memory](https://docs.openclaw.ai/concepts/memory)
- [OpenClaw Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace)
- [OpenClaw Session Management](https://docs.openclaw.ai/concepts/session)
- [OpenClaw Compaction](https://docs.openclaw.ai/concepts/compaction)
- [OpenClaw Session Management Deep Dive](https://docs.openclaw.ai/reference/session-management-compaction)
- [OpenClaw CLI Memory](https://docs.openclaw.ai/cli/memory)
- [OpenClaw Memory Research](https://docs.openclaw.ai/research/memory)
