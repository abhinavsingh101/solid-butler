# Documentation Protocol for Future Agents

Use this protocol to keep project intent and decisions clear.

## Canonical Files
- `docs/purpose_and_scope.md`
- `docs/decision_log.md`
- `docs/house_butler_implementation_plan.md`

## Required Updates Per Change
When you change product behavior, architecture, or scope:
1. Update implementation details in `docs/house_butler_implementation_plan.md`.
2. If the change is a product/architecture decision, add a row in `docs/decision_log.md`.
3. If purpose/scope changed, update `docs/purpose_and_scope.md`.
4. If behavior rules changed, update agent-facing instructions (`AGENTS.md` and `.rules/rules.md`).

## Formatting Rules
- Use concrete dates (`YYYY-MM-DD`).
- Keep decision rows short and explicit.
- Mark replaced decisions as `SUPERSEDED`, never delete them.
- Do not rewrite historical artifacts unless requested.

## Historical Files
- `docs/house-butler.md` is original questionnaire and response notes.
- `docs/chores_app_discovery.md` is planning-phase discovery context.

## Conflict Rule
If documents conflict:
1. `purpose_and_scope.md`
2. `decision_log.md`
3. `house_butler_implementation_plan.md`
4. Historical files
