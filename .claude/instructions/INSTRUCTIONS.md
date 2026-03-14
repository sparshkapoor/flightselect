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
npm run db:migrate    # Run Prisma migrations
npm run db:seed       # Seed with mock data
npm run dev           # Start both client (5173) and server (3001)
```

### Port conflicts
- Local Postgres runs on 5432, so Docker Postgres is mapped to **5433**. The DATABASE_URL in `.env` reflects this.
- If ports 5173 or 3001 are in use from previous runs, kill them: `lsof -ti :PORT | xargs kill -9`

### Known gotchas
- The `@flightselect/shared` package must be built (`npm run build`) before the server can use its types
- `dotenv` must be imported as the first line in `packages/server/src/index.ts` — moving it will break env loading
- The BullMQ search worker is started in `index.ts bootstrap()` — without it, search jobs queue but never process
- `CabinClass` and `TripType` enums exist in both `@prisma/client` and `@flightselect/shared` — always prefer the shared versions when passing to scraper interfaces

### User preferences
- **LLM**: Prefers open-source/free (Ollama). No paid API keys unless necessary.
- **LLM UX**: NOT a chatbot. LLM output should be embedded as explanation cards in the existing UI ("option reasoning").
- **Flight data**: Planning to use SerpAPI Google Flights API (free tier: 250/month). See https://serpapi.com/google-flights-api
- **Communication style**: Direct, no fluff. User appreciates explanations of WHY, not just WHAT.
