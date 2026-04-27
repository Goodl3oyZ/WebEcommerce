# Frontend (Next.js)

Frontend application for WebEcommerce, built with Next.js App Router.

## Stack

- Next.js 15
- React 19
- Axios
- React Query
- Tailwind CSS

## Run (Docker)

From project root:

```bash
cd backend
docker compose -f docker-compose.dev.yml up frontend --build
```

Or run full stack:

```bash
cd backend
docker compose -f docker-compose.dev.yml up --build
```

## Run (Local)

```bash
cd frontend
npm install
npm run dev
```

App URL: `http://localhost:3000`

## Key Scripts

```bash
npm run dev            # start dev server
npm run build          # production build
npm run start          # run production build
npm run lint           # eslint
npm run docker:dev     # start frontend via backend compose file
```

## API Integration

- Frontend uses backend API at `http://localhost:5000/api` in development.
- `next.config.mjs` includes rewrite from `/api/*` to backend service.
- For external images, configure `images.remotePatterns` in `next.config.mjs`.

## Common Issues

- **Image host blocked by Next/Image**
  - Add the hostname in `next.config.mjs` under `images.remotePatterns`.
- **API 500 / empty list**
  - Ensure backend migrate + seed are done.
- **Cannot reach API in Docker**
  - Confirm backend container is healthy and port `5000` is exposed.
