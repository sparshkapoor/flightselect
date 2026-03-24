# FlightSelect

> Compare round-trip vs. one-way flight pricing to find the cheapest booking strategy.

FlightSelect answers a simple question: *should you book a round-trip ticket, or would two separate one-way tickets be cheaper?* It aggregates real flight data via the SerpAPI Google Flights API, computes side-by-side price comparisons, and surfaces the best option.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FlightSelect                            │
│                                                                 │
│  ┌──────────┐    REST API     ┌──────────────────────────────┐  │
│  │          │ ──────────────► │  Express + TypeScript        │  │
│  │  React   │                 │  Server (port 3001)          │  │
│  │  Client  │ ◄────────────── │                              │  │
│  │ (port    │                 │  ┌──────────┐ ┌──────────┐   │  │
│  │  5173)   │                 │  │ SerpAPI  │ │  BullMQ  │   │  │
│  └──────────┘                 │  │  Google  │◄│  Jobs    │   │  │
│                               │  │  Flights │ └────┬─────┘   │  │
│                               │  │          │      │         │  │
│                               │  │          │      ▼         │  │
│                               │  └──────────┘ ┌──────────┐   │  │
│                               │               │  Redis   │   │  │
│                               │  ┌──────────┐ └──────────┘   │  │
│                               │  │  Prisma  │                │  │
│                               │  │  (ORM)   │                │  │
│                               │  └────┬─────┘                │  │
│                               │       │                      │  │
│                               │       ▼                      │  │
│                               │  ┌──────────┐                │  │
│                               │  │PostgreSQL│                │  │
│                               │  └──────────┘                │  │
│                               └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| State | Zustand (client state), TanStack Query (server state) |
| Charts | Recharts |
| Routing | React Router v6 |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 15 |
| Cache / Queue | Redis 7, BullMQ |
| Validation | Zod (shared between client and server) |
| Logging | Pino |

---

## Prerequisites

- **Node.js** 18+
- **npm** 8+ (workspaces support)
- **Docker** + Docker Compose (for PostgreSQL, Redis, pgAdmin)

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/sparshkapoor/flightselect.git
cd flightselect

# 2. Install all dependencies (all workspaces)
npm install

# 3. Start infrastructure (Postgres + Redis + pgAdmin)
npm run docker:up

# 4. Copy environment files
cp packages/server/.env.example packages/server/.env
cp packages/client/.env.example packages/client/.env

# 5. Run database migrations
npm run db:migrate

# 6. Seed the database with sample data
npm run db:seed

# 7. Start both client and server in development mode
npm run dev
```

The app will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001/api
- **pgAdmin:** http://localhost:5050 (admin@flightselect.dev / admin_password)
- **Prisma Studio:** Run `npm run db:studio`

---

## Project Structure

```
flightselect/
├── docker-compose.yml          # PostgreSQL, Redis, pgAdmin
├── package.json                # Root: npm workspaces + scripts
├── tsconfig.json               # Root TypeScript config (project references)
├── .eslintrc.js                # Shared ESLint config
├── .prettierrc                 # Shared Prettier config
└── packages/
    ├── shared/                 # @flightselect/shared
    │   └── src/
    │       ├── enums.ts        # CabinClass, TripType, RecommendedOption
    │       ├── types.ts        # Domain types + API request/response shapes
    │       ├── schemas.ts      # Zod validation schemas (shared client+server)
    │       └── index.ts        # Barrel export
    ├── server/                 # @flightselect/server
    │   ├── prisma/
    │   │   ├── schema.prisma   # DB models: User, SearchQuery, Flight, Comparison, SavedSearch
    │   │   └── seed.ts         # Sample data seeder
    │   └── src/
    │       ├── config/         # Env, DB (Prisma), Redis setup
    │       ├── routes/         # Express route definitions
    │       ├── controllers/    # Request handlers
    │       ├── services/       # Business logic (search, flight, comparison, cache, AI)
    │       ├── scrapers/       # Scraper interface + Mock, Google, Skyscanner, Amadeus stubs
    │       ├── jobs/           # BullMQ queue setup + job processors
    │       ├── middleware/     # Error handling, validation, rate limiting
    │       └── utils/          # Logger, airport utilities, pricing helpers
    └── client/                 # @flightselect/client
        └── src/
            ├── api/            # Axios-based API client
            ├── components/     # React components (search, results, comparison, filters, common, layout)
            ├── hooks/          # React Query + Zustand hooks
            ├── pages/          # Route-level page components
            ├── stores/         # Zustand stores (search, filter, user)
            └── utils/          # Formatters, airport data, constants
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check (DB + Redis status) |
| POST | `/api/search` | Create a new flight search |
| GET | `/api/search/:id` | Get search results by ID |
| GET | `/api/flights` | List flights (optional `?searchQueryId=`) |
| GET | `/api/flights/:id` | Get a specific flight |
| GET | `/api/comparison` | Get comparisons for a query (`?searchQueryId=`) |
| GET | `/api/comparison/:id` | Get a specific comparison with flight details |
| POST | `/api/users` | Create a user |
| GET | `/api/users/:id` | Get a user |
| PUT | `/api/users/:id` | Update a user |
| DELETE | `/api/users/:id` | Delete a user |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes following the existing code style
4. Run lint: `npm run lint`
5. Format: `npm run format`
6. Submit a PR with a clear description of what you changed and why

---

## License

MIT © FlightSelect Contributors
