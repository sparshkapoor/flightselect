# FlightSelect — Project Plan

*Current-state architecture doc, not a forward-looking plan — keep this accurate as the codebase changes. Last brought current in session 15 (2026-06-30); see `.claude/progress/CHANGELOG.md` for the full history of how it got here.*

## Core Concept
FlightSelect helps travelers answer one question: **"Should I book a round-trip ticket, or would two separate one-way tickets be cheaper or more convenient?"** — generalized over time to also cover multi-city itineraries, nearby-airport price comparisons, and soft factors (bag fees, card benefits, points value) a price-only comparison misses.

No mainstream tool surfaces these comparisons explicitly. Google Flights, Kayak, and Skyscanner let you manually check, but you do the math yourself. FlightSelect automates it and presents a clear recommendation, grounded in real scraped prices and a retrievable knowledge base — never fabricated.

## Architecture

### Monorepo Structure (npm workspaces)
```
packages/
  client/    — React 18 + TypeScript + Vite + TailwindCSS (port 5173)
  server/    — Express + TypeScript + BullMQ + raw `pg` (no ORM) (port 3001)
  shared/    — Zod schemas, TypeScript types, enums, airport data — must be built (`npm run build --workspace=packages/shared`) before client/server pick up changes, dist/ is gitignored
rag/         — Python/FastAPI RAG service: flight-pricing + knowledge-doc retrieval, LLM grounding (port 8000)
docs/        — Human + RAG-readable knowledge base (credit cards, points/miles) ingested by rag/ingest_docs.py
```

### Infrastructure (Docker Compose)
- **PostgreSQL 15** (port 5433 on host, 5432 in container) — flight data, search queries, comparisons. Plain SQL, no ORM — see "Database Schema" below.
- **Redis 7** (port 6379) — BullMQ job queue for async search processing, SerpAPI rate-limit counters, caching
- **ChromaDB** (embedded, persisted under `data/chroma`) — vector store for both flight-pricing grounding and `docs/` knowledge, owned by the `rag/` service
- **Ollama** (local, port 11434) or **Gemini** (API) — the RAG LLM backend, switched via `RAG_BACKEND` env var

### Data Flow
1. User submits search form on frontend (round-trip, one-way, or multi-city; optional flexible dates, optional "include nearby airports" + radius)
2. Client POSTs to `/api/search` with search parameters, validated client- and server-side via the shared Zod `SearchRequestSchema`
3. Server creates a `SearchQuery` record (+ `SearchLeg` rows for multi-city) in PostgreSQL
4. Server queues a BullMQ job (falls back to synchronous processing if Redis is unavailable)
5. Search worker (`search.job.ts`) runs the SerpAPI Google Flights scraper — once per date-pair candidate (flexible dates fan out, server-clamped to ±5 days) and once per leg (multi-city); "include nearby airports" expands the origin/destination into a comma-joined airport list *before* the scraper call, so SerpAPI itself merges results across airports in one request, no extra fan-out
6. Scraped flights saved to `Flight`, tagged with the real per-flight airport from the response (not the request) and `searchLegId` where applicable
7. `comparison.job.ts` computes round-trip-vs-mix-and-match (or cheapest-per-leg for multi-city), recognizing the same nearby-airport candidate set the scraper call used
8. Flights are also fire-and-forget POSTed to the RAG service's `/ingest`, so future searches on that route are grounded in real history
9. Client polls `GET /api/search/:id` until flights appear; results page shows the recommendation hero, an AI Insight (price analysis, grounded in past flights for the route) and a Travel Intelligence card (soft-factor facts — bag fees, card benefits, points value — grounded in `docs/`), filterable/sortable outbound+return lists

### Scraper Architecture
- `IScraper` interface: `search(params) → ScrapedFlight[]`
- `ScraperFactory` prefers real scrapers over mock; falls back to mock only if none are configured
- **Live**: SerpAPI Google Flights (`packages/server/src/scrapers/google-flights/`) — free tier 100/month, two-layer Redis rate limiting (per-client 60s window + global monthly cap)
- `MockScraper` exists as a fallback/dev fixture only

### RAG / Knowledge Layer
Two distinct, deliberately separated corpora in one ChromaDB collection, isolated by metadata (`kind: "flight" | "knowledge"`, never cross-retrieved):
- **Flight pricing** (`rag/ingest.py`, `/ingest` endpoint) — organic per-search ingestion plus a one-time US DOT BTS historical seed (`rag/seed_dot_airfares.py`). Powers the price-focused **AI Insight** card (`AIInsightCard.tsx`), route-scoped via an exact `origin`/`destination` metadata filter.
- **Knowledge docs** (`rag/ingest_docs.py`, `/knowledge` endpoint) — `docs/credit-cards.md`/`docs/points-miles.md`, section-aware chunked, frontmatter-dated (`as_of`/`review_after`), excluding meta/schema sections that are instructions for the pipeline rather than user-facing facts. Powers the **Travel Intelligence** card (`TravelIntelligenceCard.tsx`), which shows a freshness pill ("as of {date}" or amber "verify" when stale). Editing a doc + re-running `python -m rag.ingest_docs` is the entire update flow — stable chunk ids + upsert replace in place, no code change needed for a policy update.
- LLM backend is pluggable (`rag/llm_client.py`): Ollama (local, free, default) or Gemini (API key), selected via `RAG_BACKEND`.
- Not a chatbot — LLM output is always a short grounded insight embedded as a card in the existing UI, never a conversational surface.

