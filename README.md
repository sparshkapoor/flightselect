# FlightSelect

> Compare round-trip vs. one-way flight pricing to find the cheapest booking strategy.

FlightSelect answers one question: *should you book a round-trip ticket, or would two separate one-way tickets be cheaper?* It scrapes real flight data via SerpAPI, computes side-by-side price comparisons, and surfaces the best option — augmented by a local RAG pipeline that answers natural-language questions about the results.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                            FlightSelect                              │
│                                                                      │
│  ┌──────────┐   nginx (80)   ┌──────────────────────────────────┐   │
│  │  React   │ ◄────────────► │  Express + TypeScript (3001)     │   │
│  │  Client  │  /api proxy    │                                  │   │
│  │  (Vite)  │                │  ┌──────────┐  ┌─────────────┐  │   │
│  └──────────┘                │  │  SerpAPI │  │  BullMQ     │  │   │
│                              │  │  Google  │◄─│  Job Queue  │  │   │
│                              │  │  Flights │  └──────┬──────┘  │   │
│                              │  └──────────┘         │         │   │
│                              │                        ▼         │   │
│                              │  ┌──────────┐  ┌─────────────┐  │   │
│                              │  │  Prisma  │  │   Redis 7   │  │   │
│                              │  │  (ORM)   │  └─────────────┘  │   │
│                              │  └────┬─────┘                   │   │
│                              │       ▼                         │   │
│                              │  ┌──────────┐                   │   │
│                              │  │PostgreSQL│                   │   │
│                              │  └──────────┘                   │   │
│                              └──────────────────────────────────┘   │
│                                        │ internal Docker network    │
│                              ┌─────────▼────────────────────────┐   │
│                              │  FastAPI RAG (8000, not exposed)  │   │
│                              │  ChromaDB · MiniLM · Ollama/      │   │
│                              │  Gemini fallback                  │   │
│                              └──────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| State | Zustand (client), TanStack Query (server state) |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 15 |
| Cache / Queue | Redis 7, BullMQ |
| Validation | Zod (shared client + server) |
| Logging | Pino |
| RAG | FastAPI, ChromaDB, sentence-transformers, Ollama |
| Reverse proxy | nginx |
| Testing | Vitest, Testing Library, pytest |
| CI/CD | GitHub Actions → ghcr.io → SSH deploy |

---

## Prerequisites

