# The House Butler – Implementation Plan

A private Progressive Web App for 2 household members to manage chores and special situations, with Anthropic Claude integration that learns household patterns over time.

---

## Architecture Decisions & Rationale

### Why Next.js (not plain React + separate backend)?
- Single deployment unit: Next.js API Routes serve as the backend, keeping secrets (Claude API key, DB credentials) server-side
- Easy Vercel deployment — one `git push` deploys everything
- Server-side rendering improves mobile performance on first load
- No CORS configuration needed since frontend and API are co-located

### Why PostgreSQL (via Supabase)?
- Relational model fits chores + users + assignments + history naturally
- Supabase gives us a free-tier managed Postgres and easy local dev with Docker
- Unlike SQLite, it scales when they move to a home server
- Row-level access patterns are straightforward for 2 users

### PWA Constraints
- **iOS Safari (16.4+):** Supports Web Push, service workers, and Add to Home Screen
- **Android Chrome:** Full PWA support
- Must serve over HTTPS (Vercel handles this automatically)
- App manifest + service worker required for installability

### LLM Strategy (Claude)
- All Claude calls go through server-side API routes (API key never exposed to client)
- A **persistent memory table** summarizes household history — passed to Claude on every relevant call
- Special situations: user types free text → server sends structured prompt with history context → Claude returns JSON checklist
- Future-ready: `chore_history` table is populated from day 1 so Phase 2 LLM suggestions have real data to learn from

---

## Data Model

```sql
-- Users
users (id, username, display_name, password_hash, created_at)

-- Chores master list
chores (id, name, description, category, priority, frequency_type, frequency_value, is_active, created_at)
-- frequency_type: 'daily' | 'weekly' | 'monthly' | 'as_needed'
-- priority: 'high' | 'medium' | 'low'
-- category: 'cleaning' | 'cooking' | 'laundry' | 'maintenance' | 'shopping' | 'other'

-- Chore assignments (scheduled instances)
chore_assignments (id, chore_id, assigned_to_user_id, due_date, status, created_at, completed_at, notes)
-- status: 'pending' | 'completed' | 'skipped'

-- Full history (append-only, never deleted — LLM training data)
chore_history (id, chore_id, user_id, action, timestamp, notes)
-- action: 'assigned' | 'completed' | 'skipped' | 'reassigned'

-- Special situations
special_situations (id, title, raw_input, event_date, created_by_user_id, created_at, status)
-- status: 'active' | 'completed' | 'cancelled'

-- Situation checklist items (LLM-generated)
situation_items (id, situation_id, title, description, assigned_to_user_id, due_date, status, display_order)

-- LLM memory / household context (summary updated by Claude periodically)
llm_memory (id, context_type, summary, raw_data, created_at, updated_at)
-- context_type: 'household_preferences' | 'chore_patterns' | 'situation_history'
```

> **Key design principle:** `chore_history` is append-only and populated from day 1. This is what enables the LLM to make intelligent suggestions in Phase 2 without any schema changes.

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 14 (App Router) | Full-stack, Vercel-native, SSR for mobile perf |
| Language | TypeScript | Type safety across frontend + backend |
| Database | PostgreSQL via Supabase | Free tier, managed, scales to home server |
| ORM | Prisma | Type-safe, auto-generates migrations |
| Auth | Custom JWT + bcrypt | No OAuth needed; private app |
| LLM | Anthropic Claude (`@anthropic-ai/sdk`) | User preference + API key in hand |
| Styling | Tailwind CSS | Rapid, consistent dark-mode UI |
| PWA | `next-pwa` | Service worker + manifest for installability |
| Deployment | Vercel | One-click from GitHub |

---

## Project Structure

