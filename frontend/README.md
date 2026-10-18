# Frontend (Next.js)

Frontend application for WebEcommerce, built with Next.js App Router.

## Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS
- Zustand (cart, UI state), React Hook Form
- Axios (cookies + automatic session refresh, see `src/lib/api/sessionRefresh.js`)

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

## Sign-in and protected pages

- `src/middleware.js` guards `/admin`, `/profile`, `/orders`, and `/checkout` by checking the `accessToken`
  cookie. When it has expired but a `refreshToken` cookie remains, the request goes to `/auth/refresh`,
  which renews the session and returns to the page; otherwise to `/auth/login`.
- API calls that get a 401 refresh the session once and retry. If the refresh fails, the signed-in user is
  cleared from the UI (`AuthContext` listens for the session-expired event).

## Common Issues

- **Image host blocked by Next/Image**
  - Add the hostname in `next.config.mjs` under `images.remotePatterns`.
- **API 500 / empty list**
  - Ensure backend migrate + seed are done.
- **Cannot reach API in Docker**
  - Confirm backend container is healthy and port `5000` is exposed.
- **Sent back to login on admin pages in local dev**
  - The frontend needs the same `JWT_SECRET` as the backend to verify the access token in the middleware.
