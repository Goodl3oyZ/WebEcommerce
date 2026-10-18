# Backend (Express + Drizzle + PostgreSQL)

Backend API for WebEcommerce.

## Tech Stack

- Node.js 24 (ESM)
- Express 5
- Drizzle ORM + PostgreSQL
- Redis (sessions, rate limits)
- SeaweedFS S3 gateway for images (through the `minio` S3 client)
- JWT cookies with refresh-token rotation + Passport OAuth (Google, GitHub, Facebook)
- Socket.IO (support chat, notifications), Omise (PromptPay, cards), Nodemailer
- Jest + Supertest

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

You must provide working PostgreSQL, Redis, and S3 (SeaweedFS) endpoints in `.env`.

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

# About page and starter blog posts (only adds what is missing)
npm run seed:content

# Give an account a role: user | moderator | admin | super_admin
npm run user:role -- you@example.com super_admin

# Migrate + seed in one step
npm run db:setup

npm run clearSeed   # wipe all tables
```

For the production stack, run these through the root compose file (see `../DEPLOYMENT.md`):

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run seed:all
```

Schema source: `src/models/schema.js`. Old migration chain (0000–0014) was removed.

If seed fails with `relation does not exist`, run `npm run migrate` first. For an empty DB volume, `npm run db:setup` is enough.

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

## Tests

```bash
npm test   # starts docker-compose.test.yml (PostgreSQL, Redis, SeaweedFS) and runs Jest
```

## Notes

- Keep schema and seed in sync. If schema changes, update `src/seed/seed.js`.
- OAuth env vars are required for real OAuth sign-in.
- SMTP can be optional in local development.
