# production/

Config files mounted by `docker-compose.prod.yml` (repo root). Nothing here is
used for local development (`backend/docker-compose.dev.yml`).

| File | Used by | Purpose |
| --- | --- | --- |
| `caddy/Caddyfile` | `caddy` service | The only public entry point: automatic HTTPS, and routing on one domain (`/api`, `/oauth`, `/socket.io` to the backend; `/media` to image storage; everything else to the frontend). |
| `caddy/routes.caddy` | both Caddyfiles | The routes, shared by the public-HTTPS and the tunnel setups. |
| `caddy/Caddyfile.tunnel` | `caddy` with `docker-compose.tunnel.yml` | Plain HTTP on loopback behind Cloudflare Tunnel; keeps the visitor's forwarded IP and scheme. |
| `seaweedfs/start.sh` | `seaweedfs` service (also the test stack) | Starts the S3-compatible image storage: credentials from env, public read-only access to images, and volume sizes that fit a small disk. |

Which compose file to use:

| File | When |
| --- | --- |
| `docker-compose.prod.yml` (root) | Deploying to a server, see `DEPLOYMENT.md` |
| `backend/docker-compose.dev.yml` | Developing on your machine |
| `backend/docker-compose.test.yml` | Started automatically by `npm test` |