```
house-butler/
├── prisma/
│   ├── schema.prisma          # Full data model
│   └── seed.ts                # Pre-seeded chore list
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (dark theme, PWA meta)
│   │   ├── page.tsx           # Dashboard (today's chores)
│   │   ├── chores/            # Chore list management
│   │   ├── situations/        # Special situations
│   │   ├── history/           # Chore history view
│   │   └── api/
│   │       ├── auth/          # Login, logout, session
│   │       ├── chores/        # CRUD + assignments
│   │       ├── situations/    # Create, list, update items
│   │       └── llm/           # Claude integration endpoints
│   ├── components/            # Reusable UI components
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── auth.ts            # JWT helpers
│   │   └── claude.ts          # Claude API wrapper + prompt builder
│   └── middleware.ts          # Route protection (JWT check)
├── public/
│   ├── manifest.json          # PWA manifest
│   └── icons/                 # App icons (192×192, 512×512)
└── .env.local                 # CLAUDE_API_KEY, DATABASE_URL, JWT_SECRET
```

---

## Key Components

### `src/lib/claude.ts`
- `generateSituationChecklist(rawInput, eventDate, householdHistory)` — core LLM call
- Prompt includes: event description, event date, summary of past similar situations from `llm_memory`
- Returns structured JSON: `{ items: [{ title, description, suggestedDueDate, suggestedAssignee }] }`
- Graceful error handling with fallback to a generic template

### `src/middleware.ts`
- Protects all routes except `/login`
- Reads JWT from `HttpOnly` cookie
- Attaches `userId` to request headers for downstream API routes

### Dashboard (`/`)
- "Today's Chores" — assignments due today or overdue, sorted by priority
- Quick-complete toggle per item
- Name badge showing whose chore is whose

### Special Situations (`/situations`)
- Free-text input field ("Describe your situation...")
- Date picker for event date
- Submit → LLM call → renders editable checklist
- Each item: title, assignee, due date, status toggle

---

## Pre-Seeded Chore List

| Chore                       | Frequency  | Priority |
| --------------------------- | ---------- | -------- |
| Wipe drawing room surfaces  | 3-days     | Medium   |
| Wipe living room surfaces   | 3-days     | Medium   |
| Wipe bedrooms surfaces      | 3-days     | Medium   |
| Dust sofas                  | 7-days     | Medium   |
| Dust blinds                 | 7-days     | Low      |
| Clean bathrooms             | 3-days     | High     |
| Clean wash basins           | 7-days     | High     |
| Clean kitchen counters      | Daily      | High     |
| Do laundry                  | 3-days     | Medium   |
| Change bed sheets           | 7-days     | Medium   |
| Buy vegetables              | Weekly     | High     |
| Water plants                | Twice/week | Medium   |
| Restock pantry              | As needed  | Medium   |
| Get wheat ground into flour | Monthly    | Medium   |


---

## Environment Variables

```env
DATABASE_URL=               # Supabase PostgreSQL connection string
JWT_SECRET=                 # Random 32+ char secret
CLAUDE_API_KEY=             # Anthropic API key
NEXT_PUBLIC_APP_URL=        # Deployed URL (for PWA manifest)
```

---

## What's Intentionally Deferred

| Feature | Reason |
|---------|--------|
| Gamification (points, streaks) | Needs solid chore completion history first |
| Push notifications / reminders | Needs usage patterns to calibrate |
| LLM chore suggestions | `llm_memory` table collects data now; surfaced in Phase 2 |
| Escalating reminders | Phase 3 |
| Home server migration | When user is ready |

---

## Verification Plan

### Local DB & Seed
```bash
npx prisma migrate dev --name init
npx prisma db seed
npx prisma studio   # Visual DB browser at localhost:5555
```
Verify: all tables created, 14+ chores visible.

### Auth Flow
- `GET /` → redirects to `/login` ✓
- Login → `HttpOnly` JWT cookie set ✓
- `curl /api/chores` (no cookie) → 401 ✓

### Chore Management
- Create chore → assign → mark complete → verify `chore_history` row created

### Special Situations (LLM)
- Type: "We're going on a trip to Goa on March 15"
- Verify: contextual checklist appears (visa, packing, tickets, etc.)
- Edit item assignee → verify persists

### PWA Install
- iOS Safari: Share → "Add to Home Screen" → opens in standalone mode ✓
- Android Chrome: install prompt → standalone mode ✓

---

*Plan created: 2026-02-24*
