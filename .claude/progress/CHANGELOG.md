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

---

## Session 2 (2026-03-16)

### Context
Goal was to get the SerpAPI Google Flights scraper actually working end-to-end, add booking links, clean up the comparison engine, and prepare the app for a blog post.

---

### 1. AIInsightsPanel Removed

Removed the `AIInsightsPanel` component from `ComparisonView.tsx` and deleted `AIInsightsPanel.tsx`. The follow-up question input was a placeholder ("coming soon!" alerts) and added no value.

---

### 2. SerpAPI Scraper — Fixed and Working

**Multiple bugs fixed in `packages/server/src/scrapers/google-flights/index.ts`:**

- **Env var mismatch**: `.env` had `SERPAPI_KEY` but code read `SERPAPI_API_KEY`. Renamed in `.env` and added `SERPAPI_API_KEY` to the Zod schema in `packages/server/src/config/env.ts`. Removed `(env as any)` casts.
- **`travel_class` was string, must be numeric**: SerpAPI expects `1`/`2`/`3`/`4`, not `"economy"`/`"business"`. Created `CABIN_CLASS_MAP` record.
- **`type` parameter missing**: Wasn't being sent at all (defaulted to round-trip). Now explicitly set to `2` (one-way).
- **Dates sent as Date objects**: SerpAPI needs `YYYY-MM-DD` strings. Added `formatDate()` helper.
- **Round-trip only returned outbound flights**: SerpAPI's round-trip mode is a two-step `departure_token` flow. Switched to making **two separate one-way searches** (outbound + return) which gives us all flights for both legs. Extracted `fetchOneWay()` as a standalone function.
- **NaN price crash**: Some SerpAPI flights have no price (undefined). `price * passengers` = `NaN`, which crashes Prisma `createMany`. Added filter to skip flights with invalid prices.
- **Added structured logging** instead of `console.log(JSON.stringify(data))`.

---

### 3. Booking URL — Added End-to-End

**New field `bookingUrl` added across the full stack:**
- `ScrapedFlight` interface in `scraper.interface.ts`
- `Flight` model in `prisma/schema.prisma` (nullable `String?`)
- `Flight` interface in `packages/shared/src/types.ts`
- `search.job.ts` — persists `bookingUrl` to DB
- Prisma migration `20260316220647_add_booking_url` applied

**Google Flights URL construction**: SerpAPI doesn't return direct booking URLs. Built `buildGoogleFlightsUrl()` that constructs `https://www.google.com/travel/flights?q=Flights+from+{origin}+to+{dest}+on+{date}`.

**`booking_token` stored in `rawData`** for future use — can make a follow-up SerpAPI call to get actual airline booking options.

**FlightCard updated**: Shows "View on Google Flights →" link that opens in new tab when `bookingUrl` exists. Click is `stopPropagation`'d so it doesn't trigger the card's `onSelect`.

---

### 4. Mock Scraper Auto-Disabled

Changed `ScraperFactory.getAvailableScrapers()` to prefer real scrapers over mock. If any real scraper (source !== 'mock') is available, mock is excluded. Falls back to mock only if no real scrapers are configured.

---

### 5. Search Status Tracking

**Problem**: Frontend polled for results every 2 seconds, up to 30 attempts. If the search returned 0 flights (SerpAPI had no results), it polled forever — 60 seconds of wasted DB queries.

**New `status` field on SearchQuery**: `PENDING` → `COMPLETED` | `FAILED`
- Added `SearchStatus` enum to Prisma schema
- Added `status` field to `SearchQuery` model (default `PENDING`)
- Added `SearchStatus` type to shared types
- Migration `20260316221127_add_search_status` applied
- `search.job.ts` now wraps in try/catch: sets `COMPLETED` on success, `FAILED` on error
- Frontend `useSearch.ts`: polling stops when `status` is `COMPLETED` or `FAILED`
- `SearchResultsPage.tsx`: shows "No flights found" message instead of infinite spinner when search completes with 0 results

---

### 6. Comparison Engine — Same Airline vs Best Mix

**Problem**: The old comparison compared "round trip" vs "one-way" but both sides showed identical flights. The 10% "round trip discount" was fabricated.

**New logic in `comparison.job.ts`:**
- **Same Airline**: Finds the cheapest outbound+return combo where both legs are the same carrier. Iterates all outbound flights, finds matching-airline return flights, picks cheapest combo.
- **Best Mix**: Cheapest outbound + cheapest return regardless of airline.
- Fake 10% discount removed — all prices are real SerpAPI prices.

**Labels updated across all components:**
- `ComparisonView.tsx`: "Round Trip vs. One-Way" → "Same Airline vs. Best Mix"
- `PriceComparisonChart.tsx`: bar labels updated
- `ComparisonTable.tsx`: column headers updated
- `SavingsBadge.tsx`: "Round-trip saves" → "Same Airline saves", "One-way saves" → "Mix & Match saves"

---

### 7. Server Resilience

- `packages/server/src/index.ts`: Worker startup failure no longer crashes the server. Wrapped in try/catch — logs warning and continues (searches fall back to direct processing).
- Recurring port 3001 `EADDRINUSE` issue — user frequently has stale server processes. Need to kill with `lsof -ti:3001 | xargs kill -9` before restarting.

---

