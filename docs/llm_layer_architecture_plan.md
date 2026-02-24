# House Butler LLM Layer Architecture Plan (Artifact 1)

Date: 2026-02-24  
Status: Draft (planning artifact for review)

## 1) Purpose

Define the constructive architecture path for the LLM layer so it reliably delivers core product functionality:
- special-situation checklist generation,
- high-quality future assignment/time suggestions,
- learning from household behavior over time.

This is a planning artifact. It does not replace canonical docs until explicitly ratified.

## 2) Core Functional Outcomes

The LLM layer must do four things well:
1. Generate useful, editable checklist items for free-text special situations.
2. Produce suggestion payloads with confidence and short rationale (assignee/time).
3. Learn from actual user behavior and feedback, not only prompts.
4. Fail safely with deterministic fallback when model output is invalid/unavailable.

## 3) Architecture Blueprint

### A) Action Capture Layer (append-only)
- Record meaningful interactions as events:
  - assignments, completions, skips, reassignments,
  - special-situation item edits and completion outcomes,
  - suggestion outcomes (`accepted`, `modified`, `rejected`).
- Treat these as memory inputs (not analytics-only logs).

### B) Memory Synthesis Layer (durable summaries)
- Scheduled consolidation jobs derive stable patterns into:
  - `memory_summary` for durable patterns and preferences,
  - `llm_memory` for compact household context by memory type.
- Keep raw event history immutable; summaries are derived and refreshable.

### C) Retrieval Layer (bounded context contract)
- For each LLM task, retrieve:
  - recent relevant events (recency-weighted),
  - top summary snippets from `memory_summary`/`llm_memory`.
- Enforce strict context budget to avoid prompt bloat.

### D) Decision Layer (deterministic candidates first)
- Compute candidate assignees and due-time windows from behavior features.
- Pass only top candidates + evidence to the LLM for contextual refinement.
- Keep deterministic fallback ranking available at all times.

### E) Generation Layer (strict structured output)
- LLM returns JSON only.
- Validate with strict schema before write.
- On parse/validation failure: return safe fallback output.

### F) Feedback & Adaptation Layer
- Persist suggestion outcomes in `ai_feedback_events`.
- Feed these outcomes into summary refresh and candidate-scoring weights.
- Track confidence calibration over time.

### G) Observability Layer
- Log every LLM call:
  - latency,
  - model/version,
  - success/failure,
  - parse-validation result,
  - fallback invoked or not.
- Track quality metrics:
  - suggestion acceptance rate,
  - edit-after-generation rate,
  - fallback rate.

## 4) Key Design Tradeoffs (Chosen Defaults)

### Tradeoff A: Deterministic ranking vs full-model autonomy
- Choice: deterministic candidate scoring first, LLM contextual refinement second.
- Benefit: predictable behavior, easier debugging, safer fallback path.
- Cost: less free-form model creativity.
- Mitigation: periodically tune scoring features and allow contextual refinement within bounded scope.

### Tradeoff B: Retrieval breadth vs prompt budget and latency
- Choice: bounded retrieval (`top K` summaries + recent events).
- Benefit: stable latency and predictable token usage.
- Cost: may miss long-tail historical details.
- Mitigation: preserve stable patterns in `memory_summary` so older behavior is represented compactly.

### Tradeoff C: Summary freshness vs operational cost
- Choice: scheduled daily summary refresh + on-demand trigger.
- Benefit: simple, reliable operations model.
- Cost: summaries can be stale within the same day.
- Mitigation: retrieval includes recent raw events to capture newest behavior.

### Tradeoff D: Strict output validation vs generation flexibility
- Choice: strict JSON schema validation gate before persistence.
- Benefit: prevents malformed writes and brittle downstream state.
- Cost: higher fallback frequency when model output drifts.
- Mitigation: tighten prompt contract and monitor parse/validation failure causes.

### Tradeoff E: Confidence transparency vs UI simplicity
- Choice: provide confidence/rationale in payloads; UI can present simplified confidence bands.
- Benefit: improves trust and supports explicit user override.
- Cost: added UI and API complexity.
- Mitigation: keep explanation short and confidence display lightweight.

