# The House Butler - Implementation Plan (Active)

This is the active implementation plan.
It must stay aligned with:
- `docs/purpose_and_scope.md`
- `docs/decision_log.md`

## 1) Build Strategy

Build a practical MVP first, while keeping schema and architecture easy to extend later.

### MVP Design Principles
- Keep core workflows reliable before adding advanced AI behavior.
- Store durable history from day 1.
- Make every major feature testable with clear acceptance checks.
- Prefer simple defaults over configurable complexity.

## 2) MVP Feature Contract

MVP includes:
- 2-user password login.
- Chore catalog management (add/edit/archive).
- Manual assignment to a household member.
- One-step quick assignment for ad-hoc tasks between members.
- Recurring due logic for chores.
- Mark done / skipped, with timestamps and notes.
- Priority labels (`high`, `medium`, `low`) with finite urgency-point budgeting.
- Ranked "if you have 10 minutes, do this first" priority sequence with cumulative time.
- Busy-day safety valve with 30/60 minute focus recommendation when urgent backlog clusters.
- Special situations: free-text input -> generated checklist -> editable and saveable.
- Lightweight gamification: points + streaks.
- Installable web app (Add to Home Screen).

MVP excludes:
- Fully automatic chore assignment.
- Escalating reminder logic.
- Full offline-first functionality.
- Extra channels like WhatsApp/SMS/email.
- Voice input/output workflows (planned post-MVP).

## 3) Architecture

### App stack
- Next.js App Router.
- TypeScript.
- PostgreSQL (Supabase-compatible).
- Prisma ORM.
- Server-side Claude API access only.

### Runtime boundaries
- UI pages and server route handlers live in app routes.
- Business logic in `src/lib/*` modules.
- DB writes go through typed service functions, not directly from UI components.

### Deployment target
- Vercel + managed Postgres for MVP.

## 4) Minimum Auth Hardening (MVP)

This is required before production deployment:
- Bcrypt password hashing.
- Password policy: minimum length and basic strength validation.
- Login rate limiting per IP and username.
- Temporary lockout after repeated failed login attempts.
- Secure session cookies (`HttpOnly`, `Secure` in production, `SameSite=Strict`).
- CSRF protection on state-changing routes.
- Auth audit events (login success/failure, logout).

## 5) Data Model Plan

### Core entities
- `users`
- `chores`
- `chore_assignments`
- `chore_history` (append-only)
- `assignment_events` (append-only behavior events)
- `special_situations`
- `situation_items`
- `gamification_state`
- `gamification_events` (append-only)
- `ai_feedback_events` (append-only acceptance/rejection/edit outcomes)
- `memory_summary` (curated household memory)

### Modeling rules
- Use enums for bounded fields (priority, status, action types).
- Add uniqueness where idempotency depends on it (for example, seed keys).
- Add indexes for main reads: by due date, assignee, and status.
- Keep append-only event tables for history and auditability.

## 6) Recurrence and Due-Generation (Core Reliability)

MVP recurrence model:
- `daily_every_n_days`
- `weekly_every_n_weeks`
- `monthly_every_n_months`
- `as_needed`

Execution approach:
- Maintain `next_due_at` per chore template.
- Run a scheduler job (or cron-triggered endpoint) that creates pending assignments when due.
- Scheduler must be idempotent (safe to run multiple times).
- If multiple periods were missed, generate only one current pending assignment by default (simple backlog behavior for MVP).

## 6.1) Priority and Urgency Model (MVP)

Mental model:
- User time is finite, so urgency must be finite too.
- The system should produce a practical sequence, not a flat "many urgent tasks" list.

Implementation rules:
- Compute per-task raw urgency from due status + overdue growth.
- Distribute a fixed shared urgency budget across current pending tasks based on raw urgency weights.
- Sort by allocated urgency points (then due date), and assign rank numbers.
- Return cumulative estimated minutes so users can continue the list in 10-minute blocks.
- Detect upcoming busy days (multiple high-urgency tasks due together) and recommend a 30- or 60-minute focus block.

## 7) LLM and Memory Architecture (MVP)

Reference docs for future agents:
- `docs/openclaw_memory_architecture_reference.md`
- `docs/openclaw_to_house_butler_memory_translation.md`

