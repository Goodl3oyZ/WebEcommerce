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
# Apply schema changes directly to DB
npm run migrate

# Generate migration artifacts
npm run generate

# Seed sample data
npm run seed

# Clear + seed (see package scripts)
npm run clearSeed
```

For Docker environment:

```bash
docker compose -f docker-compose.dev.yml exec -T backend npm run migrate
docker compose -f docker-compose.dev.yml exec -T backend npm run seed
```

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