### Tradeoff F: Learning speed vs user control
- Choice: manual override remains first-class while feedback is captured for adaptation.
- Benefit: protects user trust and correctness.
- Cost: slower path to aggressive automation.
- Mitigation: increase recommendation strength only when acceptance signals are consistently strong.

## 5) Core Workflows

### Workflow 1: Special Situations (current + hardening)
1. User submits free-text + optional date.
2. Retrieval returns compact context (recent events + summaries).
3. LLM generates checklist JSON.
4. Schema validation gates persistence.
5. Checklist saved with suggestion metadata.
6. User edits/completions are captured as events for learning.

### Workflow 2: Assignee/Time Suggestion (next)
1. Deterministic scorer ranks assignee/time candidates from behavior features.
2. Retrieval provides supporting context snippets.
3. LLM refines shortlist/rationale JSON (bounded scope).
4. UI shows suggestion + confidence + override controls.
5. User decision is captured in `ai_feedback_events`.

## 6) Data and Contract Plan

### Existing foundation to use
- Append-only behavior/event tables already present.
- `memory_summary`, `llm_memory`, and `ai_feedback_events` already in schema.

### Recommended additions/normalization
- Ensure all suggestion-producing paths write explicit feedback events.
- Add situation-edit event normalization if edits are not consistently represented.
- Standardize suggestion metadata fields across assignment/situation flows:
  - `suggestion_id`,
  - `suggested_by`,
  - `suggestion_confidence`,
  - `suggestion_reason`.

### Suggested payload contract (for suggestions)
- `candidates[]` with score/confidence,
- `recommended` item,
- `rationale` (short text),
- `evidence` references (summary/event snippet ids),
- `fallbackUsed` boolean.

## 7) Jobs and Scheduling Plan

- `memory:refresh` (daily):
  - rebuild stable summaries from recent event windows.
- `memory:refresh:on-demand` (manual/admin trigger for debugging).
- `memory:quality:report` (weekly):
  - acceptance trends,
  - fallback trends,
  - confidence calibration drift.

These jobs are separate from the existing due-assignment scheduler.

## 8) API Surface Plan

Existing:
- `/api/situations` generation/persistence path.

Planned:
- `/api/suggestions/assignment` (candidate + recommendation payload).
- `/api/ai/feedback` (accept/modify/reject capture).
- `/api/memory/refresh` (protected internal trigger).

All routes must keep:
- auth + CSRF protections,
- strict request validation,
- consistent error shape,
- deterministic fallback behavior.

## 9) Delivery Phases and Exit Criteria

### Phase 1: Special-Situation Hardening + Feedback Capture
- Strengthen schema validation and fallback telemetry.
- Implement feedback capture endpoint and writes.
- Add memory refresh job and runbook.

Exit criteria:
- Every LLM checklist response is validation-gated.
- Feedback events are written for suggestion outcomes.
- Summary refresh runs successfully.

### Phase 2: Deterministic Suggestion Engine
- Implement assignee/time scoring services and typed payloads.
- Add confidence + rationale-ready API outputs.

Exit criteria:
- Suggestion payloads are stable and overrideable.
- Acceptance/rejection is measurable end-to-end.

### Phase 3: Contextual LLM Refinement
- Introduce LLM refinement over top deterministic candidates.
- Add retrieval evidence in outputs and quality monitoring.

Exit criteria:
- Acceptance rate improves without fallback instability.
- Context remains bounded and reliable.

## 10) Success Metrics

- Special-situation edit-after-generation rate decreases over time.
- Suggestion acceptance rate increases over time.
- Fallback rate remains low and visible.
- No hard failures in core flows when LLM is unavailable.

## 11) Immediate Follow-Ups

After approval of this artifact:
1. Ratify final architecture decisions in `docs/decision_log.md`.
2. Update `docs/house_butler_implementation_plan.md` with phase details.
3. Execute the approved roadmap slices in `docs/llm_mobile_implementation_roadmap.md`.
