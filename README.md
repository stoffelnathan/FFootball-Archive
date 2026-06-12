# FFootball Archive

Permanent fantasy football league archive built with Next.js, PostgreSQL, Prisma, and an ESPN import service.

## Prerequisites

- Node.js 20+
- PostgreSQL (local install or `npx prisma dev`)

## Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Edit `.env`:

- Set `DATABASE_URL` to your PostgreSQL connection string
- Set `ESPN_LEAGUE_ID` (yours: `1070465706`)
- For **private leagues**, add `ESPN_S2` and `SWID` from your browser cookies while logged into ESPN

### Getting ESPN cookies (private league)

Your league returned `401 Unauthorized` without cookies, so it is private.

1. Log into [ESPN Fantasy Football](https://fantasy.espn.com/football/) in your browser
2. Open DevTools → Application → Cookies → `espn.com`
3. Copy `espn_s2` → `ESPN_S2` in `.env`
4. Copy `SWID` → `SWID` in `.env` (include the curly braces)

### Database

**Option A — Prisma local dev server**

```bash
npx prisma dev
```

Use the `DATABASE_URL` it prints in `.env`, then:

```bash
npm run db:migrate
```

**Option B — Local PostgreSQL**

Create a database:

```sql
CREATE DATABASE ffootball_archive;
```

Set `DATABASE_URL` in `.env`, then:

```bash
npm run db:migrate
npm run db:generate
```

## Import from ESPN (Phase 3)

Import every season ESPN has for your league:

```bash
npm run import
```

Import specific season(s):

```bash
npm run import -- 2024
npm run import -- 2022,2023,2024
```

The importer stores:

- League settings, owners, teams, standings
- Draft results
- Weekly matchups, scores, roster snapshots
- Transactions
- Champion / runner-up

Re-running an import updates existing records safely (no duplicate rows).

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Site

| Page | URL |
|------|-----|
| Homepage | `/` |
| Seasons | `/seasons`, `/seasons/[year]` |
| Weekly matchups | `/seasons/[year]/weeks/[week]` |
| Game detail | `/matchups/[id]` |
| Owners | `/owners`, `/owners/[id]` |
| Players | `/players`, `/players/[id]` |
| Draft | `/draft` |
| Records | `/records` |
| Awards | `/awards` |
| Head-to-head | `/h2h` |
| Search | `/search` |
| Analytics | `/analytics` |

REST API routes live under `/api/*` (seasons, owners, players, matchups, draft, records, awards, search, analytics, h2h).

## Project structure

- `prisma/schema.prisma` — historical snapshot database schema
- `src/lib/services/` — data queries, records, awards, analytics
- `src/lib/espn/` — ESPN API client
- `src/lib/import/season-importer.ts` — season import pipeline
- `src/app/` — pages and API routes
- `scripts/import.ts` — CLI entry point

## Phase 16 — Weekly auto-sync

A cron endpoint refreshes the current and previous season from ESPN every **Tuesday at 12:00 UTC** (configured in `vercel.json`).

Local test:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/import
```

Set `CRON_SECRET` in `.env` (and in Vercel project env vars when deployed). Vercel sends this header automatically for scheduled crons.

## Deployment (Vercel + hosted Postgres)

The app is ready to deploy. All pages are dynamic (database-backed), and the build passes locally.

### 1. Push code to GitHub

```bash
git init
git add .
git commit -m "Initial FFootball Archive"
```

Create a new GitHub repo, then:

```bash
git remote add origin https://github.com/YOU/ffootball-archive.git
git push -u origin master
```

### 2. Create a production database

Use [Neon](https://neon.tech) (free tier, works well with Vercel) or Supabase:

1. Create a project
2. Copy the **pooled** Postgres connection string
3. Append `?sslmode=require` if it is not already present

### 3. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repo
2. Framework preset: **Next.js** (auto-detected)
3. Add environment variables:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Neon/Supabase connection string |
| `ESPN_LEAGUE_ID` | `1070465706` |
| `ESPN_S2` | Your ESPN cookie (quoted) |
| `SWID` | Your SWID cookie (quoted, with braces) |
| `CRON_SECRET` | Long random string (e.g. `openssl rand -hex 32`) |
| `IMPORT_START_YEAR` | `2002` (optional) |
| `IMPORT_END_YEAR` | `2025` (optional) |

4. Deploy

`postinstall` runs `prisma generate` automatically on Vercel.

### 4. Initialize the production database

From your machine, point at production once:

```powershell
$env:DATABASE_URL = "your-neon-connection-string"
npm run db:push
npm run db:seed -- 2024 2025
```

Or step by step:

```bash
npm run db:push
npm run import -- 2024 2025
npm run db:backfill-stats
npm run db:backfill-weekly
npm run db:fix-champions
```

### 5. Verify

Open your Vercel URL and check `/seasons`, `/players`, and `/awards`.

### 6. Weekly auto-sync

`vercel.json` schedules `/api/cron/import` every **Tuesday at 12:00 UTC**. Vercel sends `Authorization: Bearer CRON_SECRET` automatically on Pro; on Hobby you may need to trigger it manually or use an external cron service.

Manual trigger:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://YOUR-SITE.vercel.app/api/cron/import
```

### Making changes after deploy

- **Code/UI changes:** push to GitHub → Vercel redeploys automatically
- **Schema changes:** edit `prisma/schema.prisma`, run `npm run db:push` against production, redeploy
- **Re-import data:** run `npm run import` locally with production `DATABASE_URL`, or hit the cron endpoint
- **Player stat fixes:** `npm run db:backfill-stats` and `npm run db:backfill-weekly` with production `DATABASE_URL`

### Local production build test

```bash
npm run build
npm run start
```
