# Instructions for LLMs Working on FlightSelect

## Required Reading (do this first)
Before making any changes, read these files to understand the project and what has already been done:
1. `.claude/plan/PROJECT_PLAN.md` — Full project plan, architecture, and design decisions
2. `.claude/progress/CHANGELOG.md` — Detailed log of every change made, why, and what's outstanding

## Progress Logging Requirements
**You MUST update `.claude/progress/CHANGELOG.md` after every meaningful change you make.** This is critical for continuity across sessions.

### What to log
For every change, document:
- **What was the problem or goal** — Be specific. Include file paths, error messages, and the user's intent.
- **What was changed** — List every file modified and what specifically changed (not just "updated X", but "changed import from A to B because...").
- **Why this approach was chosen** — Especially if there were alternatives. Document trade-offs and reasoning.
- **What didn't work** — If you tried something that failed before finding the solution, log that too. It prevents future sessions from repeating mistakes.

### Format
Use the existing format in CHANGELOG.md:
- Group changes by session (Session 1, Session 2, etc.)
- Number each change within a session
- Include a "Context" section at the top of each session explaining what the user wanted to accomplish
- End each session with an "Outstanding Issues" section listing known bugs, planned features, and unfinished work

### When to log
- After fixing a bug
- After adding a feature or modifying existing functionality
- After making infrastructure/config changes
- After making architectural decisions (even if no code changed)
- After discovering important information about the codebase

## Project-Specific Notes

### Running the project
```bash
npm run docker:up     # Start Postgres (port 5433), Redis (port 6379), pgAdmin (port 5050)
npm run build         # Build shared package first
npm run db:migrate    # Apply schema.sql (idempotent, safe to re-run)
npm run dev           # Start both client (5173) and server (3001)
```

### Port conflicts
- Local Postgres runs on 5432, so Docker Postgres is mapped to **5433**. The DATABASE_URL in `.env` reflects this.
- If ports 5173 or 3001 are in use from previous runs, kill them: `lsof -ti :PORT | xargs kill -9`

### Anti-drift rule (read before any UI/design work)
- Re-read actual files with the Read tool before editing — never rely on memory of what code "should" contain, even from earlier in the same session. This project has had real incidents of describing code that didn't exist (e.g. claiming "glassy blur panels" were shipped when they never were).
- `packages/client/DESIGN.md` is the source of truth for the visual system. After any UI change, re-open the edited files and confirm they actually match it before reporting the work as done.

### RAG historical data seeding (one-time, optional)
The AI insight card needs prior flights for a route before it can say anything — routes with no search history return "insufficient data". Organic per-search ingestion (`search.job.ts` → `/ingest`) fills this in over time, but a one-time seed from a real public dataset gives immediate coverage for major US routes:
```bash
source .venv/bin/activate
python -m rag.seed_dot_airfares          # fetches US DOT BTS Table 1a, writes data/flights/dot_airfares.csv
python -m rag.ingest data/flights/dot_airfares.csv
```
Scope: real quarterly average fares for ~1,000 US contiguous-state metro city-pairs (most major US airports — LAX, JFK, ORD, SFO, LAS, etc.), mapped from the dataset's metro-area names to IATA codes via `CITY_TO_IATA` in `rag/seed_dot_airfares.py`. International routes (e.g. YYZ) aren't in this dataset and stay dependent on organic ingestion — that's expected, not a bug.

### RAG knowledge-base docs (credit cards, points/miles)
`docs/credit-cards.md` and `docs/points-miles.md` are retrievable RAG knowledge (`kind="knowledge"` in the vector store), separate from the flight-pricing data above. They seed themselves automatically on RAG server boot, but to re-ingest manually after editing them (e.g. a card drops a benefit, a CPP estimate changes):
```bash
source .venv/bin/activate
python -m rag.ingest_docs
```
Idempotent — stable chunk ids + upsert mean re-running replaces edited sections in place, no duplicates. `EXCLUDED_SECTIONS` in `rag/ingest_docs.py` is a manually maintained list of section headings that are instructions for the pipeline (schema examples, "verify before shipping" TODOs) rather than user-facing facts — if you add a new such section to either doc, add its heading there too, or it'll be retrievable as if it were a real fact.

### Known gotchas
- The `@flightselect/shared` package must be built (`npm run build`) before the server can use its types
- `dotenv` must be imported as the first line in `packages/server/src/index.ts` — moving it will break env loading
- The BullMQ search worker is started in `index.ts bootstrap()` — without it, search jobs queue but never process
- No ORM — all DB access is raw SQL via `pg` (Pool + typed `query<T>` / `queryOne<T>` helpers in `src/config/database.ts`)
- Schema is in `packages/server/schema.sql` — idempotent (IF NOT EXISTS), runs at container startup via `node dist/config/migrate.js`
- pg returns DECIMAL columns as strings — always wrap price fields in `Number()` before arithmetic
- Column names in the DB are camelCase (Prisma legacy) — SQL must quote them: `"searchQueryId"`, `"departureAirport"`, etc.
- IDs are generated with `crypto.randomUUID()` in application code (Node 20 built-in)
- After editing anything in `packages/shared/src`, run `npm run build --workspace=packages/shared` before testing client/server — `dist/` is gitignored and not rebuilt automatically, so server/client silently import stale compiled output (manifests as `X is not a function` for an export that very clearly exists in the source)
- Chroma's `where` filter rejects a flat multi-key dict (`{"kind": "x", "doc_type": "y"}`) — raises "Expected where to have exactly one operator." Multi-key filters need explicit `{"$and": [{"kind": "x"}, {"doc_type": "y"}]}`. Easy to miss since the error is silently swallowed if the call site is inside a try/except.
- `npm run dev:rag` (`uvicorn`) has no `--reload` flag — editing Python under `rag/` requires killing and restarting the process (`lsof -ti:8000 | xargs kill -9`, then `npm run dev:rag` again) to pick up changes, unlike the client (Vite HMR) or server (`ts-node-dev --respawn`)
- Killing stale dev processes by pattern (`pkill -f "concurrently ..."`) can take down children you didn't intend, e.g. an already-running `ollama serve` spawned by an old orphaned `npm run dev` tree — check `ps aux | grep ollama` after a cleanup pass if AI Insight/Travel Intelligence suddenly stop working

### User preferences
- **LLM**: Prefers open-source/free (Ollama). No paid API keys unless necessary.
- **LLM UX**: NOT a chatbot. LLM output should be embedded as explanation cards in the existing UI ("option reasoning").
- **Flight data**: Planning to use SerpAPI Google Flights API (free tier: 250/month). See https://serpapi.com/google-flights-api
- **Communication style**: Direct, no fluff. User appreciates explanations of WHY, not just WHAT.