**Dev:**
- Node.js 20+
- npm 8+ (workspaces)
- Docker + Docker Compose
- Python 3.11+ (for RAG service)
- [Ollama](https://ollama.ai) (`ollama serve` + `ollama pull qwen2.5:1.5b`)

**Self-hosted (Docker full stack):**
- Docker + Docker Compose
- Ollama running on the host (`ollama serve`)

---

## Quick Start (dev)

```bash
# 1. Clone
git clone https://github.com/sparshkapoor/flightselect.git
cd flightselect

# 2. Install all dependencies
npm install
pip install -r rag/requirements.txt

# 3. Start Postgres + Redis
npm run docker:up

# 4. Copy env files and fill in your keys
cp packages/server/.env.example packages/server/.env
cp .env.example .env

# 5. Run DB migrations
npm run db:migrate

# 6. (Optional) Seed sample data
npm run db:seed

# 7. Start everything
npm run dev          # Express + Vite
# In a second terminal:
uvicorn rag.server:app --host 0.0.0.0 --port 8000
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001/api |
| RAG | http://localhost:8000 (internal only in prod) |
| pgAdmin | http://localhost:5050 |

---

## Docker (full stack)

`docker-compose up --build` starts everything: Postgres, Redis, Express API, FastAPI RAG, and nginx serving the React build.

```bash
# Copy and configure env files first
cp packages/server/.env.example packages/server/.env
cp .env.example .env
# Edit both files with your SERPAPI_API_KEY, RAG_INTERNAL_SECRET, etc.

docker-compose up --build
```

Ollama must be running on the host (`ollama serve`). The RAG container reaches it via `host.docker.internal:11434`.

**HTTPS:** Front nginx with Certbot or a cloud load balancer — the base compose does not bundle TLS.

---

## Environment Variables

**`packages/server/.env`**

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | Postgres connection string |
| `REDIS_URL` | Yes | — | Redis connection string |
| `SERPAPI_API_KEY` | Yes | — | SerpAPI key |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin |
| `RAG_URL` | No | `http://localhost:8000` | FastAPI RAG base URL |
| `RAG_INTERNAL_SECRET` | No | — | Shared secret for Express→RAG requests |

**`.env` (root, Python RAG)**

| Variable | Required | Default | Description |
|---|---|---|---|
| `RAG_BACKEND` | No | `ollama` | `ollama` or `gemini` |
| `OLLAMA_MODEL` | No | `qwen2.5:1.5b` | Ollama model name |
| `GEMINI_API_KEY` | No | — | Gemini fallback key |
| `RAG_INTERNAL_SECRET` | No | — | Must match server-side value |

---

## Project Structure

```
flightselect/
├── docker-compose.yml          # Full stack: Postgres, Redis, API, RAG, nginx
├── nginx/
│   ├── Dockerfile              # Builds React, serves static + proxies /api/
│   └── nginx.conf
├── .github/workflows/
│   ├── ci.yml                  # Tests (client, server, RAG) + TS build on every push/PR
│   └── cd.yml                  # Build images → ghcr.io → SSH deploy on main merge
├── packages/
│   ├── shared/                 # @flightselect/shared — types, enums, Zod schemas
│   ├── server/                 # Express API
│   │   ├── Dockerfile
│   │   ├── prisma/             # Schema + migrations
│   │   └── src/
│   │       ├── config/         # Env (Zod), DB, Redis
│   │       ├── routes/         # REST endpoints
│   │       ├── controllers/    # Request handlers
│   │       ├── services/       # Business logic (search, comparison, RAG proxy, booking)
│   │       ├── scrapers/       # Google Flights (SerpAPI)
│   │       ├── jobs/           # BullMQ search + comparison jobs
│   │       └── middleware/     # Error, validation, rate limiting
│   └── client/                 # React + Vite
│       └── src/
│           ├── components/     # FlightCard, FilterSidebar, AIInsightCard, …
│           ├── pages/          # SearchResultsPage, ComparisonPage, …
│           ├── stores/         # Zustand (filter, search, user)
│           └── test/           # Vitest test files
└── rag/                        # FastAPI RAG service
    ├── Dockerfile
    ├── server.py               # FastAPI app, in-memory cache, secret verification
    ├── query.py                # ChromaDB retrieval + LLM call
    ├── ingest.py               # CSV → ChromaDB ingestion
    └── config.py               # Env config
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check (DB + Redis) |
| POST | `/api/search` | Create a flight search |
| GET | `/api/search/:id` | Poll search results |
| GET | `/api/flights` | List flights (`?searchQueryId=`) |
| GET | `/api/flights/:id` | Get a flight |
| GET | `/api/flights/:id/booking-options` | Fetch live booking options from SerpAPI |
| GET | `/api/comparison` | List comparisons (`?searchQueryId=`) |
| GET | `/api/comparison/:id` | Get comparison with flights |
| POST | `/api/rag/query` | Ask a natural-language question about flights |
| POST | `/api/users` | Create user |
| GET/PUT/DELETE | `/api/users/:id` | User CRUD |

---

## Tests

```bash
# Client (Vitest + jsdom)
npm run test --workspace=packages/client

# Server (Vitest + mocked Redis)
npm run test --workspace=packages/server

# Python RAG (pytest)
pip install -r rag/requirements-dev.txt
pytest rag/tests/ -v
```

CI runs all three on every push and PR via GitHub Actions.

---

## Re-ingesting ChromaDB

After new searches accumulate, export fresh flight data and re-ingest:

```bash
psql "$DATABASE_URL" -c "\COPY (
  SELECT \"departureAirport\" AS origin, \"arrivalAirport\" AS destination,
         DATE(\"departureTime\") AS date, ROUND(price::numeric,0) AS price,
         airline, \"durationMinutes\" AS duration_minutes
  FROM \"Flight\"
) TO '$(pwd)/data/flights/flights.csv' CSV HEADER"

python -m rag.ingest data/flights/flights.csv
```

---

## License

MIT © Sparsh Kapoor
