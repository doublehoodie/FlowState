# FlowState

FlowState is a production-shaped MVP for an AI-ready adaptive flow scheduling app. It uses deterministic structured learning today and leaves clean seams for future LLM-generated tasks, explanations, and recommendations.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL, and API

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Run the SQL in `supabase/schema.sql` inside the Supabase SQL editor.

4. Start the app:

```bash
npm run dev
```

## Demo mode (no email)

For a shareable demo without accounts or Supabase, set:

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

In demo mode the app uses browser `localStorage`, seeds sample tasks, skips login, and shows **Reset demo** instead of log out. Leave this unset/false for the real Supabase auth app.

## Live URLs

| Version | URL |
|--------|-----|
| Auth (Supabase login) | https://flowstatehq.vercel.app |
| Demo (no email) | https://flowstate-demo-app.vercel.app |

## Folder Structure

```text
app/                  Next.js App Router pages and global styles
components/           Shared client UI shell and auth guard
lib/                  Supabase client, scheduling, learning, time helpers
services/             Supabase-backed API/service layer
types/                Domain and database TypeScript types
supabase/schema.sql   Database schema, indexes, and RLS policies
```

## Core Flow

1. Log in or create an account at `/login` (or use demo mode).
2. On **Today**, set up to **3 SMART goals** (Weintraub-style morning ritual).
3. Enable **browser nudges** (morning + in-day refocus) and optional check-ins for flow/stress/progress.
4. Create typed tasks at `/tasks` and place them on the day schedule.
5. Use **Week** (`/calendar`) for multi-day goals and blocks; open any day via `/dashboard?date=YYYY-MM-DD`.
6. Carry unfinished goals forward; regenerate a day from learned metrics.
7. Start a block and submit focus/distraction feedback at `/feedback`.

## Required SQL (auth deploy)

If your Supabase project was created earlier, run both:

- `supabase/schema.sql` (or the incremental migrations under `supabase/migrations/`)
- especially `supabase/migrations/20261118180000_goals_reminders_checkins.sql`

## AI-Ready Design

The scheduling and learning engines are pure TypeScript modules. Future LLM features can call into these engines to explain or propose changes without replacing the structured source of truth.