## Database Schema (raw SQL — `packages/server/schema.sql`, idempotent, applied at startup via `node dist/config/migrate.js`)
- `User` — optional accounts for saved searches
- `SearchQuery` — search parameters incl. `tripType`, flexible-dates fields, `includeNearbyAirports`/`nearbyRadiusMiles`, status (`PENDING`/`COMPLETED`/`FAILED`)
- `SearchLeg` — one row per leg of a multi-city trip (always one-way); needed as a real table because a trip can repeat the same airport pair on different dates
- `Flight` — individual scraped flight results, tagged with real per-flight airports, `searchLegId` (nullable), `bookingUrl` always derived fresh at read time (never cached — see `flight.service.ts`'s `withBookingUrl()`)
- `Comparison` — round-trip-vs-mix-and-match analysis (or `legFlightIds`/`multiCityTotalPrice` for multi-city), `recommendedOption`
- `SavedSearch` — bookmarked searches with optional price alerts

No Prisma/ORM — typed `query<T>()`/`queryOne<T>()` helpers over `pg.Pool` (`src/config/database.ts`). Column names are camelCase and must be quoted in SQL (`"searchQueryId"`, etc. — a Prisma-era legacy kept for schema stability). DECIMAL columns come back as strings from `pg` — always `Number()` before arithmetic.

## Frontend Pages
- **Home** (`/`) — Search form: trip-type selector (round-trip / one-way / multi-city, up to 6 legs via `MultiCityLegEditor`), airport autocomplete (keyboard-navigable — Arrow keys + Enter), date pickers, passenger/cabin selectors, advanced filters (flexible dates, nearby airports, airline preferences)
- **Results** (`/results/:searchQueryId`) — Recommendation hero (round-trip/mix-and-match swap based on which is actually cheaper, or `MultiCityBundle` for multi-city), AI Insight + Travel Intelligence cards, Outbound/Return tabs (round-trip) or Flight-N tabs (multi-city), filter sidebar + flight list, "See full price breakdown" disclosure

`packages/client/DESIGN.md` is the literal source of truth for the visual system (Linear × Runway synthesis — surface ladder for depth, no shadows, one violet accent used deliberately). Check new UI work against it before calling it done.

## API Endpoints
- `POST /api/search` — Create search (returns 202 with searchQueryId); rate-limited (per-client 60s + global monthly SerpAPI cap)
- `GET /api/search/:id` — Get search results (flights + comparisons + legs)
- `GET /api/flights?searchQueryId=...` — Get flights for a search
- `POST /api/flights/:id/booking-options` — Real seller booking options (separate, tighter rate limit than full search)
- `POST /api/flights/multi-city-booking-url` — Combined N-leg Google Flights deep link
- `GET /api/comparison/query/:id` — Get comparisons for a search
- `POST /api/users`, `GET /api/users/:id`, `POST /api/users/:id/saved-searches`
- `POST /api/rag/query` — Price-analysis insight (AI Insight card)
- `POST /api/rag/knowledge` — Soft-factor insight (Travel Intelligence card)
- `GET /api/health`, `GET /api/search/rate-limit`

## Filter System
All implemented in UI (client-side, applied to the already-fetched flight list): max/min price, max layovers (Direct/1+/2+), max layover duration, max flight duration, departure time range, airline selection, "include nearby airports" + radius. **All filters, not just airline selection, recompute the recommended hero card** (`hasActiveFilters` gate in `SearchResultsPage.tsx`) — not just the outbound/return list below it.

## Key Design Decisions
- **Async search processing**: BullMQ-queued, falls back to synchronous if Redis is unavailable
- **No ORM**: raw `pg` — removed Prisma in session 7 after Docker build friction (binary targets, OpenSSL, version pinning) outweighed its value for a simple storage layer
- **Real data only, never fabricated**: live SerpAPI prices; AI Insight/Travel Intelligence return "insufficient data" rather than inventing a plausible-sounding answer when ungrounded
- **`bookingUrl` never cached**: always derived fresh per request from the flight's real segment data, so historical searches stay correct even after a booking-link bug fix
- **One SerpAPI call regardless of airport expansion**: `departure_id`/`arrival_id` accept comma-separated codes natively — nearby-airport search is a string-join, not a fan-out
- **Knowledge and flight-pricing RAG share one vector store, isolated by metadata** — avoids running two embedding pipelines/stores for what's structurally the same retrieval problem
- **Shared validation**: Zod schemas in `@flightselect/shared` (also home to airport data + geo utilities) used by both client and server
