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
