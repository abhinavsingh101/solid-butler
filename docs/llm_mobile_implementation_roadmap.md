# House Butler LLM + Mobile Implementation Roadmap (Artifact 3)

Date: 2026-02-24  
Status: Draft (planning artifact for review)

## 1) Purpose

Provide a phased execution roadmap that turns Artifact 1 (LLM architecture) and Artifact 2 (mobile UI strategy) into implementable slices with clear dependencies and acceptance checks.

This roadmap assumes:
- manual control remains first-class,
- automated assignment is still out of MVP scope,
- suggestion quality and mobile usability are the next major product levers.

## 2) Sequencing Strategy

Use two coordinated workstreams:
- **Workstream A (LLM quality and memory loop)** for smarter behavior.
- **Workstream B (mobile UX)** for daily usability on phones.

Execution principle:
- run small, testable slices,
- keep deterministic fallback at each stage,
- avoid blocking mobile improvements on full LLM sophistication.

## 3) Milestones

### Milestone R1: LLM Foundation + Mobile Shell
Goal: stabilize memory/feedback foundations and make mobile navigation reliable.

### Milestone R2: Deterministic Suggestions + High-Frequency Mobile Flows
Goal: ship trustworthy suggestion scaffolding and optimize the daily dashboard/chores flows.

### Milestone R3: LLM Refinement + Situations/History Mobile Pass + QA Hardening
Goal: improve suggestion quality with contextual LLM refinement and complete mobile polish with hard quality gates.

## 4) Backlog Slices and Acceptance Checks

### R1-A (LLM): Feedback and Memory Foundations

Ticket LLM-01: Normalize suggestion metadata and outcomes
- Scope:
  - Standardize `suggestion_id`, `suggested_by`, `suggestion_confidence`, `suggestion_reason`.
  - Ensure suggestion outcomes are consistently represented across flows.
- Acceptance:
  - Suggestion-producing endpoints return metadata consistently.
  - Outcome events are queryable with consistent keys.

Ticket LLM-02: Feedback capture API and persistence
- Scope:
  - Add `/api/ai/feedback` for `accepted` / `modified` / `rejected`.
  - Persist to `ai_feedback_events` with auth/validation.
- Acceptance:
  - Valid payloads persist successfully.
  - Invalid payloads return typed validation errors.

Ticket LLM-03: Memory refresh job (scheduled + on-demand)
- Scope:
  - Add `memory:refresh` job to update `memory_summary` and `llm_memory`.
  - Add protected on-demand trigger endpoint.
- Acceptance:
  - Job runs idempotently.
  - Summaries update for defined event windows.
  - Runbook documents local/prod triggers and failure handling.

Ticket LLM-04: LLM call observability baseline
- Scope:
  - Log request id, model, latency, parse result, fallback usage.
- Acceptance:
  - Logs support per-request troubleshooting.
  - Fallback rate is measurable.

### R1-B (Mobile): Shell and Navigation

Ticket MOB-01: Mobile bottom tab navigation
- Scope:
  - Bottom tabs on `< md` for Dashboard/Chores/Situations/History.
  - Keep current top nav for `>= md`.
- Acceptance:
  - Navigation is accessible and keyboard-operable.
  - No overlap with viewport-safe areas on common devices.

Ticket MOB-02: Compact mobile headers and overflow actions
- Scope:
  - Compact title bar on mobile.
  - Move sign-out to overflow on mobile.
- Acceptance:
  - Header consumes less vertical space than current layout.
  - Sign-out remains discoverable and functional.

Ticket MOB-03: Mobile baseline spacing and touch target pass
- Scope:
  - Apply consistent spacing/tap-target standards across primary pages.
  - Add shared friendly/playful mobile style tokens (color accents, rounded controls, supportive microcopy patterns).
- Acceptance:
  - Interactive controls meet minimum touch target sizes.
  - No clipped or cramped controls on 320-430 px widths.
  - Shared style tokens are used consistently across screens.

### R2-A (LLM): Deterministic Suggestion Engine

Ticket LLM-05: Assignee candidate scoring service
- Scope:
  - Deterministic scoring from behavior features (completion reliability, recent load, suggestion history).
- Acceptance:
  - Service returns ranked candidates with stable tie-break logic.
  - Unit tests cover scoring edge cases.

Ticket LLM-06: Due-time window scoring service
- Scope:
  - Deterministic due-time recommendations from completion timing patterns.
- Acceptance:
  - Returns bounded, interpretable windows.
  - Includes deterministic fallback when data is sparse.

Ticket LLM-07: Assignment suggestion API (deterministic payload)
- Scope:
  - Add `/api/suggestions/assignment` returning candidates, recommended choice, confidence, rationale, fallback flag.
- Acceptance:
  - Response schema is stable and validated.
  - Manual override assumptions remain explicit.

