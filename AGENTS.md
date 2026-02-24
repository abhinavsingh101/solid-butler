# Agent Instructions for House Butler

These instructions are binding for all agents working in this repository.

## Source of Truth
If documents conflict, follow this order:
1. `docs/purpose_and_scope.md`
2. `docs/decision_log.md`
3. `docs/house_butler_implementation_plan.md`
4. Historical docs (`docs/house-butler.md`, `docs/chores_app_discovery.md`)

## Non-Negotiable Product Decisions
- Build an MVP that is easy to upgrade later.
- App serves 2 household members; no admin role in MVP.
- Manual chore assignment first; AI suggestions later.
- Special situations use free-text input.
- Lightweight points/streaks are in MVP.
- Voice support is a first-class product requirement, but post-MVP.
- In-app behavior is first-class AI memory input (not just text/voice prompts).

## Required Documentation Hygiene
When behavior/architecture/scope changes:
1. Update `docs/house_butler_implementation_plan.md`.
2. Add or supersede a row in `docs/decision_log.md`.
3. Update `docs/purpose_and_scope.md` if product scope changed.
4. Keep historical docs as historical context unless explicitly asked to rewrite them.

## Escalation Rule
If a task conflicts with canonical docs, do not guess.
State the conflict and ask the user to choose.
