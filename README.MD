# WebEcommerce

Full-stack e-commerce platform with:
- `frontend`: Next.js 15 + React 19
- `backend`: Express + Drizzle ORM + PostgreSQL + Redis + MinIO
- Local infra via Docker Compose (dev)

## Project Structure

```text
WebEcommerce/
├── frontend/                  # Next.js app
├── backend/                   # Express API + Drizzle schema/seed
├── DEVELOPMENT.md             # Development workflow (Docker/local)
└── README.MD                  # You are here
```

## Core Modules

- **Authentication & User Management**: register/login, profile, session, roles
- **Catalog**: products, categories, brands, variants, attributes, tags
- **Cart & Wishlist**: shopping cart flow and saved products
- **Orders & Payments**: checkout, order items, payment records, refunds
- **Shipping**: methods, rates, zones, shipment status/history
- **Discounts & Coupons**: product/category/order discount logic
- **Reviews & Loyalty**: rating/review, points and loyalty tracking
- **Store/Seller Management**: stores, settings, inventory, payouts

## Prerequisites

- Docker Desktop (recommended for full local stack)
- Node.js 20+ and npm (optional for non-Docker workflow)

## Quick Start (Recommended: Docker)

1. Create/update backend env:
   - Ensure `backend/.env` exists with DB/Redis/MinIO/JWT variables.
2. Start all services:
   - `cd backend`
   - `docker compose -f docker-compose.dev.yml up --build`
3. Open services:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000`
   - MinIO Console: `http://localhost:9001`
   - pgAdmin: `http://localhost:8080`

## Database Setup

Run these after containers are up (or when schema changes):

```bash
cd backend
docker compose -f docker-compose.dev.yml exec -T backend npm run migrate
docker compose -f docker-compose.dev.yml exec -T backend npm run seed
```

## Local (Without Docker)

Backend:
```bash
cd backend
npm install
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Note: without Docker, you must manually provide PostgreSQL, Redis, and MinIO.

## Useful Commands

```bash
# Start
cd backend && docker compose -f docker-compose.dev.yml up --build

# Stop
cd backend && docker compose -f docker-compose.dev.yml down

# Re-run schema + seed
cd backend && docker compose -f docker-compose.dev.yml exec -T backend npm run migrate
cd backend && docker compose -f docker-compose.dev.yml exec -T backend npm run seed

# Check logs
cd backend && docker compose -f docker-compose.dev.yml logs -f backend frontend
```

## Common Troubleshooting

- **API returns `500 relation ... does not exist`**
  - Run `npm run migrate` in backend container.
- **Products/categories empty**
  - Run `npm run seed` in backend container.
- **`next/image` invalid hostname**
  - Add host to `frontend/next.config.mjs` under `images.remotePatterns`.
- **Docker engine not running**
  - Start Docker Desktop, then run compose again.

## Additional Docs

- `DEVELOPMENT.md`: deeper setup and hot reload details
- `backend/README.MD`: backend architecture and backend commands
- `frontend/README.md`: frontend structure and frontend workflow
