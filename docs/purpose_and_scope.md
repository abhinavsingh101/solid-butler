# The House Butler - Product Purpose and Scope (Canonical)

This is the canonical product-purpose document for this repository.
If another document disagrees with this file, follow this file.

## Purpose
The House Butler helps two household members run their home with less mental load.

The app should:
- Track recurring chores clearly.
- Keep a history of who did what and when.
- Help with special situations (trips, guests, events) by turning plain-language input into editable checklists.
- Support voice-first interaction patterns (hands-free capture and guidance) as a core long-term capability.
- Feel polished and enjoyable enough that both members keep using it.

## Users
- Exactly 2 household members for MVP.
- No admin/owner role for MVP.

## Product Principles
- MVP first, upgrade-ready architecture.
- Manual control first, AI suggestions second.
- Data durability first: raw history is never discarded.
- Clarity over complexity in UI and workflows.

## MVP Scope (Build Now)
- Password login for 2 users.
- Chore list management: add, edit, archive.
- Manual assignment of chores.
- Recurring frequency support for practical household use.
- Mark done / skipped with timestamps.
- Priority guidance with finite urgency budgeting and ranked sequencing ("do this first, then this").
- Backlog safety valve: busy-day flag with recommended focus block when high-urgency tasks pile up.
- Special situations: free-text input -> generated checklist -> user can edit and save.
- Lightweight gamification: points and streaks.
- Installable web app (Add to Home Screen).

## Deferred Scope (Build Later)
- Fully automated chore assignment.
- Advanced reminder escalation.
- Additional channels (WhatsApp/SMS/email).
- First-class voice flows (speech input/output), after core reliability is proven in MVP.
- Full offline-first behavior.
- Home server migration.

## Definition of MVP Success
- Both users can use it daily on their phones.
- Today's chores are reliable and understandable.
- History is accurate enough for later AI suggestions.
- Special situations are useful without manual prompt engineering.

## Source of Truth Order
1. `docs/purpose_and_scope.md` (this file)
2. `docs/decision_log.md`
3. `docs/house_butler_implementation_plan.md`
4. Discovery and historical artifacts
