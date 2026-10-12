# Production deployment

The production stack runs on a single Docker host behind Caddy, which serves
everything from one HTTPS origin:

| Path                                   | Service                         |
| -------------------------------------- | ------------------------------- |
| `/api/*`, `/oauth/*`, `/socket.io/*`   | backend (Express, port 5000)    |
| `/media/*`                             | SeaweedFS S3 gateway (images)   |
| everything else                        | frontend (Next.js, port 3000)   |

Using one origin lets the auth cookies (`SameSite=Lax`) reach both the API and
the Next.js middleware that guards `/admin`, `/profile` and `/orders`.
Postgres, Redis and SeaweedFS have no published ports.

## Requirements

- A Linux server with Docker Engine and Docker Compose v2
- A DNS `A`/`AAAA` record for your domain pointing at the server
- Ports 80 and 443 open (Caddy obtains the TLS certificate automatically)

## First deploy

```bash
cp .env.production.example .env.production
# Fill in every value. Generate secrets with: openssl rand -hex 32
# Use hex/alphanumeric passwords: they are embedded in connection URLs.

docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Startup order is handled by the compose file:

1. `db`, `redis` and `seaweedfs` start and report healthy.
2. `migrate` syncs the schema (`drizzle-kit push`), then exits.
3. `storage-init` creates the `products`, `profiles`, `stores` and `reviews` buckets, then exits.
4. `backend`, then `frontend`, then `caddy` start.

Seed reference data (only on a fresh database):

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  run --rm backend npm run seed:all
```

## OAuth and payment provider settings

- OAuth callback URLs: `https://<DOMAIN>/oauth/{github,google,facebook}/callback`
- Omise: use **live** keys in `OMISE_PUBLIC_KEY` / `OMISE_SECRET_KEY`. The
  backend refuses to start in production without them. The public key is
  inlined into the frontend bundle at build time, so rebuild the frontend
  (`up -d --build`) after you change it.

## Updating

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

`migrate` runs on every deploy. If a schema change would drop data, drizzle-kit
cannot ask for confirmation, so it aborts and the backend does not start. In that
case, review the change and apply it by hand
(`docker compose ... run --rm migrate npx drizzle-kit push`, interactively).

## Operations

- **Health:** `GET /api/health` reports the database, Redis and storage status
  (503 if any is down).
- **Logs:** `docker compose -f docker-compose.prod.yml logs -f backend`
  (json-file driver, rotated at 5 × 10 MB per container).
- **API docs:** these are disabled in production. To enable them, set
  `SWAGGER_ENABLED=true` with `SWAGGER_USER` / `SWAGGER_PASS` (basic auth).
- **Storage capacity:** SeaweedFS holds up to `SEAWEEDFS_VOLUME_MAX` (default 100)
  volumes of `SEAWEEDFS_VOLUME_SIZE_LIMIT_MB` (default 256 MB) each, so about 25 GB.
  Disk is only used as files are written. To raise the limit, pass these variables to the
  `seaweedfs` service.
- **Backups:** back up these volumes regularly:
  - `postgres_data`: use `pg_dump` via `docker compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB`
  - `seaweedfs_data`: uploaded images
  - `caddy_data`: TLS certificates

## Production environment variables (backend)

The compose file derives most of these from `DOMAIN`. Set them yourself only
when you deploy the backend some other way:

| Variable           | Purpose                                                    |
| ------------------ | ---------------------------------------------------------- |
| `TRUST_PROXY`      | Number of reverse proxies in front of the app (Caddy = `1`). Required for secure cookies and per-IP rate limits. |
| `ALLOWED_ORIGINS`  | Comma-separated CORS / Socket.IO origins. Required in production. |
| `FRONTEND_URL`     | Used for OAuth redirects and email links. Required.        |
| `MINIO_PUBLIC_URL` | Browser-facing base URL for stored images, e.g. `https://<DOMAIN>/media`. Required. |
| `MINIO_HOST`, `MINIO_API_PORT`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` | S3 endpoint and credentials. Any S3-compatible server works. |
