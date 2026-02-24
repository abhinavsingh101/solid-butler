# The House Butler - Decision Log (Canonical)

This is the canonical decision log for the project.

## How to Read
- `ACTIVE`: current decision to follow.
- `SUPERSEDED`: replaced by a later decision.

## Decisions

| ID | Date | Status | Topic | Decision | Why | Impact |
|---|---|---|---|---|---|---|
| DEC-001 | 2026-02-24 | ACTIVE | Users | App is for 2 household members. | Matches real usage pattern. | Keep workflows simple and two-user focused. |
| DEC-002 | 2026-02-24 | ACTIVE | Roles | No admin/owner role in MVP. | Household members are equals. | Avoid role-management complexity. |
| DEC-003 | 2026-02-24 | ACTIVE | Assignment strategy | Manual assignment first; AI suggestions later. | Reliability and trust before automation. | Store history from day 1 to train future suggestions. |
| DEC-004 | 2026-02-24 | ACTIVE | Chore source | Start with predefined chores; users can keep adding. | Faster onboarding and consistency. | Seed initial chore catalog. |
| DEC-005 | 2026-02-24 | ACTIVE | Special situations input | Use free-text trigger in MVP. | Most natural for users. | Build plain-language input + generated checklist flow. |
| DEC-006 | 2026-02-24 | ACTIVE | Hosting | Cloud first (Vercel + managed Postgres), self-host later. | Faster iteration for MVP. | Keep infra simple and managed. |
| DEC-007 | 2026-02-24 | ACTIVE | LLM provider | Start with Anthropic Claude. | User preference and available API key. | Server-side LLM integration only. |
| DEC-008 | 2026-02-24 | ACTIVE | MVP strategy | Deliver MVP that is upgradeable to full feature set. | Reduce risk and ship faster. | Use migration-friendly schema and modular architecture. |
| DEC-009 | 2026-02-24 | ACTIVE | Auth baseline | Use password login with minimum hardening. | Balance safety and MVP speed. | Include rate limits, lockout, secure cookies, password policy, and auth logs. |
| DEC-010 | 2026-02-24 | ACTIVE | Memory architecture | Two-layer memory: append-only event history + curated durable summaries. | Better long-term learning without bloating prompts. | Build retrieval from recent events + curated memory. |
| DEC-011 | 2026-02-24 | ACTIVE | PWA scope | MVP includes installability, not full offline-first behavior. | Lower complexity for first release. | Implement manifest/install path first; defer complex offline caching. |
| DEC-012 | 2026-02-24 | ACTIVE | Gamification | Include lightweight points and streaks in MVP. | Motivation is part of product value. | Add small points/streak model now; keep it simple. |
| DEC-013 | 2026-02-24 | ACTIVE | Voice support | Voice is a first-class feature in product direction, but deferred beyond MVP. | Keeps MVP focused while preserving long-term interaction goals. | Keep schema and service boundaries compatible with future speech input/output flows. |
| DEC-014 | 2026-02-24 | ACTIVE | Overdue backlog handling | For MVP, generate one current pending assignment per chore instead of generating every missed instance. | Prevents backlog explosion and keeps daily view usable. | Simpler scheduler behavior; revisit after real usage data. |
| DEC-015 | 2026-02-24 | ACTIVE | Points behavior | Award points for every completion, with overdue deduction when deadline is missed. | Encourages completion while still signaling lateness. | Gamification stays motivational without binary all-or-nothing scoring. |
| DEC-016 | 2026-02-24 | ACTIVE | Special-situation assignee | Auto-suggest assignee for generated checklist items in MVP. | Reduces user effort and starts personalization earlier. | Requires suggestion confidence + easy manual override in UI. |
| DEC-017 | 2026-02-24 | ACTIVE | Behavioral memory inputs | Treat in-app interactions (assignment choices, timing patterns, completion behavior, suggestion accept/reject) as first-class memory inputs for AI. | Learning quality depends on observed behavior, not only text/audio prompts. | Requires append-only behavior event capture and feedback loop in AI pipeline. |
| DEC-018 | 2026-02-24 | ACTIVE | Urgency model | Use a finite shared urgency pool for pending tasks, with overdue growth affecting each task's share. | Prevents "everything is urgent" behavior and enforces practical prioritization under limited time. | Dashboard must show ranked order and cumulative minutes for sequential time allocation. |
| DEC-019 | 2026-02-24 | ACTIVE | Backlog safety valve | If multiple high-urgency tasks pile up on a day, mark it as a busy day and suggest a 30- or 60-minute focus block. | Provides a simple recovery path when backlog accumulates. | Assistant planning must treat flagged days as higher load and surface focus recommendations. |
| DEC-020 | 2026-02-24 | ACTIVE | Assignment capture UX | Support one-step quick assignment for ad-hoc household tasks between members. | Real usage needs immediate capture (for example, one partner assigning a quick task to the other). | Dashboard includes quick-assignment flow that creates/uses a chore template and assigns instantly. |
| DEC-021 | 2026-02-24 | ACTIVE | Situation generation safety | Special-situation checklist generation must be schema-validated server-side and fall back to a safe template when LLM output is missing/invalid. | Keeps workflow reliable even when model output is imperfect or unavailable. | Users always get an editable checklist; no hard failure in core flow. |

## Change Rule
When a decision changes:
1. Add a new decision row with a new ID.
2. Mark the older row `SUPERSEDED`.
3. Update `docs/house_butler_implementation_plan.md` to match.
