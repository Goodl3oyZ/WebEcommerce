# Backend Architecture — WebEcommerce

Context doc for Cursor agents working on the Express API in `backend/`.

## Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 (ESM: `"type": "module"`) |
| HTTP | Express 5 |
| ORM | Drizzle ORM + PostgreSQL 15 |
| Cache / sessions | Redis 7 (`connect-redis`, rate-limit-redis) |
| Object storage | MinIO (buckets: `products`, `profiles`, `stores`, `reviews`) |
| Auth | JWT (access + refresh), express-session, Passport OAuth |
| Realtime | Socket.IO on same HTTP server |
| Validation | Zod DTOs + `validationMiddleware` |
| Payments | Omise (webhook at `/api/payments/webhook/omise`) |

## Entry point

- **File:** `backend/index.js`
- **Port:** `5000` inside container (mapped via `BACKEND_PORT` in `.env`)
- **Listen:** `ENV.SERVER.PORT` from `src/config/loadENV.js`

### Bootstrap order (index.js)

1. Redis client + session store (`connect-redis`)
2. `cookie-parser`, Passport init/session
3. CORS, Helmet, rate limiter, morgan, JSON body, compression
4. Route mounts (see API map below)
5. Socket.IO handlers (public/private chat)
6. Global `errorHandler`

### Health & debug

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Plain text ping |
| GET | `/api/health` | JSON: `db`, `redis`, `minio` status |
| GET | `/api/test-error` | Intentional 418 for error middleware test |

---

## Project layout

```
backend/
├── index.js                 # App entry
├── Dockerfile               # Production image
├── Dockerfile.dev           # Dev image (nodemon, no full COPY)
├── docker-compose.dev.yml   # Local development stack (+ frontend)
├── docker-compose.dev.yml   # Dev stack with volume mounts
├── scripts/init-minio.sh    # One-shot bucket init (minio-init service)
├── migrations/              # Drizzle SQL migrations
├── src/
│   ├── config/              # db, redis, minio, passport, loadENV
│   ├── controllers/         # Request handlers
│   ├── dtos/                # Zod schemas
│   ├── middlewares/         # auth, roles, rate limit, upload, errors
│   ├── models/schema.js     # Drizzle schema (large single file)
│   ├── routes/              # Express routers
│   ├── services/            # Business logic
│   ├── seed/                # seed.js, clear.js
│   └── utils/               # jwt, hashPassword, email, roles, ApiError
```

### Layer convention

```
Route → Controller → Service → DB (Drizzle) / MinIO / Redis / External API
         ↑ DTO validation in route via validationMiddleware
         ↑ authMiddleware + requireRole(ROLES.ADMIN) where needed
```

---

## Infrastructure (Docker)

**Compose file:** `backend/docker-compose.dev.yml` (production: `docker-compose.prod.yml` at the repo root)

| Service | Container | Purpose |
|---------|-----------|---------|
| db | flukedb | PostgreSQL |
| redis | flukeredis | Sessions, lockout, rate limits |
| minio | flukeminio | S3-compatible file storage |
| minio-init | minio-init | Creates buckets once, then exits |
| backend | backend | Node API |
| frontend | frontend | Next.js (separate build context) |
| pgadmin | pgadmin | DB UI |

**Docker network hostnames** (use in `.env`, not `localhost`):

- DB: `db:5432`
- Redis: `redis:6379`
- MinIO: `minio:9000`
- Backend (from frontend container): `backend:5000`

**Dev vs prod:**

- Production: `docker compose up` — code baked into image, `npm start`
- Development: `docker compose -f docker-compose.dev.yml up` — volume mounts + nodemon

**Seed admin (after `npm run seed`):**

- Email: `admin@example.com`
- Password: `admin123`
- Role: `admin` in `user_roles` table

---

## Authentication & authorization

### JWT + cookies

