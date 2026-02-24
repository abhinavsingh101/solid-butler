# The House Butler – Engineering Rules

> All agents and developers working on this project must follow these rules.
> These are specific to this project's stack (Next.js 14, TypeScript, Prisma, PostgreSQL, Anthropic Claude, Vercel).

---

## 1. TypeScript

- **No `any`.** Use `unknown` and narrow it, or define a proper type/interface.
- **Define types for all API request/response shapes.** Keep them in `src/types/`.
- **All Prisma models are the source of truth for data shapes.** Don't manually redeclare types that Prisma already generates — import from `@prisma/client`.
- Enable strict mode in `tsconfig.json`. It stays on.

---

## 2. Database & Prisma

- **All schema changes go through Prisma migrations.** Never alter the DB directly. Run `prisma migrate dev` in development, `prisma migrate deploy` in production.
- **Never delete from `chore_history`.** It is append-only. This table is the LLM's memory. Deleting rows breaks the intelligence layer.
- **Seed data lives in `prisma/seed.ts`.** The seeder must be idempotent (safe to run multiple times without duplicating data — use `upsert`, not `create`).
- **Never write raw SQL** unless Prisma provably cannot express the query, and even then, document it with a comment explaining why.
- **Always include `created_at` on every table.** Add `updated_at` to any table whose rows are mutable.

---

## 3. API Routes (Next.js)

- **All Claude API calls happen server-side only** — in `/app/api/` routes, never in client components. The API key must never reach the browser.
- **Every API route must check authentication first.** Use the middleware for page-level protection, but also validate the JWT in sensitive API routes as a second layer.
- **Return consistent error shapes:**
  ```ts
  { error: string, code?: string }
  ```
- **Use HTTP status codes correctly:** 401 (unauthenticated), 403 (forbidden), 400 (bad input), 500 (server fault).
- **Validate all incoming request bodies.** Use `zod` for schema validation before touching the DB.

---

## 4. Authentication

- **JWT is stored in an `HttpOnly`, `SameSite=Strict` cookie only.** Never `localStorage`, never exposed to JS.
- **Passwords are hashed with `bcrypt` (min 12 rounds).** Never store plain text or use weak hashing (md5, sha1).
- **JWT expiry: 7 days**, with silent refresh handled server-side.
- **All routes except `/login` are protected** by `src/middleware.ts`.

---

## 5. LLM Integration (Claude)

- **All prompts live in `src/lib/claude.ts`** — never inline prompt strings in route handlers or components.
- **Always request structured JSON output from Claude.** Use a system prompt that specifies exact JSON shape and validate the response before trusting it.
- **Always have a fallback.** If Claude returns malformed JSON or an error, fall back to a sensible default (e.g., a generic template checklist) rather than crashing.
- **Log every LLM call** (input token count, output, latency, error if any) to help debug and control costs.
- **Never pass raw user input directly into a prompt.** Sanitize and structure it first.
- **Household history passed to Claude must be summarized**, not dumped wholesale. Use the `llm_memory` table for condensed context to stay within context limits.

---

## 6. Progressive Web App (PWA)

- **Always serve over HTTPS.** The service worker and Web Push require it. Vercel provides this automatically.
- **Test on real mobile devices**, not just desktop browser DevTools mobile emulation — especially for iOS Safari, which has subtle PWA quirks.
- **The app must be functional without JavaScript enhancement for core data display** (chore list, assignments). Interactivity can layer on top.
- **Web Push is deferred to Phase 3** — do not stub or partially implement notification logic that will mislead users.

---

## 7. Code Organisation

- **Feature-based folder structure**, not layer-based. Group by feature (`/chores`, `/situations`) not by technical layer (`/controllers`, `/services`).
- **One responsibility per file.** A file that does two unrelated things should be split.
- **Shared UI components go in `src/components/`.** They must be stateless and generic — no hardcoded data or business logic.
- **Business logic belongs in `src/lib/`**, not in route handlers or components.
- **No magic strings.** Define constants or enums for values like `'pending' | 'completed' | 'skipped'` and import them everywhere.

---

## 8. Error Handling

- **Never silently swallow errors.** Every `catch` block must either re-throw, log, or return a proper error response.
- **User-facing errors must be human-readable.** Internal error codes go in logs, not in the UI.
- **Async/await everywhere.** No `.then().catch()` chains — they make error handling harder to trace.

---

## 9. Secrets & Environment

- **No secrets in code or git.** All secrets go in `.env.local` (dev) and Vercel environment variables (prod).
- **`.env.local` is in `.gitignore`.** Verify this before the first commit.
- **Document every required env variable** in `.env.example` with a description but no real values.
- **`NEXT_PUBLIC_` prefix only for values that are genuinely safe to expose to the browser.** When in doubt, don't prefix.

---

## 10. Git & Commits

- **Commit messages follow:** `<type>: <short description>` — e.g., `feat: add special situation LLM endpoint`, `fix: correct JWT expiry`, `chore: update seed data`.
- **Never commit directly to `main`.** Use feature branches, keep them short-lived.
- **Each commit should leave the app in a working state.** No half-implemented features committed mid-flight.
- **`.env.local`, `node_modules/`, `.next/` are always gitignored.**

---

## 11. Deferred Features (Do Not Pre-Build)

These are explicitly out of scope for the current phase. Do not scaffold, stub, or partially implement them — it creates confusion and tech debt:

- Gamification (points, streaks, leaderboard)
- Push notifications / reminders
- Escalating reminder logic
- LLM chore assignment suggestions (the *data collection* happens automatically; the *UI surface* is Phase 2)
- Admin/owner roles
- WhatsApp / SMS / email notifications

If you find yourself building something in this list, stop and check with the user.

---

*Established: 2026-02-24 | Review and update as the project evolves.*
