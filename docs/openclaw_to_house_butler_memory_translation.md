# Translating OpenClaw Memory Design to House Butler

## At a Glance
Goal: make House Butler smarter over time using both:
- explicit user inputs (text and voice), and
- implicit behavioral signals from app usage.

Core rule:
- Every meaningful interaction becomes an event.
- Events feed summaries and retrieval.
- LLM uses those summaries + recent evidence to generate better suggestions.

---

## 1) What "Smart" Means for House Butler
The assistant is "smart" if it gets better at:
1. Suggesting who should do a task.
2. Suggesting when a task is most likely to be completed.
3. Generating useful special-situation checklists with less manual editing.
4. Keeping motivation fair (points/streaks without frustration).

This requires learning from behavior, not only from chat prompts.

---

## 2) Memory Signal Types (Important)
House Butler should learn from three signal classes.

### A) Explicit language inputs
- Typed text (task notes, special situations)
- Voice input transcripts (post-MVP)

### B) Implicit behavioral inputs
- Who assigned which task to whom
- Self-assignment behavior (example: Abhinav assigns task to Abhinav)
- Acceptance/rejection of suggested assignees
- Completion timing patterns (morning/evening, day-of-week)
- Skip/defer patterns
- Edit patterns on generated checklists

### C) Outcome signals
- Task completed on time / late / skipped
- Checklist items completed vs ignored
- Points/streak changes

These are all memory signals, not just analytics.

---

## 3) Concrete Example: Abhinav Self-Assignment
Event sequence:
1. Abhinav assigns "Clean kitchen counters" to Abhinav.
2. Task is completed at 9:15 PM.
3. Similar events repeat over several weeks.

What the system learns:
- Preference pattern: Abhinav tends to take this task.
- Time pattern: completion likelihood is high in evening.
- Reliability pattern: on-time vs late trend.

How this affects future AI behavior:
- Assignee suggestion confidence for Abhinav increases for that chore type.
- Due-time suggestion shifts toward evening windows.
- Explanation can mention observed pattern (short, transparent reason).

---

## 4) Memory Architecture for House Butler

### Layer A: Raw event memory (source of truth)
Append-only tables:
- `chore_history`
- `assignment_events`
- `special_situation_events`
- `gamification_events`
- `ai_feedback_events` (accepted/rejected suggestion)

Rule:
- never delete semantic history rows
- corrections are appended as new events

### Layer B: Curated summaries (derived memory)
- `memory_summary` table for stable patterns
- refreshed on schedule (daily/weekly) and optionally on demand

Summary examples:
- preferred assignee by chore and context
- best completion window by user and chore type
- recurring preparation patterns for trips/guests

### Layer C: Retrieval index (derived infra)
- embeddings + lexical index over events and summaries
- rebuildable from Layer A/B

---

## 5) Learning Loop: How the LLM Actually Gets Better
Use a repeatable loop.

1. Capture
- Every meaningful app action writes an event.

2. Consolidate
- Job aggregates recent events into durable summaries.

3. Retrieve
- For each AI task, fetch:
  - recent relevant events
  - durable summary snippets

4. Generate
- LLM returns structured output (JSON only, schema-validated).

5. Observe feedback
- Record whether user accepted or changed suggestion.

6. Adapt
- Update confidence and summary features from feedback.

Without step 5, models do not improve reliably in product use.

---

## 6) Decision Policy: Rule Engine + LLM (Recommended)
Do not let LLM do everything.

Use two-stage decisioning:

### Stage 1: Deterministic candidate scoring
- score assignee candidates using observed behavior features
- score due-time windows using completion history

### Stage 2: LLM contextualization
- LLM uses top candidates + memory evidence to produce:
  - shortlist/suggestion
  - short human-readable rationale
  - confidence score

Why:
- deterministic stage gives stability
- LLM stage gives contextual flexibility

---

## 7) Feature Set for MVP Intelligence
Store and compute at least these features:

Assignee preference features:
- `self_assign_rate(user, chore)`
- `accept_suggestion_rate(user, chore_type)`
- `completion_rate(user, chore_type)`
- `recent_load(user)`

Timing features:
- `completion_hour_histogram(user, chore_type)`
- `weekday_completion_rate(user, chore_type)`
- `lateness_distribution(user, chore_type)`

Checklist quality features:
- `edit_rate_after_generation(situation_type)`
- `item_completion_rate(situation_type, item_kind)`

These features can start simple SQL-first, then evolve.

---

## 8) Data Contracts (Schema Additions)
Suggested additions:

1. `assignment_events`
- `id`, `assignment_id`, `actor_user_id`, `target_user_id`, `event_type`, `created_at`, `metadata_json`

2. `ai_feedback_events`
- `id`, `context_type`, `suggestion_id`, `action` (`accepted` | `modified` | `rejected`), `actor_user_id`, `created_at`, `metadata_json`

3. `memory_summary`
- `id`, `summary_type`, `subject_key`, `summary_text`, `confidence`, `source_window_start`, `source_window_end`, `updated_at`

4. suggestion metadata on tasks/items
- `suggested_by`, `suggestion_confidence`, `suggestion_reason`

---

## 9) Using Text + Voice + In-App Actions Together
Unify ingestion.

Normalized event envelope:
- `actor_user_id`
- `source_channel` (`ui`, `text`, `voice`)
- `intent_type`
- `payload_json`
- `created_at`

Benefit:
- voice and typed actions participate in the same learning pipeline.
- no separate "voice brain" is needed.

---

## 10) Safety and Quality Guardrails
- AI suggestions must be overrideable.
- All model outputs must pass schema validation.
- Keep suggestion confidence visible in logs.
- Add drift monitoring (if suggestion acceptance falls, reduce automation weight).
- Keep deterministic fallback behavior when LLM is unavailable.

---

## 11) MVP Defaults (Already Chosen)
- Backlog: one current pending assignment per overdue chore.
- Points: award on all completions with overdue deduction.
- Special situations: auto-suggest assignees.

Interpretation:
- these defaults accelerate learning and reduce user effort,
- but they are marked provisional and must be reviewed after real usage.

---

## 12) 4-6 Week Review Plan
Review with real usage data:
- assignee suggestion acceptance rate
- manual reassignment rate
- average lateness and points fairness feedback
- checklist edit rate and completion rate

Decision outcomes after review:
- keep defaults
- tune deduction/thresholds
- adjust auto-suggestion aggressiveness

---

## 13) Practical Implementation Sequence
1. Add missing event tables and write paths.
2. Ensure every assignment/completion/edit writes events.
3. Add summary consolidation job.
4. Add hybrid retrieval adapter.
5. Add assignee/time suggestion service with confidence.
6. Add feedback capture and adaptation loop.

---

## Source Basis
This translation uses patterns documented in:
- [OpenClaw Memory](https://docs.openclaw.ai/concepts/memory)
- [OpenClaw Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace)
- [OpenClaw Session Management](https://docs.openclaw.ai/concepts/session)
- [OpenClaw Compaction](https://docs.openclaw.ai/concepts/compaction)
- [OpenClaw Session Management Deep Dive](https://docs.openclaw.ai/reference/session-management-compaction)
- [OpenClaw Memory Research](https://docs.openclaw.ai/research/memory)