- Access token: cookie `accessToken` or `Authorization: Bearer`
- Refresh token: cookie `refreshToken`
- Config: `JWT_SECRET`, `JWT_REFRESH_SECRET`, expirations in `.env`

### OAuth (Passport)

**Mount:** `/oauth` — **not** under `/api`

| Provider | Start | Callback |
|----------|-------|----------|
| GitHub | `GET /oauth/github` | `GET /oauth/github/callback` |
| Google | `GET /oauth/google` | `GET /oauth/google/callback` |
| Facebook | `GET /oauth/facebook` | `GET /oauth/facebook/callback` |

`.env` must match Meta/Google/GitHub console:

```env
GITHUB_CALLBACK_URL=http://localhost:5000/oauth/github/callback
GOOGLE_CALLBACK_URL=http://localhost:5000/oauth/google/callback
FACEBOOK_CALLBACK_URL=http://localhost:5000/oauth/facebook/callback
```

After OAuth success → redirect to `FRONTEND_URL/auth/callback?success=true`.

### Roles (`src/utils/roles.js`, `authorizationMiddleware.js`)

| Role | Level |
|------|-------|
| super_admin | 4 |
| admin | 3 |
| moderator | 2 |
| user | 1 |

- Stored in `user_roles` table (user can have multiple; `getHighestRole()` picks max).
- `requireRole(ROLES.ADMIN)` allows admin **and** super_admin (hierarchy).
- JWT payload includes `role` from `user_roles` at login/token generation.

### Auth middleware flow (`authMiddleware.js`)

1. Bearer header → else cookies → else session
2. Load user + roles from DB
3. Set `req.user` with `role: getHighestRole(user.roles)`

---

## API route map (mounted in index.js)

Base URL: `http://localhost:5000`

### `/api/auth` — authentication (non-CRUD)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/register` | Public | Sends verify email if SMTP configured |
| POST | `/login` | Public | Sets cookies + returns user with role |
| POST | `/forgot-password` | Public | |
| POST | `/reset-password` | Public | |
| GET | `/verify-email` | Public | |
| POST | `/change-password` | User | |
| POST | `/refresh-token` | User | |
| POST | `/logout` | User | |
| POST | `/logout-all` | Admin | |
| GET | `/me` | User | Same as `/api/users/profile` |

### `/oauth` — OAuth (non-CRUD)

See table above + `GET /oauth/me`, `GET /oauth/logout`.

### `/api/users` — user profile & admin user ops

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/profile` | User | Includes `role` |
| PUT | `/profile` | User | Optional avatar multipart |
| DELETE | `/profile/image` | User | |
| GET | `/preferences` | User | |
| PUT | `/preferences` | User | |
| GET | `/orders` | User | User's orders |
| GET | `/points` | User | |
| GET | `/points/history` | User | |
| GET | `/` | Admin | List users |
| POST | `/` | Admin | Create user |
| POST | `/create` | Admin | Create user (deprecated alias) |
| GET | `/:userId` | Admin | User by ID |
| PUT | `/:userId/role` | Admin | Update role |

### `/api/products` — catalog + reviews + variants

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/` | Public | List + filters |
| GET | `/search` | Public | |
| GET | `/category/:categoryId` | Public | |
| GET | `/:id` | Public | |
| GET | `/:id/reviews` | Public | |
| GET | `/:id/variants` | Public | |
| POST | `/:id/review` | User | |
| PUT | `/:id/review/:reviewId` | User | |
| DELETE | `/:id/review/:reviewId` | User | |
| POST | `/` | Admin | Create product |
| PUT | `/:id` | Admin | |
| PATCH | `/:id` | Admin | Partial update |
| DELETE | `/:id` | Admin | |
| POST | `/:id/variants` | Admin | |
| PUT | `/:id/variants/:variantId` | Admin | |
| DELETE | `/:id/variants/:variantId` | Admin | |

### `/api/categories`, `/api/brands`, `/api/collections`