### R2-B (Mobile): High-Frequency Flow Optimization

Ticket MOB-04: Dashboard action hierarchy pass
- Scope:
  - Improve task card readability and primary/secondary action contrast.
  - Mobile-friendly quick assign collapse behavior.
  - Add lightweight positive completion feedback (copy + subtle motion/color).
- Acceptance:
  - Completing a task takes fewer taps than baseline.
  - Quick assign remains discoverable but less visually heavy.
  - Completion feedback feels friendly without reducing task clarity.

Ticket MOB-05: Chores form progressive disclosure
- Scope:
  - Split core fields from advanced urgency settings on mobile.
- Acceptance:
  - Core create/edit flow is single-column and scannable.
  - Advanced settings are available without crowding default flow.

### R3-A (LLM): Contextual Refinement and Quality Loop

Ticket LLM-08: Retrieval adapter with bounded evidence snippets
- Scope:
  - Merge recent events + summary snippets under a strict context budget.
- Acceptance:
  - Retrieval output remains bounded and deterministic in size.
  - Includes evidence ids for debugging.

Ticket LLM-09: LLM refinement on top deterministic candidates
- Scope:
  - LLM consumes top candidate set and returns refined shortlist/rationale JSON.
  - Validation-gated response with fallback to deterministic recommendation.
- Acceptance:
  - No hard failures from malformed model output.
  - Parse failures trigger fallback cleanly.

Ticket LLM-10: Suggestion quality monitoring
- Scope:
  - Track acceptance rate, fallback rate, edit-after-suggestion metrics.
- Acceptance:
  - Weekly quality report available for review.
  - Regression thresholds are defined and visible.

### R3-B (Mobile): Situations/History and QA Hardening

Ticket MOB-06: Situations progressive item editor
- Scope:
  - Title/status primary row, details toggle for description/assignee/due date on mobile.
- Acceptance:
  - Checklist editing stays readable and efficient on small screens.

Ticket MOB-07: History card density simplification
- Scope:
  - Compact footer metadata; reduce right-heavy layout.
  - Apply friendly, non-corporate copy tone pass on mobile labels and helper text.
- Acceptance:
  - Timeline remains legible without horizontal crowding.
  - Mobile copy tone stays warm and playful while preserving meaning.

Ticket MOB-08: Mobile E2E + manual device gate
- Scope:
  - Add Playwright mobile projects (iPhone + Android viewports).
  - Add manual iOS/Android PWA QA checklist to release flow.
- Acceptance:
  - Mobile smoke suite passes in CI.
  - Manual checklist items are executed before release.

## 5) Dependency Map

Hard dependencies:
1. `LLM-02` depends on metadata normalization in `LLM-01`.
2. `LLM-07` depends on scoring services (`LLM-05`, `LLM-06`).
3. `LLM-09` depends on retrieval adapter (`LLM-08`) and deterministic payload (`LLM-07`).
4. `MOB-04` should follow shell/navigation (`MOB-01`, `MOB-02`) to avoid repeated layout rework.
5. `MOB-08` depends on completion of at least `MOB-04` and `MOB-06`.

## 6) Risk Register

Risk 1: Suggestion trust is low despite technical completion.
- Mitigation:
  - keep confidence/rationale visible,
  - enforce explicit override paths,
  - monitor acceptance before increasing automation weight.

Risk 2: Mobile redesign introduces regressions in existing flows.
- Mitigation:
  - enforce slice-level E2E checks,
  - preserve route/API contracts,
  - use phased rollout with clear acceptance gates.

Risk 3: Memory summaries become noisy.
- Mitigation:
  - apply confidence thresholds and bounded summary windows,
  - preserve raw event provenance for debug and reprocessing.

## 7) Definition of Done by Milestone

R1 done when:
- feedback and summary refresh loop is operational,
- mobile shell/navigation is phone-usable.

R2 done when:
- deterministic assignment suggestion payload is live,
- dashboard and chores mobile flows feel materially lighter.
- dashboard interaction tone is clearly friendlier/playful versus baseline.

R3 done when:
- contextual LLM refinement runs safely on top of deterministic baseline,
- situations/history mobile pass and mobile QA gates are complete.

## 8) Post-Roadmap Extension (Post-MVP Channel Work)

After R3, evaluate a channel extension slice:
- WhatsApp notification + inbound capture adapter,
- unified event ingestion using the same memory pipeline (`source_channel` aware),
- opt-in/quiet-hour/policy guardrails.

This remains separate from core R1-R3 delivery and should not block core mobile + LLM quality work.

## 9) Immediate Follow-Ups

1. Review and approve this roadmap artifact.
2. Ratify key sequencing decisions into canonical docs if priorities are changing.
3. Create implementation tickets from `LLM-*` and `MOB-*` slices with owners and target sprint dates.