### Outstanding Issues (as of end of session 2)
1. **Filters still broken** — Layover filter only handles "Direct" (boolean `isLayover`), not layover count. Price slider resets on re-render. No sort functionality.
2. **`layoverAirport` always null** — Scraper layover parsing from SerpAPI segments needs fixing (layover data exists in the response but isn't being extracted correctly).
3. **Airport input has no autocomplete/validation** — User can type anything.
4. **Prisma query logging extremely verbose** — Should be turned off for dev comfort.
5. **Pre-existing TS errors in `mock.scraper.ts`** — `cabinClass` type mismatch. Non-blocking since mock is disabled.
6. **Blog post** — User wants to write about using Claude Code to build this. Needs clean screenshots of each stage.
7. **RAG pipeline** — Next major feature. Historical flight pricing data for LLM-powered booking recommendations.
8. **Direct airline booking links** — `booking_token` is stored but the follow-up SerpAPI call to get airline URLs is not yet implemented.

---

## Session 3 (2026-03-19)

### Context
Goal was to add SerpAPI rate limiting (protect the 250/month quota), fix blog-post-blocking issues (TS errors, verbose logging), and surface API errors to the frontend.

---

### 1. SerpAPI Rate Limiter — Two-Layer Redis-Based

**New file: `packages/server/src/middleware/serpApiRateLimit.middleware.ts`**

Two layers of protection:

- **Per-client sliding window**: 1 search per 60 seconds per IP address. Uses Redis `SET key EX 60`. If the key exists, the request is blocked with a 429 including `retryAfterSeconds`.
- **Global monthly cap**: 225 searches per billing cycle (SerpAPI renews on the 28th). Uses a Redis counter with TTL set to expire at the next renewal date. When the counter hits 225, all further searches are blocked with a 429 including `limitType: 'global_monthly'`.

**Key design decisions:**
- Billing cycle key is computed dynamically from the current date and renewal day (28th), so it auto-rotates each month.
- Fail-open: if Redis is down, requests are allowed through (with a logged error). This prevents Redis outages from breaking the app entirely.
- Rate limit headers (`X-RateLimit-Remaining`, `X-RateLimit-Limit`, `X-RateLimit-Client-RetryAfter`) are set on successful responses for frontend transparency.

**Status endpoint**: `GET /api/search/rate-limit` returns `{ used, remaining, monthlyLimit, renewalDay }` — no rate limiting on this GET.

**Middleware chain on `POST /api/search`**: `searchRateLimit` (express-rate-limit, 10/min) → `serpApiRateLimit` (per-client + global) → `validateBody` → controller.

---

### 2. Frontend 429 Error Handling

**`SearchForm.tsx`**: Added error display. The `useSearchSubmit` hook already caught errors and stored them in `store.searchError`, but the form never rendered them. Now shows a red banner above the submit button with the server's error message (e.g., "Rate limited: please wait 58 seconds before searching again.").

Also removed emoji from the search button text.

---

### 3. Rate Limit Test Script

**New file: `scripts/test-rate-limit.ts`**

Run with `npx ts-node scripts/test-rate-limit.ts` (add `--test-global` to include global cap test).

Tests:
1. First request succeeds (202)
2. Same client blocked within 60s window (429 per_client)
3. Rate limit status endpoint works
4. Spam protection — 5 concurrent requests, at most 1 succeeds
5. Response headers include rate limit info
6. (Optional) Global cap simulation — sets Redis counter to 225, verifies 429, restores original value

---

### 4. Mock Scraper TS Fix

**`packages/server/src/scrapers/mock.scraper.ts`**: Changed `cabinClass: string` to `cabinClass: CabinClass` in `generateFlights()` and added the `CabinClass` import from `@flightselect/shared`. This fixes the type mismatch with `ScrapedFlight.cabinClass` and `generatePrice()`.

---

### 5. Prisma Query Logging Silenced

**`packages/server/src/config/database.ts`**: Changed `log: ['query', 'error', 'warn']` to `log: ['error', 'warn']`. Removes the wall of SQL from dev console while keeping error/warn visibility.

---

### 6. Client TS Error Fix

**`packages/client/src/hooks/useSearch.ts`**: Fixed `data?.flights?.length > 0` to `(data?.flights?.length ?? 0) > 0`. The optional chain could produce `undefined > 0` which TS flagged as possibly undefined.

---

### Outstanding Issues (as of end of session 3)
1. ~~**Filters still broken**~~ — Fixed in session 3 continued.
2. ~~**`layoverAirport` always null**~~ — Fixed in session 3 continued.
3. ~~**Airport input has no autocomplete/validation**~~ — Fixed in session 3 continued.
4. **Blog post** — Website is cleaner now (no TS errors, no SQL wall, rate limiting in place). Ready for screenshots.
5. **RAG pipeline** — Next major feature. Historical flight pricing data for LLM-powered booking recommendations.
6. **Direct airline booking links** — `booking_token` is stored but the follow-up SerpAPI call to get airline URLs is not yet implemented.

---

### 7. Airport Autocomplete — Rewritten

**`packages/client/src/components/search/AirportInput.tsx`** — full rewrite:
- Removed auto-fill behavior (typing "LOS" no longer auto-selects Lagos). Users must explicitly click a dropdown item.
- Dropdown opens on focus (click into box) showing top 15 airports, so users can scroll and browse.
- Typing filters the list with relevance-ranked search (exact code > code starts-with > city starts-with > city word match > contains).
- Backspace no longer re-triggers auto-fill — clearing text just clears the selection.
- Error message ("Select an airport from the list") only shows after blur, not while typing.

**`packages/client/src/utils/airportData.ts`** — expanded to ~100 airports. `searchAirports()` now returns results scored by match quality instead of simple `includes()` filter.

**`packages/client/src/pages/SettingsPage.tsx`** — replaced plain text input for Home Airport with the same `AirportInput` component.

---

### 8. Filters Fixed + Sort Added

**`packages/client/src/pages/SearchResultsPage.tsx`**:
- Layover filter now uses count-based logic (`f.isLayover ? 1 : 0`) instead of broken boolean check.
- Added sort dropdown: Price (low/high), Duration (shortest), Departure (earliest). Uses `useMemo` for performance.
- Shows "X of Y flights" count above results.

**`packages/client/src/components/filters/FilterSidebar.tsx`**:
- Price slider: clears to `undefined` when at max so it doesn't fight with changing flight data.
- Price bounds computed via `useMemo` to prevent unnecessary recalculations.
- Layover buttons relabeled: "Direct", "1+", "2+".

---

### 9. LayoverAirport Parsing Fixed

**`packages/server/src/scrapers/google-flights/index.ts`**: Added fallback for when SerpAPI doesn't populate the `layovers` array — extracts layover airport from first segment's arrival airport and estimates duration from the time gap between segments.

---

### 10. UI Cleanup

- Removed "We compare prices across airlines and answer that question with AI-powered insights" subtitle from homepage.
- Removed trip type toggle (Round Trip / One Way) from SearchForm — comparison is always-on.
- Removed "Compare Round Trip vs One-Way" checkbox.

---

### Outstanding Issues (as of end of session 3 final)
1. **Blog post** — Website is ready for screenshots.
2. **RAG pipeline** — Next major feature.
3. **Direct airline booking links** — `booking_token` stored, follow-up SerpAPI call not yet implemented.

---

## Session 4 (2026-03-24)

### Context
Quick session focused on cleanup: removing dead UI, fixing a scraper crash, and preparing handoff notes for the blog post and RAG pipeline work.

---

### 1. AIInsightsPanel Deleted

Deleted `packages/client/src/components/comparison/AIInsightsPanel.tsx` and removed the import/usage from `ComparisonView.tsx`. The component was a non-functional placeholder ("coming soon!" alerts) — removing it cleans up the comparison view for blog screenshots.

---

### 2. NaN Price Filter in Scraper

**Problem**: Some SerpAPI flights return with `undefined` price. `price * passengers` produces `NaN`, which crashes Prisma's `createMany` because `NaN` is not a valid Decimal.

**Fix in `packages/server/src/scrapers/google-flights/index.ts`**: Added a guard in `processResults()` — flights where `!result.price || isNaN(result.price)` are skipped with a warning log.

---

### 3. Port Cleanup (Recurring)

Port 3001 was occupied by a stale server process from a previous session. Killed with `lsof -ti:3001 | xargs kill -9`. Also cleared stale Vite processes on 5173/5174/5175. This continues to be a recurring issue — user needs to Ctrl+C cleanly or kill ports before restarting.

---

### 4. Committed & Pushed

All session 2-4 changes committed as `77bc88c` — "SerpAPI scraper working, booking links, comparison engine overhaul". Pushed to `origin/main`.

---

### Outstanding Issues (as of end of session 4)
1. **Search button not working** — User reported it's broken again at end of session. Likely stale server or Docker not running. Needs investigation next session.
2. **Filters still need work** — Layover count filter, price slider reset, sort integration.
3. **Blog post** — User wants to write about building FlightSelect with Claude Code. Website ready for screenshots. Blog file exists at `blog/post.md`.
4. **RAG pipeline** — Next major feature: scrape and persist historical flight pricing data, build a RAG database an LLM can query for booking recommendations.
5. **Direct airline booking links** — `booking_token` stored in rawData, follow-up SerpAPI call not yet implemented.
6. **Personal website fade-in transition** — User wants a loading animation similar to agiledigital.com.au for their portfolio site (separate project at `~/Personal Website/`).

---

## Session 5 (2026-03-24)

### Context
Blog post editing, 429 screenshot simulation, README cleanup.

---

### 1. Blog Post Proofreading

Reviewed and fixed ~20+ spelling/grammar issues in `blog/post.md`: Intruiged→Intrigued, infrustructure→infrastructure, debuging→debugging, safegaurds→safeguards, boundries→boundaries, etc. Also fixed grammar: "can't be understated"→"can't be overstated", "never actually connecting"→"never actually connected", tense consistency, and awkward phrasing throughout.

---

### 2. 429 Rate Limit Screenshot

Added a temporary force-429 block in `serpApiRateLimit.middleware.ts` so user could trigger and screenshot the rate limit error on the frontend. Reverted after screenshot was captured.

---

### 3. README Overhaul

- Removed AI Integration (Planned) section with LLM setup instructions and model suggestions
- Removed Adding New Scrapers section with IScraper interface docs
- Updated intro: removed "mock; real scrapers coming soon" language, now describes SerpAPI as the live data source
- Updated architecture diagram: replaced Mock/Google/Skyscanner/Amadeus scraper labels with SerpAPI Google Flights, removed AI Svc (Mock) box

---

### Outstanding Issues (as of end of session 5)
1. **Filters still need work** — Layover count filter, price slider reset, sort integration.
2. **Blog post** — Draft complete at `blog/post.md`, needs screenshots inserted at comment placeholders.
3. **RAG pipeline** — Next major feature: historical flight pricing data + LLM query layer.
4. **Direct airline booking links** — `booking_token` stored, follow-up SerpAPI call not yet implemented.
5. **Personal website fade-in transition** — Separate project at `~/Personal Website/`.

---

## Session 6 (2026-04-01)

### Context
Blog post restructuring, architecture clarification, and decisions on the storage layer going forward.

---

### 1. Blog Post Restructured

Rewrote `blog/post.md` for narrative clarity and correct chronological order:

- **ToC updated** — swapped "Usage Limits" and "Is Everything Correct?" to reflect the actual build order
- **TL;DR section added** — placed after ToC, before "The Idea". Lists 7 common problems + fixes for anyone cloning the repo
- **"Session 1" heading removed** — content folded into a closing paragraph under "The Missing Pieces" with a bridge sentence connecting to SerpAPI
- **"Is Everything Correct?" restructured** — SerpAPI scraper bugs, comparison engine rewrite, and filter fixes each get their own paragraph in build order. Screenshot placeholder moved here
- **"Usage Limits" now correctly follows** — reads as a consequence of going live with real data, not a precursor to debugging
- **Claude quote formatted as blockquote** in "What's Next"
- Minor: double blank line removed, "API" capitalized consistently

---

### 2. PostgreSQL Decision — Keep As-Is

User questioned whether Postgres was necessary since Redis was already running. Clarified the division:
- **PostgreSQL** = permanent storage for SearchQuery, Flight, Comparison records. The scraper, comparison engine, all jobs, and controllers depend on it.
- **Redis** = ephemeral. Handles BullMQ job queue (consumed and discarded) and rate limiter TTL counters. Not a database replacement.

**Decision**: Keep Postgres for now (Option 1). When the RAG pipeline is built, a vector DB will be introduced alongside it. Postgres can be phased out at that point if no longer needed — but removing it now would break the entire persistence layer.

---

### Outstanding Issues (as of end of session 6)
1. **Blog post screenshots** — 4 placeholders still need real screenshots inserted: homepage, Claude debugging session, comparison view, 429 error.
2. **RAG pipeline** — Next major feature. PostgreSQL stays until vector DB is introduced.
3. **Direct airline booking links** — `booking_token` in rawData, follow-up SerpAPI call not implemented.
4. **Filters** — Price slider, layover count, sort all need polish.
5. **Personal website fade-in** — Separate project, not started.

---

## Session 7 (2026-05-29)

### Context
Docker build was broken (TypeScript errors + Prisma version mismatch). User decided to rip out Prisma entirely since it was only used as a logging/storage layer and added too much Docker friction.

---

### 1. Fixed Docker TypeScript errors in comparison.job.ts

- **Problem**: `tsc` in Docker failed with "Parameter implicitly has an 'any' type" on arrow function params in comparison.job.ts.
- **Root cause**: `prisma generate` ran *after* `tsc` in the Dockerfile, so `@prisma/client` types weren't available at compile time.
- **Fix**: Moved `prisma generate` before `tsc` in the builder stage; added explicit `Flight` type annotations.
- **Files**: `packages/server/Dockerfile`, `packages/server/src/jobs/comparison.job.ts`

### 2. Fixed Prisma version mismatch at runtime

- **Problem**: `docker-entrypoint.sh` used `npx prisma migrate deploy`, which pulled Prisma 7 at runtime. Project pins `^5.13.0`. Prisma 7 dropped support for `url` in `schema.prisma`.
- **Fix attempted**: Pin to local binary, add OpenSSL, fix binary targets — each revealed a new layer of Prisma Docker complexity.

### 3. Removed Prisma entirely — replaced with raw `pg`

User decision: Prisma's Docker overhead (binary targets, OpenSSL, generate step, version pinning) wasn't worth it for a simple storage layer.

**What changed:**
- Removed `@prisma/client` and `prisma` from `packages/server/package.json`; added `pg` and `@types/pg`
- Deleted dependency on `prisma/schema.prisma` for runtime — replaced with `packages/server/schema.sql` (idempotent, IF NOT EXISTS, runs via `node dist/config/migrate.js` at startup)
- New `src/config/database.ts`: `pg.Pool` + typed `query<T>()` / `queryOne<T>()` helpers
- New `src/config/migrate.ts`: reads `schema.sql`, runs it against Postgres, exits
- New `src/types/db.ts`: TypeScript interfaces for all DB rows (DbUser, DbSearchQuery, DbFlight, DbComparison)
- Rewrote all 9 files that used Prisma: `search.job.ts`, `comparison.job.ts`, `search.service.ts`, `flight.service.ts`, `comparison.service.ts`, `bookingOptions.service.ts`, `user.controller.ts`, `health.routes.ts`
- Simplified `packages/server/Dockerfile`: no `prisma generate`, no OpenSSL install, no `.prisma` directory copy
- `docker-entrypoint.sh`: now runs `node dist/config/migrate.js` instead of `npx prisma migrate deploy`
- Updated README architecture diagram and tech stack table (Prisma → `pg` raw SQL)
- Updated INSTRUCTIONS.md with new gotchas (camelCase column quoting, DECIMAL as string, UUID generation)

**Key gotchas preserved in DB schema:**
- Column names are camelCase (Prisma legacy) — all SQL must quote them: `"searchQueryId"`, `"departureAirport"`, etc.
- DECIMAL columns returned as strings by pg — use `Number()` before arithmetic
- IDs generated with `crypto.randomUUID()` in application code

### Outstanding Issues (as of end of session 7)
1. **nginx port 80 conflict** — host machine has something on port 80; nginx container fails to start. Not introduced by this session.
2. **Blog post screenshots** — unchanged from session 6.
3. **RAG pipeline** — unchanged from session 6.
4. **Direct airline booking links** — unchanged from session 6.
5. **Filters** — unchanged from session 6.

---

## Session 8 (2026-05-30)

### Context
Three bugs identified in prior session. Two utility files (`flightComparison.ts`, `flightComparison.test.ts`) were already written. This session implemented the remaining fixes.

---

### Bug 1 — Airline filter didn't update comparison card

**Problem**: Filtering by airline in `FilterSidebar` had no effect on the "Same Airline vs Best Mix" comparison card — it kept showing server-computed prices regardless of the active filter.

**Root cause**: `SearchResultsPage` passed `latestComparison` (server-computed) directly to `ComparisonView` with no client-side recomputation when `filterStore.selectedAirlines` changed.

**Fix** (`packages/client/src/pages/SearchResultsPage.tsx`):
- Imported `computeFilteredComparison` from `../utils/flightComparison`
- Added `activeComparison` memo: when `selectedAirlines.length > 0`, calls `computeFilteredComparison(filteredOutbound, filteredReturn, latestComparison)`; otherwise passes `latestComparison` unchanged
- `ComparisonView` now receives `activeComparison` instead of `latestComparison`

---

### Bug 2 — Round-trip search mixed outbound + return flights in one list

**Problem**: EWR→SFO round-trip search showed all 38 flights (20 outbound + 18 return) in a single list. Return flights (SFO→EWR) appeared in the outbound section.

**Root cause**: `SearchResultsPage` fed `allFlights` directly into `filteredAndSortedFlights` with no direction filtering. `FilterSidebar` received `allFlights` too, so airline counts included both directions.

**Fix** (`packages/client/src/pages/SearchResultsPage.tsx`):
- Imported `splitFlightsByDirection` from `../utils/flightComparison`
- Extracted `originAirport`, `destinationAirport`, `tripType` from `searchData`
- Split `allFlights` into `outboundFlights` / `returnFlights` via `splitFlightsByDirection`
- `filteredAndSortedFlights` now filters from `outboundFlights` only
- `FilterSidebar` now receives `outboundFlights` (airline counts reflect outbound only)
- For `ROUND_TRIP` searches, a second `ResultsContainer` renders below with `filteredAndSortedReturnFlights`
- `allFlights` is still used as the ID-lookup pool for `ComparisonView` (IDs can be either direction)

---

### Bug 3a — Booking-options endpoint used 60s search rate limit

**Problem**: Clicking "View Booking Options" triggered the search rate limiter (60s window), so a second click within 60s was blocked with a 429.

**Root cause**: `flights.routes.ts` applied `serpApiRateLimit` (60s) to `/:id/booking-options`. That limiter was designed for full search queries, not per-flight booking lookups.

**Fix**:
- `packages/server/src/middleware/serpApiRateLimit.middleware.ts`: Refactored `serpApiRateLimit` into a `createSerpApiRateLimit(clientWindowSeconds)` factory. The existing `export const serpApiRateLimit = createSerpApiRateLimit(60)` preserves the search endpoint behavior.
- `packages/server/src/routes/flights.routes.ts`: Created `bookingOptionsRateLimit = createSerpApiRateLimit(5)` and applied it to `/:id/booking-options`.

---

### Bug 3b — "View Booking Options" button permanently stuck after rate-limit error

**Problem**: After a 429 from the booking-options endpoint, `bookingOptions` was set to `[]`. The button condition `bookingOptions !== null` then showed "Sellers loaded" permanently, blocking retry.

**Fix** (`packages/client/src/components/results/FlightCard.tsx`):
- `handleViewOptions`: only calls `setBookingOptions(data.options ?? [])` when `res.ok`
- On non-ok responses, sets `optionsError` only — `bookingOptions` stays `null` so the button remains clickable

---

### Tests
- `packages/server/src/middleware/serpApiRateLimit.test.ts`: Added `describe('createSerpApiRateLimit')` block (4 new tests: passes with 5s window, sets Redis EX to provided value, blocks global monthly, confirms 60s equivalent)
- `packages/client/src/test/flightComparison.test.ts`: Pre-existing tests all pass (17 tests)
- Fixed branded `IATACode` TypeScript error in test fixture parameter type

**All tests pass**: 16 server + 38 client = 54 total.

### Outstanding Issues (as of end of session 8)
1. **nginx port 80 conflict** — unchanged from session 7.
2. **Blog post screenshots** — unchanged from session 6.
3. **RAG pipeline** — unchanged from session 6.
4. **Direct airline booking links** — unchanged from session 6.
5. **Docker rebuild needed** for server-side rate limiter change: `docker compose up -d --build api`

---

## Session 9 (2026-05-30)

### Context
Four regressions from session 8 fixed: filter pre-population bug, Docker not rebuilt, window.open blank tab, RAG never ingesting data.

---

### Bug B — Docker API container rebuild

Ran `docker compose up -d --build api`. The container was still running session 7 code; session 8's `createSerpApiRateLimit(5)` for the booking-options endpoint was not live until now.

---

### Bug C — "0 of 16 flights" with no visible filter

**Fix** (`packages/client/src/pages/SearchResultsPage.tsx`):
Changed `allFlights.map((f) => f.airline)` → `outboundFlights.map((f) => f.airline)` in the `preferredAirlines` pre-population `useEffect`. The previous code matched preferred airlines against all 38 flights (both directions), so an airline present only in the return leg got added to `selectedAirlines`, but `FilterSidebar` (which shows outbound airlines only) never rendered its checkbox — leaving the user with 0 results and no way to clear the filter.

---

### Bug D — "Book on Google Flights" opens blank tab

**Fix** (`packages/client/src/components/results/FlightCard.tsx`):
Replaced `window.open(gf?.url ?? flight.bookingUrl ?? '', ...)` with a null-guarded `const url = gf?.url ?? flight.bookingUrl; if (url) window.open(url, ...)` in both the cached-options path and the fresh-fetch path. When both the booking-options API URL and `flight.bookingUrl` are null, the button now silently no-ops instead of opening a blank tab. The catch-block fallback was already guarded (`if (flight.bookingUrl) window.open(...)`).

---

### Bug A — AI Insight always "No relevant flight data found"

**Root cause:** `rag/server.py` had no HTTP ingest endpoint. `rag/ingest.py` was CLI-only (reads from CSV files on disk). ChromaDB was never populated after a search completed.

**Fix — `rag/server.py`:**
Added `POST /ingest` endpoint protected by the existing `_verify_secret` dependency. Accepts `{ search_query_id, flights: [{origin, destination, date, price, airline, duration_minutes}] }`. Converts each record to a natural-language document string, embeds with `embed()`, writes to ChromaDB via `vs_ingest()`. Returns `{ ingested: N }`.

**Fix — `packages/server/src/config/env.ts`:**
Added `RAG_URL` to the Zod schema (was in `.env` and `docker-compose.yml` but not validated). Defaults to `http://localhost:8000`.

**Fix — `packages/server/src/jobs/search.job.ts`:**
After flights are saved to Postgres and the comparison job runs, fires a POST to `${RAG_URL}/ingest` with the search's flights. Sends `x-rag-secret` header when configured. Fire-and-forget: `.catch()` logs a warning so RAG being down cannot fail the search job.

---

### Tests

All tests pass: 16 server + 38 client = 54 total (unchanged count — no new test files added this session).

### Outstanding Issues (as of end of session 9)
1. **nginx port 80 conflict** — unchanged from session 7.
2. **Blog post screenshots** — unchanged from session 6.
3. **Direct airline booking links** — unchanged from session 6.

---

## Session 10 (2026-05-31)

### Context
"Book on Google Flights" button was opening the wrong page: SerpAPI's booking token resolution always returns a round-trip tfs URL (outbound pre-selected, showing return leg picker) regardless of `type=2` in the resolution call — the token itself carries round-trip context. Also, `bookingUrl` was being baked into the DB at scrape time with stale/wrong values.

---

### 1. Fixed `bookingOptions.service.ts` — use `type: '2'` always

Changed `type: isRoundTrip ? '1' : '2'` to `type: '2'` and removed the `return_date` param and `searchQuery` lookup. Booking tokens from our scraper come from one-way searches so the resolution must also be one-way. Removed unused `isRoundTrip`, `returnDate`, `searchQuery` variables and `DbSearchQuery` import.

**Files**: `packages/server/src/services/bookingOptions.service.ts`

---

### 2. Removed `+return+` from `buildGoogleFlightsUrl`

The fallback `bookingUrl` was built with `+return+DATE` suffix which caused Google Flights to open in round-trip mode showing SFO→EWR when clicking on an EWR→SFO flight. Removed the `returnDate` parameter entirely from `buildGoogleFlightsUrl`, `normalizeFlight`, and `fetchOneWay`. Also removed `returnDateForUrl` param from `fetchOneWay` call in the scraper.

**Files**: `packages/server/src/scrapers/google-flights/index.ts`

---

### 3. Simplified `FlightCard.tsx` — "Book on Google Flights" no longer uses SerpAPI URL

Removed `specificGoogleUrl` and `fetchingGoogleUrl` state. `handleBookingClick` now just opens `flight.bookingUrl` directly. The booking options API (for seller prices) is fully decoupled from the Google Flights button. `fetchAndCacheOptions` no longer sets `specificGoogleUrl`.

**Root cause discovered**: Even after fixing `type: '2'`, SerpAPI's `search_metadata.google_flights_url` from booking token resolution was still returning a round-trip tfs (the token encodes round-trip context from the original itinerary). The only reliable fix is to not use SerpAPI's resolved URL for the button.

**Files**: `packages/client/src/components/results/FlightCard.tsx`

---

### 4. Built Google Flights tfs URL from scratch

SerpAPI's booking token always produces a round-trip tfs regardless of `type=2`. The fix: construct the one-way tfs protobuf ourselves from the flight data we already have (airline code, flight number, airports, departure date).

**New file: `packages/server/src/utils/googleFlightsUrl.ts`**
- `buildGoogleFlightsTfsUrl(dep, arr, date, airlineCode, flightNum)` — constructs a one-way Google Flights deep-link tfs URL using protobuf encoding reverse-engineered from the community (fast-flights, AWeirdDev/flights)
- `buildGoogleFlightsSearchUrl(origin, dest, date)` — generic fallback
- `deriveBookingUrl(flightNumber, dep, arr, departureTime)` — parses airline code from "UA 1343" format, returns tfs URL or search URL fallback

**Protobuf structure**: encodes dep airport (field 1), date (field 2), arr airport (field 3), airline (field 5), flight number (field 6) in a one-way leg. Verified against known SerpAPI tfs output.

---

### 5. `bookingUrl` no longer cached in DB — derived fresh on every API response

**Problem**: `bookingUrl` was baked into the DB at scrape time. Old searches had stale/wrong URLs. Users had to re-search to get fixed URLs.

**Fix**:
- `packages/server/src/services/flight.service.ts`: Added `withBookingUrl()` mapper that calls `deriveBookingUrl()` on every flight before returning it to the client. Applies to both `getFlights()` and `getFlightById()`. The DB value is ignored.
- `packages/server/src/scrapers/google-flights/index.ts`: `normalizeFlight` now sets `bookingUrl: null` (scraper no longer computes it). Inline protobuf code removed from scraper — re-exported from `utils/googleFlightsUrl`.

This means all flights — old and new — get correct tfs deep-links automatically. No migration needed.

---

### Tests

All tests pass: 20 server + 38 client = 58 total (+3 new server tests).

New tests in `packages/server/src/scrapers/google-flights/index.test.ts`:
- `buildGoogleFlightsTfsUrl` — verifies tfs is valid base64url, decoded binary contains all flight identifiers
- `deriveBookingUrl` — tfs URL for parseable flight number; search URL fallback for unparseable
- `normalizeFlight bookingUrl` — verifies scraper sets `null` (not cached)

### Outstanding Issues (as of end of session 10)
1. **nginx port 80 conflict** — unchanged from session 7.
2. **Blog post screenshots** — unchanged from session 6.
3. **tfs URL real-world validation** — the protobuf format is reverse-engineered; if Google changes the tfs schema, URLs will silently break. Monitor post-deploy.

---

## Session 11 (2026-06-29)

### Context
After the round-trip/one-way comparison redesign shipped (session prior, `0d35a32`), the app overall still "looked extremely basic and like the old one." Full visual overhaul requested: dark theme (Linear + Vercel/Raycast aesthetic), bold animated entrance on the landing page, subtle motion elsewhere. Full design/inventory work was done in a prior plan-mode session and handed off — see `HANDOFF_DARK_THEME_REDESIGN.md` in this folder for the complete per-file before/after rationale. This session executed that handoff.

---

### 1. Foundation — `tailwind.config.js` + `globals.css`

Replaced the blue `brand` Tailwind scale with violet/indigo (`50/100/300/400/500/600/700/900`); added `fadeInUp` and `blobDrift` keyframes/animations for the landing hero. `globals.css` base styles flipped to dark: `body` → `bg-black text-zinc-100`; `.card` → `bg-zinc-900 ring-1 ring-white/5` (dropped the shadow — doesn't register on near-black); `.btn-secondary` → `bg-zinc-800` family; `.input-field` → `bg-zinc-900 border-zinc-700`. Added `input[type=date/time] { color-scheme: dark }` so native date/time picker icons aren't dark-on-dark.

**Files**: `packages/client/tailwind.config.js`, `packages/client/src/styles/globals.css`

---

### 2. Semantic-color flip for status badges

Every `bg-{color}-50 text-{color}-700 border-{color}-200` badge (direct/layover, savings pills, error boxes) flipped to `bg-{color}-500/10 text-{color}-400 border-{color}-500/20` for legibility against near-black surfaces.

**Files**: `LayoverBadge.tsx`, `MixAndMatchSection.tsx`, `RoundTripBundle.tsx`, `ErrorBoundary.tsx`, `SearchForm.tsx`, `AdvancedFilters.tsx`

---

### 3. `HomePage.tsx` — bold animated hero

Full rewrite: `bg-black` base with 3 absolutely-positioned blurred gradient blobs (`animate-blobDrift`), staggered `animate-fadeInUp` entrance for headline → subtext → form. Dropped the ✈️ emoji (didn't fit the new aesthetic tier — plain wordmark for now). Pure CSS, no new animation dependency. Removed the extra glass-panel wrapper around `SearchForm` to avoid a double border with `SearchForm`'s own (now dark) `.card` — it sits directly on the gradient blobs instead.

**Files**: `packages/client/src/pages/HomePage.tsx`

---

### 4. Mechanical gray→zinc pass — everything else

Same pattern across the rest of the app, no structural/logic changes: `text-gray-900→text-zinc-100/white`, `text-gray-700→text-zinc-300`, `text-gray-500/400→text-zinc-400/500`, `border-gray-200/300→border-zinc-800/700`, `bg-white→bg-zinc-900`, `bg-gray-50/100→bg-zinc-800/900`. Header got a glassy `bg-black/80 backdrop-blur-xl` treatment and also dropped its ✈️ emoji.

**Files**: `Header.tsx`, `Footer.tsx`, `AirportInput.tsx`, `DatePicker.tsx`, `PassengerSelector.tsx`, `CabinClassSelector.tsx`, `FilterSidebar.tsx`, `FlightTimeline.tsx`, `PriceTag.tsx`, `ResultsContainer.tsx`, `AIInsightCard.tsx`, `ComparisonTable.tsx`, `ComparisonView.tsx`, `EmptyState.tsx`, `LoadingSpinner.tsx`, `Tooltip.tsx`, `SearchResultsPage.tsx`, `SavedSearchesPage.tsx`, `SettingsPage.tsx`

---

### 5. `PriceComparisonChart.tsx` — hardcoded hex + grid legibility

`#16a34a → #34d399` (emerald-400), `#3b82f6 → #8b5cf6` (new brand-500) for the bar fills — these are raw hex in JS, not Tailwind classes, so they don't pick up CSS-level theme changes. Added explicit `stroke="#27272a"` on `CartesianGrid` and `fill="#a1a1aa"` on axis ticks — previously unstyled/default, would have rendered near-invisible on black.

**Files**: `packages/client/src/components/comparison/PriceComparisonChart.tsx`

---

### 6. `FlightCard.tsx` — lazy-mode booking link reorder

In `mode="lazy"` (the big browsable outbound/return list), promoted "View booking options" above "Book on Google Flights" (relabeled "Or check Google Flights"), matching the visual hierarchy eager mode already had. Pure JSX reorder + label/color change — `useBookingOptions`/`fetchNow` click-to-fetch behavior is untouched, no new network calls.

**Files**: `packages/client/src/components/results/FlightCard.tsx`

---

### Tests
Not yet run this session — see Outstanding Issues below.

### Outstanding Issues (as of end of session 11)
1. ~~Verification pending~~ — done in session 12.
2. ~~`airlineBadge.ts` left unchanged~~ — fixed in session 12 (was a real legibility bug, not just an aesthetic choice).
3. ~~`DESIGN.md` not updated for dark palette~~ — superseded by `packages/client/DESIGN.md` in session 12.
4. nginx port 80 conflict, blog post screenshots, tfs URL real-world validation — unchanged from prior sessions.

---

## Session 12 (2026-06-29)

### Context
User reported three things after session 11: (1) the "See full price breakdown" disclosure looked ugly (bare browser-default `<details>`), (2) booking links — round-trip gave a generic Google Flights link instead of pre-selecting both legs, and one-way still dropped into the round-trip "choose your return" step, (3) the dark redesign still "looked like AI slop" — flat, no real depth system, motion that wasn't actually visible, and a filter sidebar stretching the full page height. The user also flagged a recurring process problem: I had described session 11's redesign as having "glassy blur panels" that were never actually in the code — a memory/drift error, not a real description of the shipped code. They asked for a durable fix to that pattern, not just an apology.

---

### 1. Anti-drift guardrail (process fix, not code)

Added a **Critical Rule** to `.claude/instructions/CLAUDE.md` and a matching note in `INSTRUCTIONS.md`: never reason about code from memory — re-read actual files every session before planning/editing, and after implementing anything called a "design," re-open the changed files and verify they match the written spec before reporting done. Also saved as a `feedback` memory (`feedback_reread_code_dont_recall`) outside the repo for cross-session persistence, and corrected the stale `project_booking_link_ceiling` memory (see #2 below).

**Files**: `.claude/instructions/CLAUDE.md`, `.claude/instructions/INSTRUCTIONS.md`

---

### 2. Fixed the actual booking-URL protobuf bug (was never a platform constraint)

A prior session had concluded the one-way "choose your return" behavior was an unfixable Google Flights platform quirk. It wasn't — decoding two real reference URLs the user captured (one correct round-trip, one correct one-way) showed **trip type is encoded in field 19, not field 2**: one-way ends `field19=2`, round-trip ends `field19=1`, and **field 2 is `2` in both**. Our builders had this backwards (one-way set `field19=1`, causing Google to show the return-picker; round-trip set `field2=1`, which Google can't parse, causing the generic-link fallback) and were also missing field 16 (a `{f1=maxUint64}` "no-limit" sentinel present on every real Google-issued tfs). A test had asserted the wrong model (`081c1001` = "field2=1 = round trip") and locked the bug in.

**Fix**: added a `NO_LIMIT_F16` byte constant and corrected `pbVarint(19, ...)`/`pbVarint(2, ...)` in all three builders (`buildGoogleFlightsTfsUrl`, `buildGoogleFlightsTfsUrlFromSegments`, `buildGoogleFlightsRoundTripTfsUrl`). Leg/segment encoding (`buildLegBytes`) was untouched — already byte-verified separately. Verified the fix by generating both URL types and diffing hex byte-for-byte against the user's two reference URLs — exact match, including field 16.

**Files**: `packages/server/src/utils/googleFlightsUrl.ts`, `packages/server/src/scrapers/google-flights/index.test.ts` (rewrote the wrong assertions, added field-19 checks to the one-way tests)

---

### 3. Full design-system rebuild — `packages/client/DESIGN.md`

Session 11's "redesign" was a recolor (swap gray for zinc), not a real design system — no depth model, no real type scale, motion too subtle to perceive, and at least two leftover bugs from incomplete passes (`ComparisonView.tsx` still had `text-gray-900` on one of its two "Your Trip" headings despite a prior "all occurrences replaced" claim; `FlightCard.tsx`'s eager-mode seller button was still `bg-gray-900 hover:bg-gray-800`, a light-theme dark-button trick that's nearly invisible against a dark-theme card).

Pulled the full Linear and Runway `DESIGN.md` specs from `voltagent/awesome-design-md` (24KB and 14KB respectively — concrete token ladders and component anatomy, not just a color summary) and synthesized a real system: **Linear's engineered structure** (four-step surface ladder — canvas/surface-1/surface-2/surface-3 — depth via background lift + 1px hairline borders, zero shadows) **+ Runway's editorial voice** (single typeface used at every size, tight negative-tracked headlines, uppercase eyebrow labels as the only navigational structure). Purple stays as the one accent — the user clarified they hadn't reacted against purple, they'd objected to it barely being used; the new system mandates the accent appear in 3+ places per screen (CTA, focus ring, a data-driven highlight like the recommended option's border).

Wrote `packages/client/DESIGN.md` as the literal source of truth — every token in it (canvas/surface-1/surface-2/surface-3, hairline/hairline-strong, ink/ink-muted/ink-subtle/ink-cool/ink-faint, brand-400/500/600/700) is a real Tailwind class added to `tailwind.config.js`, not an aspiration, specifically so future sessions (including me) can check code against it rather than trust a claim. Deleted the stale light-theme `components/comparison/DESIGN.md` it supersedes.

**New tokens** (`tailwind.config.js`, `globals.css`): `canvas`/`surface-{1,2,3}`/`hairline`/`hairline-strong`/`ink-*` color scale; `Inter` (sans) + `JetBrains Mono` (mono, for flight numbers/airport codes/durations/table numbers) loaded via Google Fonts in `index.html`; `.text-display`/`.text-h1`/`.text-h2`/`.text-eyebrow` utility classes; `.card-hover` (surface lift + border step + 1px translate on hover, replacing shadow-based hover entirely); a static low-opacity grid texture on `body` for engineered texture without motion; a `prefers-reduced-motion` media query disabling all animation/transition durations.

**Re-engineered every component** (not just recolored): `RoundTripBundle.tsx` (the hero) now lifts to depth-2 + accent-tinted eyebrow when it's the recommended option, uses `.text-display` for the price, refined the CTA from a full-height neon slab to a proper `rounded-lg` Linear-style button; `ComparisonView.tsx` fixed the leftover `text-gray-900` bug, restyled the bare `<details>` disclosure with a rotating chevron and a proper surface-1 body, added staggered entrance; `FilterSidebar.tsx` got `self-start sticky top-20` — **this was the literal bug from the user's screenshot**: the parent flex container's default `align-items: stretch` was forcing the sidebar to the height of the results column; eyebrow-style section labels, no more dead trailing space; `FlightCard.tsx` fixed the invisible eager-mode button and reordered/relabeled consistent with the rest; `airlineBadge.ts` flipped from light-tint-on-dark (a real legibility bug — light pastel chips on near-black cards) to the same dark-tint pattern used everywhere else; `HomePage.tsx` rebuilt with one large ambient glow with real travel distance (140px, vs. session 11's sub-40px "drift" that wasn't perceptible) and an opacity pulse, plus an editorial landing headline (the question itself, not a redundant giant repeat of the brand name already in the header). Every list/card/section now has a staggered `fadeInUp` entrance, including the search results page, which previously had zero animation.

**Files**: `packages/client/DESIGN.md` (new), `tailwind.config.js`, `src/styles/globals.css`, `index.html`, and essentially every component in `src/components/` and `src/pages/` — see the diff for the full list; the pattern is described once above rather than enumerated per-file.

---

### Tests
`tsc --noEmit` clean on both packages. 41 client tests + 30 server tests pass (server suite includes the rewritten booking-URL assertions).

### Outstanding Issues (as of end of session 12)
1. **Visual verification not done by me** — per explicit user instruction this session ("don't test the whole website yourself, I will npm run dev and check myself"), I did not start the dev server or screenshot the app. The user is verifying visually themselves.
2. **`EmptyState`'s default ✈️ icon and `🔖`/`🔍` icons on other pages** left as-is — large single emoji as an empty-state glyph isn't a design-system violation (unlike the brand-mark emoji removed in session 11), just a content choice.
3. **`AdvancedFilters`' expand/collapse** fades in on mount but has no exit transition (instant unmount on collapse) — a minor asymmetry, not fixed, to avoid introducing a height-transition hack or a new animation dependency for marginal gain.
4. nginx port 80 conflict, blog post screenshots, tfs URL real-world validation (now more confident given the field 19/2 fix was verified byte-for-byte against real captured URLs, but Google could still change the schema) — unchanged from prior sessions.

---

## Session 13 (2026-06-29)

### Context
After session 12 shipped, the user reported six issues from live use: (1) flight times disagreed with Google's; (2) mix-and-match's "Book on Google Flights" link hid behind a loading spinner while other cards linked instantly; (3) AI insight said "insufficient data" for routes with no search history (e.g. YYZ→LAS); (4) the hero always showed same-airline even when mixing was cheaper; (5) return flights required scrolling past the entire outbound list; (6) the user wanted a tasteful "liquid glass" treatment plus more motion. All root causes were re-verified by reading the actual code this session (per the session-12 guardrail), not recalled from memory. Step 0, per explicit instruction: commit and push the session-12 working tree to `main` first, no `Co-Authored-By` trailer.

---

### 1. Timezone bug — flight times now match Google

Root cause: `normalizeFlight` (`packages/server/src/scrapers/google-flights/index.ts`) did `new Date(serpApiLocalString)` on SerpAPI's airport-**local** wall-clock strings (no timezone marker). On a non-UTC server, `new Date()` applied the server's own offset; the client's `formatTime` then reads `getUTCHours()` (by design — see its comment), so the displayed clock silently shifted by the server's UTC offset. A tfs deep-link only ever encodes flight#+date+airport, never times, so Google always shows live, correct times — our snapshot just wasn't parsed to match.

**Fix**: added `parseAirportLocalTime(s)`, which regex-extracts the literal Y/M/D/H/M digits (handles both the real API's `"YYYY-MM-DD HH:MM"` and this repo's `"YYYY-MM-DDTHH:MM:SS"` mock format) and pins them to UTC via `Date.UTC(...)`, so `getUTCHours()` reproduces the original digits on any server timezone. Applied to `departureTime`, `arrivalTime`, and the layover-gap estimate. Added a test asserting known SerpAPI strings → expected `getUTCHours()`/`getUTCMinutes()`, and confirmed it holds under `TZ=America/Los_Angeles` and `TZ=Asia/Tokyo`.

Also added a "Prices as of {scrapedAt}" caption to the hero (`RoundTripBundle.tsx`, via new `formatScrapedAt` in `formatters.ts`) — cheap honesty about snapshot-vs-live price drift, which is real and not a bug.

**Files**: `packages/server/src/scrapers/google-flights/index.ts`, `index.test.ts`, `packages/client/src/utils/formatters.ts`, `packages/client/src/components/comparison/RoundTripBundle.tsx`

---

### 2. Eager-mode booking link no longer hides behind the loading skeleton

`FlightCard.tsx`'s eager branch only rendered the Google Flights fallback link in the "not loading AND no sellers" case — while `loadingOptions` was true, neither the seller buttons nor the Google link rendered, just a bare skeleton. Restructured so the skeleton/seller-buttons render independently and the Google Flights link (`flight.bookingUrl`, available immediately, no fetch needed) always renders regardless of loading state — matching how the lazy branch already worked.

**Files**: `packages/client/src/components/results/FlightCard.tsx`

---

### 3. Hero now shows whichever option is actually cheaper

`ComparisonView.tsx` hardcoded `RoundTripBundle` as the hero and `MixAndMatchSection` as the permanently-demoted alternative, regardless of `comparison.recommendedOption`. Gave `MixAndMatchSection` a `hero` prop (surface-2 panel, `.text-display` price, accent eyebrow — the same visual weight `RoundTripBundle` already had) and made `ComparisonView` swap which one renders first based on `isRoundTripCheapest`, with the divider copy flipping too ("or mix airlines" vs. "or same airline"). The no-return single-leg case is unchanged.

**Files**: `packages/client/src/components/comparison/ComparisonView.tsx`, `MixAndMatchSection.tsx`

---

### 4. Outbound/Return tabs

`SearchResultsPage.tsx` stacked the full outbound list above the full return list, requiring a long scroll on round trips. Replaced with a segmented `[ Outbound (n) | Return (n) ]` pill control (local `useState`, reset to "outbound" on a new `searchQueryId`) showing one direction at a time; one-way searches are unaffected (no tabs, just the outbound list). `ResultsContainer` keeps its staggered entrance — switching tabs remounts it (different `key`), which retriggers the animation, which reads as intentional rather than as a bug.

**Files**: `packages/client/src/pages/SearchResultsPage.tsx`

---

### 5. Real historical fare data for the AI insight (US DOT BTS seed)

The user wanted real public data, not synthetic rows. Added `rag/seed_dot_airfares.py`, a one-time script that fetches the US DOT BTS Consumer Airfare Report (Table 1a) via the Socrata CSV API and writes `data/flights/dot_airfares.csv` in `rag.ingest`'s schema.

**Plan-vs-reality correction made mid-implementation**: the original plan assumed the dataset had `airport_1`/`airport_2` IATA columns. It doesn't — the real schema (checked live via the Socrata endpoint) only has `city1`/`city2` metro-area names (e.g. `"New York City, NY (Metropolitan Area)"`). Since `rag/server.py`'s `/query` does an *exact* metadata match on `origin`/`destination` against the IATA codes the app actually sends, city-name strings would never have matched anything — the seed would have silently produced zero usable grounding. Built `CITY_TO_IATA`, a ~150-entry mapping from this dataset's exact metro-name strings to each metro's primary airport; unmapped/uncertain metros are skipped and logged, never guessed.

Other fixes made while actually running this (not just writing it): `rag/vectorstore.py`'s `ingest()` raised `Batch size of 40000 is greater than max batch size of 5461` from Chroma — added internal chunking (`_MAX_BATCH_SIZE = 5000`) so any caller, not just this seed, can pass arbitrarily large ingests. Ran the full pipeline for real: 20,000 raw DOT rows → 40,000 seeded rows (both directions) → ingested successfully; spot-checked LAX→JFK returns a real grounded answer ("$320 is low compared to the average prices observed on this route"), and confirmed YYZ→LAS (not in this US-only dataset) honestly still returns "insufficient data" rather than fabricating one. Added `rag/tests/test_seed_dot_airfares.py` (functional, no mocked HTTP — exercises the real transform logic: directionality, IATA mapping, date/duration derivation, skip behavior).

**Files**: `rag/seed_dot_airfares.py` (new), `rag/tests/test_seed_dot_airfares.py` (new), `rag/vectorstore.py`, `README.md`, `.claude/instructions/INSTRUCTIONS.md`

---

### 6. Rejected true "liquid glass"; shipped surface-ladder polish + motion instead

User asked for an Apple-style liquid-glass card treatment and wanted it researched, not guessed. Two independent findings killed it: (1) **web viability** — true refraction (SVG `feDisplacementMap` as `backdrop-filter`) is Chromium-only, breaks in Safari/Firefox, is GPU-heavy, and fails text contrast — disqualifying for a text-dense flight UI; (2) **design-peer research** — read the actual design systems of this app's own stated influences (Linear, Raycast, Runway) plus Apple itself (via `awsome-mod/awesome-design-md`, a cloned reference repo, not committed) and found **zero glass on content cards** in any of them. Linear/Raycast carry their "featured/active" state purely via the surface-color ladder (exactly what this app's `DESIGN.md` already specifies); even Apple, who invented the effect, restricts `backdrop-filter: blur` on the web to functional sticky chrome, never a card.

Shipped instead: `backdrop-blur-md` on the sticky `Header` only (the one Apple-validated, cross-browser-safe usage); a CTA hover micro-scale (`hover:scale-[1.015]`, paired with the existing `-translate-y-px` lift) on `.btn-primary` and the brand-600 booking CTAs; a shimmer-sweep `.skeleton` class (replacing flat `animate-pulse`) on every loading placeholder. Updated `DESIGN.md` to document the sticky-header exception and why it isn't a reversal of "no glass on cards" — the rule there is unchanged, just clarified with the research that backs it.

**Files**: `packages/client/DESIGN.md`, `packages/client/src/components/layout/Header.tsx`, `packages/client/src/styles/globals.css`, `packages/client/tailwind.config.js`, `packages/client/src/components/comparison/RoundTripBundle.tsx`, `packages/client/src/components/results/FlightCard.tsx`, `packages/client/src/components/comparison/AIInsightCard.tsx`

---

### Tests
Server: 32 tests pass (`tsc --noEmit` clean), including the new timezone tests verified under both `TZ=America/Los_Angeles` and `TZ=Asia/Tokyo`. Client: 41 tests pass (`tsc --noEmit` clean). RAG: 7 pytest tests pass (5 new for the seed script, 2 pre-existing retrieval-scoping tests), plus a real (non-mocked) end-to-end run of the seed→ingest→query pipeline.

### Server-side deployment verification (2026-06-29, same day)

Brought up the full `docker compose` stack on `sparsh@server.local` (the user's eventual nginx + Cloudflare host) to verify session-13 end-to-end, not just locally. Findings, in order:

1. **Colima, not Kubernetes** — the server has no running k8s cluster. Lima has the *capability* to create one (`limactl create --name=k3s template:k3s`) but none exists; Docker is provided by Colima, which was stopped and started (`colima start --cpu 4 --memory 8 --disk 100`).
2. **All three images build clean**: `flightselect-api` (346MB), `flightselect-nginx` (76MB, includes the client `vite build`), `flightselect-rag` (9GB — torch/sentence-transformers/chromadb). `docker compose up -d` brought up all 6 containers healthy on the first try.
3. **Root cause of the long-standing "nginx port 80 conflict"**: a *separate, native macOS nginx* (`nginx/1.31.1`, started independently of this project, owned by a process invisible to non-root `lsof`) already squats on port 80 on this server and returns a static "Server is running" placeholder for every request — intercepting traffic before it ever reaches the dockerized stack. Not touched (unknown what else depends on it); worked around for verification by adding a local-only `docker-compose.override.yml` (not committed) remapping nginx to host port 8080.
4. **Real bug found and fixed**: `packages/client/src/utils/constants.ts` defaulted `API_BASE_URL` to the absolute `http://localhost:3001/api`, and the server's `packages/client/.env` pinned the same — baked into the static bundle at `vite build` time. Any browser not on `localhost` itself got CORS-blocked trying to reach the API directly. Fixed to default to the relative path `/api`, which Vite's dev-server proxy and nginx's prod proxy both already handle same-origin with no CORS involved (`packages/client/src/utils/constants.ts`, `packages/client/.env.example`). Commit `4b2552c`.
5. **Real bug found and fixed**: the session-13 "Prices as of …" scrapedAt caption (Part 1) was wired into `RoundTripBundle.tsx` only. Once Part 3 made `MixAndMatchSection` capable of being the hero, a mix-and-match-cheaper search showed the caption under the *demoted* round-trip card and nowhere on the actual hero. Added the same caption to `MixAndMatchSection`'s `hero` state. Commit `02a4b56`.
6. **Six-point visual checklist — confirmed via Playwright against the live deployed page** (`http://server.local:8080`, search JFK↔LAX round trip, `recommendedOption: "ONE_WAY"` — a real case where mixing airlines is cheaper, $353 vs $383):
   - Cheaper option (Mix & Match) renders as the `surface-2` hero with "Best price"; round trip demoted below "OR SAME AIRLINE" — confirmed visually.
   - "Prices as of {scrapedAt}" caption under both hero and demoted price — confirmed visually (after fix #5).
   - Outbound (28) / Return (25) pill tabs, active tab styled `surface-2` + `text-brand-400`, switching works without console errors — confirmed visually and via `getByRole`.
   - Sticky header frosting — confirmed via computed style: `backdrop-filter: blur(12px)`, `background-color: rgba(8, 9, 10, 0.8)`, `position: sticky`. Exactly matches `DESIGN.md`.
   - Skeleton shimmer — confirmed via computed style on `.skeleton` elements mid-fetch: `animation-name: shimmer` (4 elements during a delayed booking-options fetch).
   - CTA hover micro-scale — confirmed via computed style: `transform: none` → `matrix(1.015, 0, 0, 1.015, 0, -1)` on hover (scale 1.015 + translateY(-1px), exactly as specified).
7. **Separate, pre-existing issue noted but not fixed**: the AI Insight card shows "Unable to generate a response from the local model." RAG retrieval itself works correctly (`Retrieved 5 documents` for JFK→LAX, confirming the session-13 DOT seed data is reachable) — the failure is downstream, in LLM generation: `rag/config.py` defaults `OLLAMA_MODEL` to `qwen2.5:1.5b`, which isn't pulled on this server (only `gemma3:4b` and `nomic-embed-text` are). This is a per-server model-availability mismatch, not a code bug — left for the user to resolve (pull `qwen2.5:1.5b`, or set `OLLAMA_MODEL=gemma3:4b` in `.env`) since it's their model/quality tradeoff to make.

### Outstanding Issues (as of end of session 13)
1. The native macOS nginx squatting on port 80 (item 3 above) is a real blocker for the user's planned nginx + Cloudflare hosting and needs their decision: stop/reconfigure the native service, or have the dockerized nginx own a different port behind whatever fronts port 80/443.
2. The Ollama model-name mismatch (item 7 above) — user's call on which model to standardize on.
3. Items 2–4 from session 12's outstanding list are unchanged (EmptyState emoji icons, AdvancedFilters' missing collapse exit transition, blog post screenshots, tfs real-world validation).
4. The DOT BTS seed's `CITY_TO_IATA` table covers ~150 of the dataset's ~170 distinct metro areas — a handful of very small regional markets were left unmapped (skipped, not guessed) rather than risk a wrong IATA code.

---

## Session 14 (2026-06-30)

### Context
The user tested session 13 live (their own EWR↔LAS searches) and reported four issues, each re-verified by reading the actual code or live API/page data before planning a fix: (1) no date shown anywhere on the results page, only times; (2) the hero only ever shows one specific flight when several tie at the same price, with no hint there are alternatives; (3) the "flexible dates" (+/- N days) toggle did nothing — confirmed live, every returned flight was on exactly the requested date despite `flexibleDateRangeDays` being set; (4) no multi-city trip support at all, needed for the user's real itinerary (EWR↔LAS Jul 6–19, then EWR↔LAS Jul 27–Aug 13). For (4), the user explicitly asked for an Expedia-style system (add N one-way legs) rather than the smaller "just run two searches" alternative, plus flagged a future (not-this-session) idea: searching a ~100mi radius of an airport to find the true cheapest fare across nearby airports.

### 1. Dates now shown everywhere
Added `formatFlightDate` (UTC-pinned, same constraint as `formatTime` — the date digits are airport-local, not a real instant) to `formatters.ts`. `FlightTimeline.tsx` now shows the date under each departure/arrival time (necessary, not cosmetic, once flexible dates and multi-city can return flights spanning different days). `ComparisonView.tsx`'s "Your Trip" header gets a route + date-range subtitle derived from the actual chosen flights, not the raw search request.

**Files**: `packages/client/src/utils/formatters.ts`, `packages/client/src/components/results/FlightTimeline.tsx`, `packages/client/src/components/comparison/ComparisonView.tsx`

### 2. Tied-price alternatives surfaced in the hero
`comparison.job.ts` picks the cheapest flight per leg via a stable sort with no tiebreaker and no count of how many flights tied at that price — confirmed live (7 United flights all at $249, hero showed only one). No backend change needed: the client already fetches the full flight list, so a new `countTiedAtPrice` helper (`utils/flightComparison.ts`) computes the count client-side and a small `+N more at this price` hint renders next to the leg price in `RoundTripBundle`, `MixAndMatchSection`, and `FlightCard`.

**Files**: `packages/client/src/utils/flightComparison.ts`, `packages/client/src/components/comparison/RoundTripBundle.tsx`, `MixAndMatchSection.tsx`, `packages/client/src/components/results/FlightCard.tsx`, `packages/client/src/components/comparison/ComparisonView.tsx`, `packages/client/src/pages/SearchResultsPage.tsx`

### 3. Flexible dates actually search a date range now
Root cause (confirmed by reading the code, not assumed): `flexibleDates`/`flexibleDateRangeDays` were loaded from the SearchQuery in `search.job.ts` and then never referenced again — dead code, not a filtering bug. Added `buildCandidateDatePairs`, which varies departure and return independently (each held fixed at its originally-requested date) — O(4·rangeDays+1) scraper calls instead of the full O((2·rangeDays+1)²) grid, server-side-clamped to a max of 5 days regardless of what's stored, since each day directly multiplies live scraper cost. Verified live: a ±2-day search on EWR↔LAS returned outbound flights spanning all 5 candidate dates (Jul 4–8) and return flights spanning all 5 (Jul 17–21).

**Files**: `packages/server/src/jobs/search.job.ts`, `search.job.test.ts` (4 new tests, including an exact-date-list assertion)

### 4. Expedia-style multi-city trips
The largest piece of this session, scoped per the user's explicit direction.

- **Data model**: `TripType.MULTI_CITY` added; a new `SearchLeg` table (`schema.sql` + `prisma/schema.prisma`, kept in sync though only `schema.sql` runs at runtime via the api container's auto-migrate-on-boot entrypoint) — necessary as a real table, not a JSON column, because a trip can repeat the same airport pair on different dates (confirmed: the user's own trip has EWR→LAS twice), so flights can't be disambiguated by `(origin, destination)` alone the way the 2-leg flow does. `Flight.searchLegId` (nullable FK) tags which leg a flight belongs to. `Comparison` gained `legFlightIds`/`multiCityTotalPrice` columns and a `MULTI_CITY` `RecommendedOption` value; `oneWayTotalPrice` relaxed to nullable since multi-city comparisons don't populate it.
- **Backend orchestration**: `search.job.ts` loops legs (one one-way scrape per leg, reusing the same per-task mechanism Part 3 added for date candidates) instead of a single departure+return call. `comparison.job.ts` picks the cheapest flight per leg and sums — simpler than the round-trip-vs-mix tradeoff, no airline-bundling decision needed.
- **Booking link — verified against a real captured URL, not guessed**: drove a real headless browser through Google Flights' own multi-city UI (switched trip type, filled 3 legs via keyboard-driven autocomplete after several rounds of fighting Google's DOM — a plain click landed on the wrong element and silently swapped two fields before keyboard-only selection proved reliable), captured the actual issued `tfs` URL, and hand-decoded its protobuf. This caught a real bug before it shipped: trip-type field 19 is **3** for multi-city, not **1** (round-trip) as a naive extrapolation from the existing 2-leg builder would have produced. `buildGoogleFlightsMultiCityTfsUrl` (`googleFlightsUrl.ts`) generalizes the existing per-leg byte-builder (unchanged, already verified in an earlier session) to N repeated leg entries with the now-confirmed field-19 value; a new test decodes the generated tfs and asserts on it. A `/flights/multi-city-booking-url` endpoint mirrors the existing round-trip one.
- **Frontend**: exposed the trip-type selector for the first time — `SearchForm.tsx` was previously hard-coded to `ROUND_TRIP` with the selector never shown to users at all. Multi-city mode swaps in a new `MultiCityLegEditor` (add/remove up to 6 legs, reusing the existing `AirportInput`/`DatePicker` per row rather than new pickers). Results page renders a dedicated N-leg view: a `MultiCityBundle` hero (combined total price, one row per leg, one combined Google Flights CTA) and "Flight 1..N" tabs generalizing the session-13 Outbound/Return pill pattern.
- **Noted for later, not built**: the user's "eventually" idea of a ~100mi nearby-airport-radius search. `SearchLeg` deliberately stores a single `originAirport`/`destinationAirport` per leg as plain IATA strings — simple to extend later (e.g. an `alternateAirports: string[]` column) without a redesign, not worth speculative complexity now.

**Live end-to-end verification** on `sparsh@server.local` with the user's actual trip (EWR↔LAS Jul 6–19, Jul 27–Aug 13, 4 legs): all 4 legs correctly stored and scraped (56 real flights, correctly tagged to their leg via `searchLegId`), comparison computed a real $786 total across the 4 cheapest legs, the combined booking URL decoded to field 19 = 3 with 4 leg entries (including real connecting-flight segments via MCO/DFW layovers), and the actual `SearchForm` UI (trip-type pills, leg editor, disabled-until-valid submit button) rendered and behaved correctly with zero console errors.

**Files**: `packages/shared/src/enums.ts`, `types.ts`, `schemas.ts`; `packages/server/schema.sql`, `prisma/schema.prisma`, `src/types/db.ts`, `src/services/search.service.ts`, `src/jobs/search.job.ts`, `src/jobs/comparison.job.ts` (+ test), `src/utils/googleFlightsUrl.ts` (+ new test file), `src/services/flight.service.ts`, `src/services/comparison.service.ts`, `src/controllers/flights.controller.ts`, `src/routes/flights.routes.ts`; `packages/client/src/stores/searchStore.ts`, `src/components/search/SearchForm.tsx`, `MultiCityLegEditor.tsx` (new), `src/components/comparison/MultiCityBundle.tsx` (new), `src/pages/SearchResultsPage.tsx`, `src/api/search.api.ts`, `comparison.api.ts`, `flights.api.ts`, `src/hooks/useMultiCityBookingUrl.ts` (new)

### Tests
Server: 41 tests pass (`tsc --noEmit` clean, production `tsc` build clean) — 4 new flexible-dates tests, 2 new multi-city comparison tests, 3 new tfs-decode tests. Client: 41 tests pass (`tsc --noEmit` clean, production `vite build` clean).

### Other fixes made while implementing
While typing `SearchRequest.legs` through to the results page, discovered and fixed several client API functions (`getSearch`, `getComparison`, `getComparisonsByQuery`) that had no return-type annotation and were silently typed `any` throughout the app — not a session-14 bug exactly, but a real type-safety gap that the new multi-city fields would have silently fallen through. Now properly typed against the shared `SearchQuery`/`Comparison`/`ComparisonResponse` interfaces.

### Outstanding Issues (as of end of session 14)
1. Items 1–4 from session 13's outstanding list are unchanged (native macOS nginx on port 80, Ollama model mismatch, EmptyState/AdvancedFilters minor items, DOT BTS metro coverage gap).
2. ~~Nearby-airport-radius search (~100mi)~~ — built in session 15.
3. None outstanding from this session's UI work — `DESIGN.md`'s component anatomy section was updated with `MultiCityBundle`/`MultiCityLegEditor`/trip-type-selector entries before closing out.

---

## Session 15 (2026-06-30)

### Context
Two-part session. First half: a planned feature build, scoped and approved via plan mode — turn the `docs/` knowledge files (credit-card bag-fee waivers, points/miles valuations) into actual retrievable RAG knowledge (they were written for the pipeline but never ingested), give that knowledge a freshness lifecycle, and add the "search nearby airports" capability flagged as deferred at the end of session 14. Second half: live bug triage after the user exercised the running app — an airport-autocomplete oddity, a filter that didn't affect the recommended card, and a Travel Intelligence card that printed raw markdown/leaked reference text.

---

### Part 1 — Knowledge-base RAG (Phases A–D)

**Phase A — ingestion.** New `rag/ingest_docs.py`: section-aware chunking (splits on `## ` headings, since the docs are already topic-structured and tables must stay intact per-section), stable ids (`knowledge-{doc_type}-{section-slug}`), `kind="knowledge"` metadata so route-scoped flight retrieval and knowledge retrieval never bleed into each other. `rag/vectorstore.py`'s `ingest()` switched from `add()` to `upsert()` so re-running on an edited doc replaces the chunk in place. Added lightweight YAML-ish frontmatter (`doc_type`, `as_of`, `review_after`, `sources`) to `docs/credit-cards.md`/`docs/points-miles.md`. Knowledge base seeds itself on RAG server boot (FastAPI `lifespan`), non-fatal on failure.

**Phase B/C — retrieval + UI.** New `rag/query.py:query_knowledge()` retrieves `kind="knowledge"` chunks and grounds an LLM answer, returning `{answer, as_of, stale}` (`stale` = today past the earliest retrieved chunk's `review_after`). New `POST /knowledge` endpoint (`rag/server.py`), plumbed through `rag.service.ts` → `rag.api.ts` → a new `TravelIntelligenceCard.tsx` (mirrors `AIInsightCard`'s loading/retry state machine) mounted under the existing price-focused AI Insight card in `ComparisonView.tsx`, showing a synthesized fact plus an "as of {month year}" or amber "verify" freshness pill.

**Phase D — freshness.** Turned out to need no new code: stable ids + upsert (Phase A) already make a policy edit a one-file change + re-ingest, and the `as_of`/`stale` plumbing (Phase B) already drives the pill. Verified live by editing a scratch copy of `credit-cards.md`, re-ingesting, and confirming the chunk updated in place with no duplicate.

---

### Part 2 — Multi-airport radius search (Phase E)

**E1 — verified, not assumed.** Confirmed via SerpAPI's own docs (fetched, not guessed) that `google_flights`'s `departure_id`/`arrival_id` accept comma-separated codes and return results merged in one call, each carrying its own real `departure_airport`/`arrival_airport`. This meant expansion needed **zero scraper changes** — `normalizeFlight` already reads the actual airport per-flight from the response, never from the request params.

**Data**: moved `AIRPORTS`/`Airport` from a client-only `airportData.ts` array into `packages/shared/src/airports.ts` (single source for client + server), adding `lat`/`lng` to every entry. Added `haversineMiles`, `airportsWithin(code, radiusMiles, maxResults)` (nearest-first, capped — bounds cost regardless of radius), and `expandAirportCodes(code, includeNearby, radiusMiles)` — the candidate-set builder reused by all three layers below.

**Wiring**: new `SearchQuery.includeNearbyAirports`/`nearbyRadiusMiles` columns (`schema.sql` + `prisma/schema.prisma`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pattern); `search.job.ts` expands origin/destination into a comma-joined string before the scraper call (no fan-out, one SerpAPI call either way); `SearchForm`/`AdvancedFilters` got an "Include nearby airports" toggle + radius select, mirroring the existing flexible-dates control pattern exactly.

**Real bug found and fixed by this work, not after it shipped**: `comparison.job.ts` and the client's `splitFlightsByDirection` both did *exact* airport-code matching when building the recommended-hero candidate lists — with expansion on, a cheaper flight departing a nearby airport (e.g. JFK for an EWR search) would be scraped and stored correctly but silently never considered for the hero, since it didn't exactly match the literal requested origin. Both now build their candidate set via the same `expandAirportCodes` the scraper call used, so they can't disagree. Caught via test-writing, not live use — `comparison.job.test.ts` and `flightComparison.test.ts` both got dedicated nearby-airport cases asserting the cheaper nearby flight is in fact picked.

**Files**: `packages/shared/src/airports.ts` (new), `index.ts`, `schemas.ts`, `types.ts`; `packages/server/schema.sql`, `prisma/schema.prisma`, `src/types/db.ts`, `src/services/search.service.ts`, `src/jobs/search.job.ts` (+ test), `src/jobs/comparison.job.ts` (+ test); `packages/client/src/utils/airportData.ts` (now re-exports from shared), `src/utils/flightComparison.ts` (+ test), `src/stores/searchStore.ts`, `src/components/search/AdvancedFilters.tsx`, `SearchForm.tsx`, `src/pages/SearchResultsPage.tsx`.

---

### Part 3 — Live bug triage (post-build)

**Bug 1 — airport input "ewr" sometimes became "Toronto — YYZ".** Could not reproduce the exact swap via scripted Playwright typing (clean type+click, fast retype-over-an-existing-selection, Enter, Tab all behaved correctly in testing). Root-caused the likely mechanism by reading the code instead: `AirportInput.tsx` had **no keyboard navigation at all** — pressing Enter after typing a full code did nothing (left raw lowercase text in the field, no selection), and the dropdown was a live-reordering list with no debounce, meaning any mouse click whose timing straddled a re-render was mediated by DOM coordinates rather than React state. Fixed regardless of the exact trigger: added Arrow Up/Down to move a `highlightedIndex`, Enter to select whatever is currently highlighted (and `preventDefault`s so it can never fall through to the form's submit button), Escape to close. Selection is now a single synchronous state-driven action, not a click-coordinate race. New `AirportInput.test.tsx` (3 tests).

**Bug 2 — filters didn't affect the recommended round-trip/mix-airlines hero card.** Real, confirmed bug, not a misunderstanding: `SearchResultsPage.tsx`'s `activeComparison` memo only called `computeFilteredComparison` when `filterStore.selectedAirlines.length > 0` — every other filter (`maxLayovers` i.e. "Direct" only, `maxPrice`, `maxDurationMinutes`, departure time) correctly filtered the outbound/return lists below but left the hero showing whatever the *unfiltered* server comparison had picked, which could violate the active filter entirely. Extracted `hasActiveFilters(filterStore)` to `flightComparison.ts` (testable, and used as the actual gate) and broadened the condition to any active filter.

**Bug 3 — Travel Intelligence sometimes printed raw markdown and dumped an entire reference chunk verbatim**, including text from "What the Pipeline Surfaces Automatically" — a `points-miles.md` section that is itself *instructions for the pipeline* (example output templates, "never recommends definitively, surfaces the math"), not a verifiable user-facing fact. Root cause was twofold: (1) those meta/schema/TODO sections (5 across both docs: `Chunk Metadata Schema`, `Items Requiring Live Verification Before Shipping`, `What the Pipeline Surfaces Automatically`, `Storage Schema`, `Live Verification`) were never excluded from ingestion in Phase A, so they were retrievable as if they were facts; (2) the small local model (`qwen2.5:1.5b`) sometimes just echoed a retrieved chunk back near-verbatim instead of synthesizing, despite the prompt's existing "no markdown" instruction. Fixed in three layers: `rag/ingest_docs.py` now excludes those sections (`EXCLUDED_SECTIONS`) and `rag/vectorstore.py` gained `delete_where()` so re-ingesting actually prunes a doc's now-stale chunks (upsert alone never prunes ids it isn't given) — **found and fixed a second real bug here**: the first `delete_where()` call passed a flat multi-key dict, which Chroma rejects with "Expected where to have exactly one operator," silently raised, and did nothing until wrapped in `{"$and": [...]}` (same pattern already used elsewhere in this codebase for multi-key filters, just missed here). `rag/query.py`'s `_KNOWLEDGE_PROMPT` tightened (explicit anti-copying instruction, 30-word cap, `n_results` 5→3). `TravelIntelligenceCard.tsx` also got a defensive client-side markdown-stripper (`sanitizeInsight`) so raw `**`/`##`/bullet syntax can never reach the UI regardless of model behavior going forward. Live re-ingest confirmed chunk counts dropped 15→10 and the 3 excluded points-miles sections are gone from the store. New `TravelIntelligenceCard.test.tsx` (4 tests) and 3 new `rag/tests/test_knowledge_retrieval.py` cases (meta-section exclusion, `delete_where` actually prunes, re-ingest prunes a section renamed/removed from the source doc).

**Process note, not a code bug**: while cleaning up duplicate stale `npm run dev` processes from earlier sessions (two orphaned `concurrently` trees, one from the same day, one from days prior — recurring port-conflict pattern, see `feedback_kill_ports` memory), a `pkill` aimed at the dev-server processes also killed a pre-existing `ollama serve` that had been running as a child of one of those orphaned trees. This is what caused a transient "Unable to generate a response from the local model" — not a RAG/code bug, just a side effect of process cleanup. Restarted cleanly. (Separately, the user later reported and resolved an unrelated, genuine Ollama issue on a different remote server — an `OLLAMA_MODEL` `.env` value that didn't match what was actually pulled there; not something this session's code touches.)

**Files**: `packages/client/src/components/search/AirportInput.tsx` (+ test), `src/pages/SearchResultsPage.tsx`, `src/utils/flightComparison.ts` (+ `hasActiveFilters`), `src/components/comparison/TravelIntelligenceCard.tsx` (+ test); `rag/ingest_docs.py`, `rag/vectorstore.py`, `rag/query.py`, `rag/tests/test_knowledge_retrieval.py`.

---

### Tests
RAG: 16 pytest tests pass (9 new this session: 6 knowledge-retrieval/exclusion/delete-where, plus Part 1's coverage). Client: 52 tests pass (11 new: 3 `AirportInput`, 4 `TravelIntelligenceCard`, 4 nearby-airport cases in `flightComparison.test.ts`). Server: 47 tests pass (12 new: 6 nearby-airport cases each in `search.job.test.ts`/`comparison.job.test.ts`). `tsc --noEmit` clean on client/server/shared; all three packages build clean.

### Outstanding Issues (as of end of session 15)
1. Items from session 13's outstanding list mostly unchanged (native macOS nginx on port 80, EmptyState/AdvancedFilters minor items, DOT BTS metro coverage gap, tfs real-world validation) — the Ollama model-mismatch item was a per-server config issue the user resolved directly, not a code fix.
2. The exact trigger for the original "ewr → Toronto YYZ" report was never definitively reproduced — the keyboard-nav fix closes off the entire *class* of race (mouse-click-vs-reordering-list, Enter doing nothing), which was confirmed broken regardless, but if the user sees it again post-fix it needs a fresh repro with the actual interaction sequence (mouse vs. keyboard, typing speed, whether a prior selection existed).
3. `EXCLUDED_SECTIONS` in `rag/ingest_docs.py` is a manually maintained heading-name list — if a future doc edit adds a new meta/schema/TODO-style section without a corresponding addition here, it'll be retrievable as if it were fact again. No automated guard against this; relies on whoever edits the docs noticing.
4. `.claude/worktrees/angry-lumiere/` (a git worktree, has its own `.git`) contains a snapshot of the codebase from well before Prisma was removed (session 7) — clearly abandoned, not touched this session pending user confirmation it's safe to `git worktree remove`.
