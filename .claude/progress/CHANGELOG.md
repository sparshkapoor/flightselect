# FlightSelect — Progress Log

## Session 1 (2026-03-14)

### Context
First session. The repo was a generated starter project from GitHub Copilot. The goal was to get it running locally, understand the architecture, and start making it functional.

---

### 1. Infrastructure Setup — Port Conflicts

**Problem**: `docker-compose up` failed because port 5432 was already in use by a local PostgreSQL installation (`postgres` process, PID 830, running as user `postgres`). `lsof -i :5432` returned empty without `sudo` — required `sudo lsof -i :5432` to see it.

**Decision**: Rather than stopping the local Postgres (user may need it), we changed the Docker port mapping.

**Changes**:
- `docker-compose.yml`: Changed postgres port from `'5432:5432'` to `'5433:5432'` (host port 5433, container port 5432)
- `packages/server/.env`: Updated `DATABASE_URL` to use port 5433: `postgresql://flightselect:flightselect_password@localhost:5433/flightselect_db`

**Note**: The `docker-compose.yml` also has a `version: '3.8'` attribute that Docker warns is obsolete. Not removed yet — cosmetic only.

---

### 2. Database Migration & Seed Fixes

**Problem 1**: `npm run db:migrate` failed with `P1000: Authentication failed` because Docker containers weren't actually running (port conflict prevented Postgres from starting).

**Problem 2**: `npm run db:seed` failed with TypeScript errors:
- `CabinClass` and `TripType` imported from `@prisma/client` but scraper interfaces expected them from `@flightselect/shared`
- `@flightselect/shared` module not found (shared package not built)
- `rawData` type mismatch: `Record<string, unknown>` not assignable to Prisma's `InputJsonValue`

**Changes to `packages/server/prisma/seed.ts`**:
1. Changed import from `import { PrismaClient, CabinClass, TripType } from '@prisma/client'` to `import { PrismaClient } from '@prisma/client'` and `import { CabinClass, TripType, RecommendedOption } from '@flightselect/shared'`
   - **Reason**: The scraper interfaces (`ScraperSearchParams`) expect `CabinClass` from `@flightselect/shared`, not from `@prisma/client`. Both enums have identical string values so they're interchangeable at runtime.
2. Changed `rawData: f.rawData ?? undefined` to `rawData: f.rawData ? (f.rawData as object) : undefined`
   - **Reason**: Prisma's `InputJsonValue` type is more restrictive than `Record<string, unknown>`. Casting to `object` satisfies the type checker.

**Build order discovered**: Must run `npm run build` (builds shared package) BEFORE `npm run db:migrate` (generates Prisma client) BEFORE `npm run db:seed`.

---

### 3. Server — Missing dotenv

**Problem**: Server crashed on startup with `Invalid environment variables: { fieldErrors: { DATABASE_URL: [ 'Required' ], REDIS_URL: [ 'Required' ] } }`. The `packages/server/src/config/env.ts` file validates `process.env` with Zod but nothing loads the `.env` file into `process.env` first. The `dotenv` package was not installed.

**Changes**:
- Installed `dotenv` in server workspace: `npm install dotenv --workspace=packages/server`
- Added `import 'dotenv/config';` as the very first line of `packages/server/src/index.ts` (before all other imports)
   - **Reason**: In CommonJS (ts-node default), imports execute in order. `dotenv/config` must load before `./config/env` validates `process.env`. Being the first import ensures `.env` is loaded before any other module reads environment variables.

---

### 4. Server — Missing BullMQ Worker

**Problem**: Searches were submitted successfully (SearchQuery created in DB, job queued in Redis) but no flights ever appeared. The `createSearchWorker()` function in `packages/server/src/jobs/queue.ts` was defined but never called anywhere in the codebase. Jobs were enqueued into Redis but no worker was consuming them.

**Changes to `packages/server/src/index.ts`**:
- Added imports: `import { createSearchWorker } from './jobs/queue'` and `import { processSearchJob } from './jobs/search.job'`
- Added worker startup in `bootstrap()`: `await createSearchWorker((job) => processSearchJob(job.data as { searchQueryId: string }))`
- Added log line: `logger.info('Search worker started')`

---

### 5. Frontend — Missing Filters in FilterSidebar

**Problem**: The filter store (`packages/client/src/stores/filterStore.ts`) defines 8 filter fields, but the FilterSidebar UI only rendered 3: max price, max layovers, airlines. Missing from UI: max flight duration, departure time range, min price, max layover duration.

**Changes to `packages/client/src/components/filters/FilterSidebar.tsx`**:
- Added "Max Flight Duration" range slider (60min to 1440min / 1h to 24h, step 30min)
- Added "Departure Time" range with two `<input type="time">` fields (start and end)
- Both placed between layovers and airlines sections

**Changes to `packages/client/src/pages/SearchResultsPage.tsx`**:
- Added filter logic for `minPrice`, `maxDurationMinutes`, `departureTimeStart`, `departureTimeEnd`
- Departure time comparison uses `toTimeString().slice(0, 5)` to extract HH:MM for comparison
- User also modified this file to add better loading states: `isStillSearching` combines multiple loading/fetching flags, and `isComparisonLoading` shows a separate spinner while comparison analysis builds

---

### 6. Decisions & Preferences Noted

**LLM choice**: User prefers open-source/free LLM. Options discussed:
- Ollama with llama3, mistral, or deepseek-r1 (completely free, runs locally)
- DeepSeek API (very cheap, OpenAI-compatible)
- Claude Haiku (already stubbed in codebase, costs fractions of a cent)
- **User chose**: Open-source/free — Ollama is the path forward

**LLM integration approach**: NOT a chatbot. Instead, "option reasoning" — an LLM-generated explanation card in the results UI that explains WHY one booking strategy is better. No additional UI surface area needed.

**Real flight data**: User found SerpAPI's Google Flights API (https://serpapi.com/google-flights-api). Free tier: 250 searches/month. This is better than Amadeus for this use case because it returns the same one-way AND round-trip prices visible on Google Flights. Implementation planned but not yet started.

---

### Outstanding Issues (as of end of session 1)
1. **Search button sometimes doesn't redirect to results page** — The `submitSearch()` hook catches errors silently and returns `null`, preventing navigation. Root cause needs investigation: likely the server not running (Docker containers stopping) or a validation error on the API side. Need to add error visibility to the UI.
2. **SerpAPI Google Flights scraper** — Not yet implemented. Stub exists at `packages/server/src/scrapers/google-flights/index.ts`.
3. **Ollama LLM integration** — Not yet started. MockAIService exists as placeholder.
4. **Min price filter** — In store but not in UI.
5. **Max layover duration filter** — In store but not in UI.
6. **Docker `version` attribute warning** — Cosmetic, can remove `version: '3.8'` from `docker-compose.yml`.
