# Store Analytics Dashboard

Multi-tenant store analytics API (NestJS + PostgreSQL) and dashboard (Next.js). Package management and scripts use **[Bun](https://bun.sh)** (`bun install`, `bun run`).

**Video walkthrough:** : Will add soon.

## Setup Instructions

### Prerequisites

- [Bun](https://bun.sh) 1.x
- Docker (optional, for Postgres + Redis)

### 1. Start databases (recommended)

From the repo root:

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp ../.env.example .env
# Edit .env: set JWT_SECRET, confirm DATABASE_URL
bun install
bun run seed
bun run start:dev
```

The seed creates **12 product IDs per store** so **Top products** can show up to **10 rows** once you re-seed (older seeds only had 3–4 IDs per store, so you would see fewer rows). Optional: set `SEED_EVENT_COUNT` (e.g. `50000`) in `backend/.env` to load more events for local performance testing—not required for the demo.

API base: `http://localhost:3000`  
Health: `GET http://localhost:3000/api/v1/health`

Optional e2e (Postgres must be up): from `backend/`, run  
`RUN_E2E=1 bun run test:e2e` (Windows PowerShell: `$env:RUN_E2E='1'; bun run test:e2e`).

### 3. Frontend

```bash
cd frontend
cp ../.env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:3000
bun install
bun run dev
```

Open `http://localhost:3001`. Log in with:

| Email | Password | Store |
|-------|----------|--------|
| `owner@store-a.test` | `demo1234` (or your `SEED_PASSWORD`) | `store_456` |
| `owner@store-b.test` | same | `store_789` |

## Architecture Decisions

### Data Aggregation Strategy

- **Decision:** Store raw events in PostgreSQL (`events` table with JSONB `data`). Aggregates for the dashboard use **indexed SQL** (`store_id` + `timestamp`, `store_id` + `event_type`). Revenue sums use `(data->>'amount')::numeric` on `purchase` rows.
- **Why:** Fits the assignment time box, keeps ingestion simple, and stays correct for arbitrary filters. Every query scopes by `store_id` from the JWT so planners can use tenant indexes.
- **Trade-offs:** Heavy write paths or cross-tenant reporting would still need stream processing; for read-heavy analytics at very large scale you would add rollups (hourly/daily) or a columnar warehouse.

### Real-time vs. Batch Processing

- **Decision:** **Hybrid.** Reads are **on-demand** from Postgres. The UI **polls** recent activity every **15 seconds** so the list updates without a manual refresh (lightweight “real-time” feel without running a full stream processor).
- **Why:** Meets “fast dashboard” and a credible real-time story without Kafka/WebSocket infrastructure for a take-home.
- **Trade-offs:** Not sub-second live; true live visitors would need session/heartbeat ingestion and Redis or similar.

### Frontend Data Fetching

- **Decision:** **TanStack Query** (`useQuery`) with a small `fetch` wrapper that attaches `Authorization: Bearer <token>` from `localStorage`. Query keys include the **active `store_id`** so switching the demo account clears stale cache; **“Switch store”** re-logs in as the other seeded tenant and invalidates analytics queries.
- **Why:** Built-in loading/error/retry and optional `refetchInterval` for recent events. The token is sent on every request; session metadata is stored after login for display and tenant-scoped cache keys.

### Performance Optimizations

- Composite **indexes** on `(store_id, timestamp)` and `(store_id, event_type)` for tenant-scoped scans.
- **Optional Redis:** if `REDIS_URL` is set, `GET /analytics/overview` responses are cached for **45 seconds** per store (`overview:<store_id>`). Stale metrics are acceptable for a high-level KPI strip; change TTL as needed.
- **Pagination:** Recent activity is capped at **20** events (optional `limit` query param, max 20).

You can validate index use with `EXPLAIN ANALYZE` on the generated SQL in `AnalyticsService` (TypeORM query logs can be enabled via TypeORM `logging: true` in development).

## Known Limitations

- **JWT in `localStorage`** is convenient for a demo but vulnerable to XSS; production would use httpOnly cookies + CSRF strategy.
- **Revenue** sums all purchase amounts as numbers; mixed currencies are not normalized (seed uses USD only).
- **Conversion rate** uses **all-time** counts: `purchases / page_views` for the authenticated store (not a funnel per session).
- **`synchronize: true`** on TypeORM is fine for local development only; production would use migrations.

## What I'd Improve With More Time

- Materialized rollups or `daily_store_metrics` updated by cron or triggers.
- Server-sent events or WebSocket for true push recent activity.
- Date-range filters on overview and CSV export.
- Proper migration pipeline and e2e tests against a disposable Postgres.

## Time Spent

3.5 Hours
