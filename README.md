# House Butler (MVP)

House Butler is a two-member household chore app focused on reliable daily use first:
- manual assignment before automation,
- durable history for future AI learning,
- practical prioritization with urgency budgeting,
- special-situation checklist generation.

Canonical product/implementation docs:
- `docs/purpose_and_scope.md`
- `docs/decision_log.md`
- `docs/house_butler_implementation_plan.md`

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16 (local)

## Environment

1. Copy `.env.example` to `.env.local`.
2. Set required values:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `CLAUDE_API_KEY`
   - `NEXT_PUBLIC_APP_URL`

Note:
- This repo includes a placeholder `.env` for tooling defaults.
- Local runtime should use `.env.local`.

## Local Setup

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

App URL:
- [http://localhost:3000](http://localhost:3000)

## Seeded Login Accounts

After `npm run db:seed`:
- `abhinav / ChangeMeAbhinav1`
- `partner / ChangeMePartner1`

## Test Commands

Unit + integration:

```bash
npm test
```

Targeted:

```bash
npm run test:unit
npm run test:integration
```

E2E (Playwright):

```bash
npx playwright install chromium
npm run test:e2e
```

## Build Check

```bash
npm run build
```

## MVP QA Checklist (Manual)

- Add to Home Screen works on iOS and Android.
- Login lockout behavior works after repeated failed attempts.
- Scheduler is idempotent (no duplicate pending assignment for same chore window).
- Special-situation checklist is editable and persists after refresh.

## CI Gate

GitHub Actions runs on PRs and `main` pushes:
- `npm test` (Postgres-backed),
- `npm run build`,
- `npm run test:e2e` (Playwright smoke).
