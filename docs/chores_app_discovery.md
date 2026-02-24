# The House Butler – Discovery & Requirements Document

> **Purpose:** Living document for any agent picking up this project. Captures all requirements, decisions, deferred features, and open questions from the planning phase.
> **User's own notes:** `/Users/palakmishra/repos/docs/house-butler.md` — do not modify.

---

## App Overview

**Name:** The House Butler
**Type:** Private Progressive Web App (PWA) — mobile-accessible via browser on iOS & Android, no App Store publishing
**Users:** 2 household members (partners), each on their own device

### Core Goals
- Organize and track household chores with a predefined list (user-managed, grows over time)
- LLM learns history and gradually suggests assignments, timing, and follow-ups
- Priority categories for tasks
- "Special Situations" (e.g., trip, guests) triggered via free-text → LLM generates contextual checklist
- Gamified feel: points and streaks for completing chores
- Polished, refined dark-mode UI

---

## Decisions Log

| # | Topic | Decision | Notes |
|---|-------|----------|-------|
| 1 | Users | 2 household members | Each on their own device |
| 2 | Logins | Yes — simple password per user | Needed for identity: so the LLM knows who is talking, who does what, and can learn individual preferences. Security not a priority (private household app). |
| 3 | Admin/Owner role | Not needed (for now) | Both members are equals |
| 4 | Chore assignment | User-assigned initially; LLM suggests over time | LLM learns from history and makes increasingly intelligent suggestions |
| 5 | Chore frequency | User-defined | Users set frequency themselves; LLM retains history to improve suggestions later |
| 6 | Predefined chores | Yes — start with a list, keep adding | Not learning from scratch |
| 7 | Notifications | Simple to start | Basic in-app / browser push; escalation and advanced follow-up deferred to later |
| 8 | Special situations trigger | Free-text input | LLM interprets context + history to generate checklist |
| 9 | LLM provider | Anthropic Claude | User preference; API key in hand |
| 10 | Hosting | Cloud (Vercel / Railway) | Until user sets up a home server |
| 11 | Design feel | Fun, gamified, polished, refined | Points + streaks; dark mode essential; aesthetics are high priority |
| 12 | App name | The House Butler | — |
| 13 | Gamification & reminders | Deferred | Build solid foundation first; add intelligence once history exists |

---

## Features — Phased Approach

### MVP (Ship First)
- [ ] User accounts with simple password login (2 users)
- [ ] Predefined chore list — add/edit/delete chores
- [ ] Manual chore assignment to a household member
- [ ] Chore frequency setting (daily / weekly / monthly / custom)
- [ ] Chore completion tracking (mark done)
- [ ] Priority categories (High / Medium / Low)
- [ ] Special Situations via free-text → LLM-generated checklist
- [ ] Dark mode UI, polished and refined

### Phase 2 — LLM Intelligence
- [ ] LLM retains history of chore completions per user
- [ ] LLM suggests chore assignments based on past patterns
- [ ] LLM suggests optimal timing/frequency based on history
- [ ] LLM recalls past special situations to improve future checklists
- [ ] LLM learns individual preferences per user (who tends to do what)

### Phase 3 — Gamification & Reminders
- [ ] Points & streaks system
- [ ] Browser push notifications / reminders
- [ ] Escalating reminders if chore is ignored

### Deferred (Later)
- [ ] Admin/owner role
- [ ] Self-hosted (home server) migration
- [ ] Deeper notification channels (WhatsApp, SMS, email)

---

## Technical Design (Preliminary)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js PWA | Installable on iOS/Android without App Store; SSR for mobile perf |
| Backend | Next.js API Routes | Co-located with frontend; secrets stay server-side |
| LLM | Anthropic Claude (API) | User preference; API key in hand |
| Database | PostgreSQL via Supabase | Relational, free tier, scales to home server |
| ORM | Prisma | Type-safe, migration-friendly |
| Auth | Simple username + password (JWT) | Private app, low security risk |
| Hosting | Vercel | One-click deploy from GitHub |
| Notifications | Web Push API (future) | Works on iOS 16.4+ and Android |

---

## Special Situations — Design Notes

- **Trigger:** Free-text input by either user (e.g., "We're going to Goa on March 15" or "My parents are visiting next weekend")
- **LLM behavior:** Interprets the event, generates a contextual checklist, references history of similar past events
- **Examples:**
  - *Trip* → visa, tickets, packing, pet care, mail hold, plant watering
  - *Outstation guests* → stock fridge, clean bathrooms, organize drawing room, guest room prep, grocery shopping
- **Checklist is editable** after LLM generates it
- **Special situations have a deadline** (event date) — checklist items prioritized by urgency

---

*Last updated: 2026-02-24*