Public: `GET /`, `GET /:id`, `GET /:id/products`  
Admin: full CRUD on `/` and `/:id`  
Collections also: `POST|DELETE /:id/products` (add/remove products)

### `/api/cart` — session cart (non-CRUD checkout)

| Method | Path | Auth |
|--------|------|------|
| GET | `/` | User |
| POST | `/items` | User |
| PUT | `/items/:itemId` | User |
| DELETE | `/items/:itemId` | User |
| DELETE | `/items` | User | Clear |
| POST | `/checkout` | User |
| POST | `/merge` | User | Guest cart merge |

### `/api/wishlist`

User CRUD on `/` and `/:id`; `POST /:id/move-to-cart`  
Admin: `GET /admin/all`, `/admin/user/:userId`, `/admin/product/:productId`

### `/api/orders` — orders (action-oriented)

| Method | Path | Auth |
|--------|------|------|
| GET | `/` | User | Own orders |
| GET | `/:orderId` | User | |
| GET | `/:orderId/status` | User | |
| GET | `/:orderId/tracking` | User | |
| POST | `/checkout` | User | Create order |
| POST | `/:orderId/cancel` | User | |
| POST | `/:orderId/refund` | User | |
| PATCH | `/:orderId/status` | User | |
| GET | `/admin/all` | Admin | |
| GET | `/admin/stats` | Admin | |
| PUT | `/admin/:orderId/status` | Admin | |
| PATCH | `/admin/:orderId/status` | Admin | Preferred for partial updates |
| PUT | `/admin/:orderId/shipping` | Admin | |

### `/api/payments` — payments & Omise

- **Public:** `POST /webhook/omise` (registered before auth middleware)
- **Auth:** all other routes

Key paths: `GET /methods`, `GET /history`, `GET /stats`, `POST /`, `GET /order/:orderId`, admin under `/admin/*`.  
Static paths are registered **before** `/:id`.  
`POST /create` is a deprecated alias of `POST /`.

### `/api/shipping`

Public: `GET /methods`, `GET /zones`, `POST /calculate`  
Auth: tracking, shipments, labels  
Admin (`requireRole(ADMIN)`): stats, method/zone CRUD, shipment list/create/update  
Route order: static paths and `/methods`, `/zones` before `/:id`.

### `/api/stores`

Public: `GET /` (list), `GET /:id`, `GET /:id/products`, `GET /:id/reviews`  
Admin: CRUD + orders, analytics, settings

### `/api/coupons`

User: `GET /validate`, `GET /available`  
Admin: `GET /`, `GET /:id`, CRUD + statistics, activate/deactivate

### `/api/loyalty`

User: points, history, rewards, redeem  
Admin: statistics, tiers, rewards CRUD

### `/api/addresses`

User CRUD + `PUT /:id/default`  
Admin: `GET /admin/all`, `/admin/user/:userId`, `/admin/:id`

### `/api/uploads` — MinIO uploads (action-style)

For each of `avatar`, `product`, `brand`, `store`, `review`:

- `POST /{type}` — upload
- `PUT /{type}` — update
- `DELETE /{type}` — delete

All require auth.

### `/api/addressData` — Thailand reference data (read-only)

- `GET /provinces`
- `GET /districts`
- `GET /subdistricts`

### `/api/admin`

- `GET /dashboard` — admin only (auth + role)

### `/api/settings`

- `GET /public` — public-safe subset
- `GET /` — read settings
- `PUT|PATCH /` — admin update

### `/api/reports` (+ legacy alias `/api/report`)

Admin only. `GET /sales`, `/orders` (alias), `/inventory`, `/customer`, `/supplier`.  
Query params validated with `validationMiddleware(schema, "query")`.

### `/api/suppliers`

Admin only. CRUD + `/:id/products` nested routes.

### `/api/inventory`

Admin only. `GET /low-stock`, `/product/:productId`, `/location/:location` before `/:id`.

### `/api/notifications`

