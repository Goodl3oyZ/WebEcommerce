# WebEcommerce

A full-stack online store with a Thai storefront and an admin back office, running in production at
**[shop.flukelnwza.online](https://shop.flukelnwza.online)** on my self-hosted HomeLab.

- **Storefront:** catalog with variants, search and collections, cart (guest carts merge on sign-in), checkout
  with Thai addresses and shipping methods or pickup at a branch (click & collect), PromptPay QR and card
  payments through Omise, order tracking, refund requests, verified reviews, loyalty points, coupons, wishlist, notifications, and live support chat.
- **Admin panel:** dashboard and reports, products and inventory, orders, shipping and pickup branches, payments, reviews
  moderation, brands and categories, coupons, users and roles, support inbox, blog and About content, store
  settings (name, logo, maintenance mode), and an audit log of every staff change and sign-in.
- **Accounts:** email sign-up with verification, Google / GitHub / Facebook sign-in, httpOnly JWT cookies with
  refresh-token rotation, login lockout, and roles (`user`, `moderator`, `admin`, `super_admin`).

## Architecture

```text
Browser ──HTTPS──► Cloudflare ──tunnel──► Caddy (one origin)
                                           ├─ /api, /oauth, /socket.io ─► backend   Express 5 · Socket.IO
                                           ├─ /media ───────────────────► SeaweedFS S3 gateway (images)
                                           └─ everything else ──────────► frontend  Next.js 16
backend ──► PostgreSQL (Drizzle ORM) · Redis (sessions, rate limits) · SeaweedFS · Omise · SMTP
```

Serving everything from one origin lets the auth cookies (`SameSite=Lax`) reach both the API and the Next.js
middleware that guards `/admin`, `/profile`, `/orders`, and `/checkout`. PostgreSQL, Redis, and SeaweedFS
publish no ports.

| Part | Stack |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS, Zustand, Axios, React Hook Form |
| Backend | Node.js 24 (ESM), Express 5, Drizzle ORM, PostgreSQL 15, Redis 7, Socket.IO, Passport, Zod, Nodemailer |
| Storage | SeaweedFS (S3-compatible) for product, profile, store, and review images |
| Payments | Omise: PromptPay QR and cards (3-D Secure), with webhooks |
| Operations | Docker Compose, Caddy, Cloudflare Tunnel, GitHub Actions, a signed deploy webhook with rollback |
| Tests | Jest + Supertest against real PostgreSQL / Redis / SeaweedFS containers |

## Repository layout

| Path | What is there |
| --- | --- |
| [`frontend/`](frontend/README.md) | Next.js storefront and admin panel |
| [`backend/`](backend/README.MD) | Express API: routes → controllers → services → Drizzle; seeds; tests |
| [`production/`](production/README.md) | Caddy and SeaweedFS config used by the production stack |
| [`deploy/`](deploy/README.md) | Deploy webhook, `deploy.sh`, systemd unit |
| `docker-compose.prod.yml` | Production stack; `docker-compose.tunnel.yml` adds the Cloudflare Tunnel setup |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Server setup, first super admin, tunnel, backups |
| `.github/workflows/ci-cd.yml` | Tests, build, and deploy on every push to `main` |

## Run locally

Requires Docker with Compose v2.

```bash
cd backend
cp .env.example .env          # fill in passwords and secrets (openssl rand -hex 32)
docker compose -f docker-compose.dev.yml up --build
```

This starts PostgreSQL, Redis, SeaweedFS, pgAdmin, and the backend and frontend with hot reload.
On the first run, create the schema and sample data:

```bash
docker compose -f docker-compose.dev.yml exec backend npm run db:setup     # schema + seed:all
docker compose -f docker-compose.dev.yml exec backend npm run seed:content # About page and blog posts
```

- Storefront: <http://localhost:3000>
- API: <http://localhost:5000/api> (health check at `/api/health`, Swagger UI at `/api-docs`)
- Give an account admin rights: `npm run user:role -- you@example.com super_admin` (in the backend container)

OAuth, SMTP, and Omise keys are only needed to try social sign-in, email, and payments.

## Tests

```bash
cd backend && npm test        # starts docker-compose.test.yml automatically
cd frontend && npm run build  # what CI checks for the frontend
```

## Deployment

A push to `main` runs the backend tests and the frontend build. When both pass, GitHub Actions sends an
HMAC-signed request to the deploy webhook on the server, which checks out that commit, rebuilds the stack,
waits for `/api/health`, and rolls back to the previous commit if the check fails. The workflow waits for
the result, so a failed deploy fails the run. See [`DEPLOYMENT.md`](DEPLOYMENT.md) and
[`deploy/README.md`](deploy/README.md).