Two-layer memory pattern:
- Layer A: append-only raw events (`chore_history`, `assignment_events`, `special_situations`, `gamification_events`, `ai_feedback_events`).
- Layer B: curated durable summaries (`memory_summary`) for stable preferences and patterns.

Behavioral learning rule:
- In-app interactions are first-class memory signals, not just analytics.
- Signals include self-assignment choices, completion time patterns, suggestion acceptance/rejection, and checklist edits.

For special-situation generation:
- Input: free text + optional event date.
- Retrieval context:
  - recent relevant events (recency-weighted)
  - curated summary snippets
- Default behavior for MVP: include assignee auto-suggestions for checklist items, but always allow user override.
- Output must be validated against a strict JSON schema before save.
- If generation fails, return a safe template checklist and log the failure.

## 8) Lightweight Gamification (MVP)

Keep it simple:
- Award points for `completed` actions.
- Apply overdue deduction if completion is after due date.
- Track daily streak based on at least one completion in a day.
- Show only:
  - current points
  - current streak
  - last earned event

No leaderboards, multipliers, or penalty logic in MVP.

## 9) UI Surface (MVP)

Required pages:
- Login
- Dashboard (today/overdue assignments)
- Chores (catalog management)
- Special Situations (free-text + checklist editor)
- History (recent completions and actions)

## 10) API Surface (MVP)

Required route groups:
- `auth` (login/logout/session)
- `chores` (CRUD)
- `assignments` (list/create/update status)
- `situations` (create/list/update checklist items)
- `gamification` (summary)

Rules:
- Validate all request bodies server-side.
- Return typed error codes/messages.
- Log critical failures with request correlation IDs.

## 11) Testing and Quality Gates

### Automated tests
- Unit tests for recurrence calculation, streak logic, and auth helpers.
- Integration tests for auth + core API flows.
- End-to-end happy path: login -> assign chore -> complete chore -> points/streak update.

### Manual checks (release checklist)
- Add to Home Screen works on iOS and Android.
- Login lockout behaves correctly.
- Scheduler is idempotent.
- Special-situation checklist is editable and persists.

## 12) Delivery Slices

### Slice 1: Foundation
- Fix app structure consistency.
- Stabilize Prisma schema + migrations.
- Implement auth hardening baseline.

### Slice 2: Chore engine
- Chore CRUD.
- Assignment and status update flow.
- Recurrence + due-generation scheduler.
- Dashboard for today/overdue chores.
- Quick ad-hoc assignment from dashboard.
- Finite urgency ranking and cumulative-minute priority sequencing.
- Busy-day safety valve detection and focus-block recommendation.

### Slice 3: Special situations and memory
- Situation creation and checklist persistence.
- Claude generation with schema validation.
- Memory summary retrieval and periodic refresh.
- Current implementation checkpoint:
  - `/situations` page with free-text input and generated editable checklist.
  - Checklist item editing supports assignee, due date, title/description, and status updates.
  - Generation is guarded with server-side validation and safe fallback checklist behavior.

### Slice 4: Gamification and polish
- Points/streak events and summary UI.
- Refined dark-mode UI pass.
- Release hardening and docs audit.

## 13) Documentation Discipline

For each merged feature change:
1. Update this implementation plan section(s).
2. If decision changed, add a row to `docs/decision_log.md`.
3. If purpose/scope changed, update `docs/purpose_and_scope.md`.

## 14) Voice Support Roadmap (Post-MVP)

Voice is part of the long-term feature set.

Planned direction:
- Voice input: convert spoken chore/situation notes into structured actions.
- Voice output: optional spoken summaries (today's chores, overdue items, checklist highlights).
- Conversation safety: spoken commands still require confirmation for destructive actions.
- Shared memory path: voice and typed inputs write to the same event/history pipeline.

## 15) Provisional MVP Defaults (Revisit After Usage Data)

Defaults locked for MVP:
- Overdue backlog: one current pending assignment per chore.
- Points: award for all completions, with overdue deduction.
- Special situations: auto-suggest assignee for generated checklist items.

Revisit rule:
- Re-evaluate these defaults after 4-6 weeks of real household use.
- If behavior is changed, record it in `docs/decision_log.md` as a new decision and mark older rows `SUPERSEDED`.

*Last updated: 2026-02-24*
