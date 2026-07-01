# Backend (Express + Drizzle + PostgreSQL)

Backend API for WebEcommerce.

## Tech Stack

- Node.js (ESM)
- Express 5
- Drizzle ORM + PostgreSQL
- Redis
- MinIO
- JWT + Passport OAuth

## Directory Overview

```text
backend/
├── index.js
├── drizzle.config.js
├── docker-compose.dev.yml
├── src/
│   ├── config/         # env, db, passport, constants
│   ├── routes/         # API route registration
│   ├── controllers/    # req/res orchestration
│   ├── services/       # business logic
│   ├── models/         # Drizzle schema
│   ├── middlewares/    # auth, validation, error handling
│   ├── utils/          # helpers/shared utilities
│   └── seed/           # seed script and sample data
└── package.json
```

## Run with Docker (Recommended)

```bash
cd backend
docker compose -f docker-compose.dev.yml up --build
```

## Run without Docker

```bash
cd backend
npm install
npm run dev
```

You must provide working PostgreSQL, Redis, and MinIO endpoints in `.env`.

## Database Commands

```bash
# Sync schema.js → PostgreSQL (required before seed)
npm run migrate

# Generate SQL snapshot into ./migrations (optional, for version control)
npm run generate

# Apply generated SQL files
npm run migrate:sql

# Seed all sample data (users, shipping, Thai addresses)
npm run seed:all

# Migrate + seed in one step
npm run db:setup

npm run clearSeed   # wipe all tables
```

For Docker (production compose):

```bash
docker compose exec backend npm run migrate
docker compose exec backend npm run seed:all
# or
docker compose exec backend npm run db:setup
```

Schema source: `src/models/schema.js`. Old migration chain (0000–0014) was removed.

If seed fails with `relation does not exist`, run `npm run migrate` first. For a empty DB volume, `npm run db:setup` is enough.

## Request Flow

```text
Route -> Controller -> Service -> Drizzle Model/Query -> PostgreSQL
```

Example:

```text
/api/products
  -> productRoutes
  -> productController.getProducts
  -> productService.getProducts
  -> db.select(...).from(products)
```

## Notes

- Keep schema and seed in sync. If schema changes, update `src/seed/seed.js`.
- OAuth env vars are required for real OAuth sign-in.
- SMTP can be optional in local development.