User inbox + read/mark/delete; admin broadcast via `POST /` and `/admin/*`.

---

## API documentation

| File | Purpose |
|------|---------|
| `backend/docs/API.md` | Full endpoint reference |
| `backend/docs/API-MIGRATION.md` | Breaking/deprecated path notes |

---

## File storage (MinIO)

- Client: `src/config/minio.js`
- URLs in production use `MINIO_HOST`; dev often exposes `localhost:9000`
- Bucket init: `minio-init` service runs `scripts/init-minio.sh`
- Product images stored as keys in DB; `productService` resolves to full URLs via `getFileUrl()`

---

## Realtime (Socket.IO)

Events on default namespace:

- `join_public`, `join_private`, `public_message`, `private_message`, `typing`, `disconnect`

Frontend chat uses `NEXT_PUBLIC_WS_URL` / `ws://localhost:5000`.

---

## Environment variables (backend/.env)

Required for startup (`loadENV.js` throws if missing):

- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `DATABASE_URL` (e.g. `postgresql://postgres:postgres@db:5432/webecommerce`)
- `REDIS_URL` (e.g. `redis://redis:6379`)

Common optional / feature flags:

| Variable | Purpose |
|----------|---------|
| `BACKEND_PORT` | Host port mapping; listen on 5000 inside container |
| `FRONTEND_URL` | OAuth redirect target |
| `MINIO_*` | Object storage |
| `EMAIL_*` | SMTP (Gmail app password); skip verify if empty |
| `*_CLIENT_ID/SECRET` | OAuth providers |
| `OMISE_*` | Payments |
| `PGADMIN_*` | pgAdmin container |

Never commit real secrets. OAuth callbacks use `/oauth/{provider}/callback` (not `/api/oauth`).

---

## Naming & REST conventions (project-specific)

- **Plural resources:** `products`, `orders`, `categories`
- **Singular session resources:** `cart`, `wishlist` (current user's)
- **Action routes OK for commerce:** `checkout`, `cancel`, `refund`, `validate`, `activate`
- **Admin split:** mix of `/api/{resource}/admin/*` and `/api/admin/*` — inconsistent
- **Prefer PATCH** for partial state updates (orders status) — many routes still use PUT
- **OAuth lives outside `/api`** by design

---

## Known technical debt

1. **Duplicate checkout:** `POST /api/cart/checkout` and `POST /api/orders/checkout` — prefer orders
2. **Duplicate payment create:** `POST /api/payments/create` — prefer `POST /api/payments/`
3. **Legacy report prefix:** `/api/report` alias kept for frontend; prefer `/api/reports`
4. **Admin path split:** mix of `/api/{resource}/admin/*` and `/api/admin/*` — inconsistent but stable
5. **PUT vs PATCH:** both supported on several resources; PATCH preferred for partial updates
6. **Suppliers:** in-memory (`supplierService.js`) until DB tables are migrated
7. **Inventory:** uses `store_inventory`; `/location/:location` maps to `storeId`

When adding routes: register **static paths before parameterized** (`/history` before `/:id`).

---

## Common commands

```bash
cd backend

# Production stack
docker compose up -d --build

# Dev stack (hot reload)
docker compose -f docker-compose.dev.yml up --build

# DB
npm run migrate
npm run seed          # admin@example.com / admin123
npm run clearSeed

# Local (no Docker)
npm run dev           # nodemon index.js
```

---

## Related frontend integration

- API base: `http://localhost:5000/api` (`NEXT_PUBLIC_API_URL`)
- OAuth start: `http://localhost:5000/oauth/{provider}` (via `config.oauth.startUrl`)
- Next.js rewrites `/api/*` → backend in dev (`next.config.mjs`)
- Cookies: `credentials: true` on axios; same-site `lax`
- Admin UI: `/admin` — requires JWT role `admin` or `super_admin`

---

*Last updated after backend route audit (June 2025). See `backend/docs/API.md` for endpoint reference.*
