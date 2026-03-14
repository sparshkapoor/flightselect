# FlightSelect — Project Plan

## Core Concept
FlightSelect helps travelers answer one question: **"Should I book a round-trip ticket, or would two separate one-way tickets be cheaper or more convenient?"**

No mainstream tool surfaces this comparison explicitly. Google Flights, Kayak, and Skyscanner let you manually check both, but you have to do the math yourself. FlightSelect automates the comparison and presents a clear recommendation.

## Architecture

### Monorepo Structure (npm workspaces)
```
packages/
  client/    — React 18 + TypeScript + Vite + TailwindCSS (port 5173)
  server/    — Express + TypeScript + Prisma ORM + BullMQ (port 3001)
  shared/    — Zod schemas, TypeScript types, enums shared across client/server
```

### Infrastructure (Docker Compose)
- **PostgreSQL 15** (port 5433 on host, 5432 in container) — flight data, search queries, comparisons
- **Redis 7** (port 6379) — BullMQ job queue for async search processing + caching
- **pgAdmin** (port 5050) — visual database management

### Data Flow
1. User submits search form on frontend
2. Client POSTs to `/api/search` with search parameters
3. Server validates input via Zod schema (`SearchRequestSchema`)
4. Server creates a `SearchQuery` record in PostgreSQL
5. Server queues a BullMQ job (or processes synchronously if Redis unavailable)
6. Search worker runs available scrapers (currently: MockScraper)
7. Scraped flights are saved to `Flight` table linked to the SearchQuery
8. Comparison job runs: compares round-trip vs one-way pricing
9. Client polls `GET /api/search/:id` every 2 seconds until flights appear
10. Results page displays flights with filtering + comparison analysis card

### Scraper Architecture
- `IScraper` interface: `search(params) → ScrapedFlight[]`
- `ScraperFactory` returns all available scrapers
- Currently implemented: `MockScraper` (generates random realistic flight data)
- Stubbed but not implemented: `GoogleFlightsScraper`, `SkyscannerScraper`, `AmadeusScraper`
- **Planned**: SerpAPI Google Flights scraper (free tier: 250 searches/month of real data)

### AI/LLM Integration
- `MockAIService` currently returns template-based analysis
- Interface designed for plugging in real LLM providers
- **Planned approach**: "Option reasoning" — LLM generates a natural language explanation of WHY one booking strategy is better, displayed as a card in the results UI (not a chatbot)
- Factors: price difference, luggage policies, change fee risks, routing logic, seasonal demand
- **LLM preference**: Open-source/free (Ollama with llama3 or deepseek-r1 locally)

## Database Schema (Prisma)
- `SearchQuery` — stores search parameters and links to flights/comparisons
- `Flight` — individual flight results from scrapers
- `Comparison` — round-trip vs one-way analysis with recommendation
- `User` — optional user accounts for saved searches
- `SavedSearch` — bookmarked searches with optional price alerts

## Frontend Pages
- **Home** (`/`) — Search form with trip type toggle, airport autocomplete, date pickers, passenger/cabin selectors, advanced filters
- **Results** (`/results/:searchQueryId`) — Filter sidebar + comparison analysis card + flight list

## API Endpoints
- `POST /api/search` — Create search (returns 202 with searchQueryId)
- `GET /api/search/:id` — Get search results (flights + comparisons)
- `GET /api/flights?searchQueryId=...` — Get flights for a search
- `GET /api/comparison/query/:id` — Get comparisons for a search
- `POST /api/users` — Create user
- `GET /api/users/:id` — Get user with saved searches
- `POST /api/users/:id/saved-searches` — Save a search
- `GET /api/health` — Health check

## Filter System
### Implemented in UI
- Max price (range slider)
- Max layovers (Any/Direct/1/2 buttons)
- Airlines (checkboxes)
- Max flight duration (range slider, 1h-24h)
- Departure time range (time inputs)

### In store but not yet in UI
- Min price
- Max layover duration

### Accepted by API but client-side filtered
All filtering is done client-side after fetching flights. The API returns all flights for a search query.

## Key Design Decisions
- **Async search processing**: Searches are queued via BullMQ so multiple scrapers can run in parallel without blocking the API response
- **Fallback to sync**: If Redis is unavailable, search processes synchronously
- **Mock data first**: MockScraper generates realistic random flight data so the full flow works without any external API keys
- **Client-side filtering**: Flights are fetched once, filtered in-browser for instant responsiveness
- **Shared validation**: Zod schemas in `@flightselect/shared` ensure type-safe validation across client and server
