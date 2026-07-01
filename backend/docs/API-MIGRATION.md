# API Migration Notes

Changes from the backend route audit (June 2025). Prefer the **canonical** paths below for new clients.

## New mounts (previously unmounted)

| Prefix | Status |
|--------|--------|
| `GET /api/reports/*` | **New** — primary reports API |
| `GET /api/report/*` | **Legacy alias** — same router as `/api/reports` (for existing admin frontend) |
| `/api/suppliers` | **New** — admin supplier CRUD |
| `/api/inventory` | **New** — admin inventory CRUD |
| `/api/notifications` | **New** — user + admin notifications |

## New endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/auth/me` | Current user profile (same payload as `/api/users/profile`) |
| GET | `/api/users/:userId` | Admin — fetch user by ID |
| POST | `/api/users/` | Admin — create user (alias of `POST /api/users/create`) |
| GET | `/api/products/:id/reviews` | Public — list product reviews |
| GET | `/api/products/:id/variants` | Public — list product variants |
| PATCH | `/api/products/:id` | Admin — partial product update |
| PATCH | `/api/products/:id/variants/:variantId` | Admin — partial variant update |
| GET | `/api/stores/` | Public — list all stores |
| GET | `/api/coupons/` | Admin — list coupons |
| GET | `/api/coupons/:id` | Admin — coupon detail |
| PATCH | `/api/coupons/:id` | Admin — partial coupon update |
| PATCH | `/api/orders/admin/:orderId/status` | Admin — status update (PUT still supported) |
| PATCH | `/api/orders/:orderId/status` | User — status update |
| PATCH | `/api/stores/:id` | Admin — partial store update |
| GET | `/api/reports/orders` | Admin — alias of `/api/reports/sales` |
| GET | `/api/settings/public` | Public — safe subset of settings |
| PUT/PATCH | `/api/settings/` | Admin — update app settings |

## Route order fixes (behavior change)

These paths **now match correctly** (previously shadowed by `/:id`):

| Module | Fixed paths |
|--------|-------------|
| Payments | `GET /history`, `GET /stats`, `GET /methods`, `GET /order/:orderId`, `POST /webhook/omise` |
| Shipping | `GET /methods`, `GET /zones`, `POST /calculate`, `GET /stats`, `GET /` (admin list) |
| Inventory | `GET /low-stock`, `GET /product/:productId`, `GET /location/:location` |
| Orders | `GET /admin/all`, `GET /admin/stats` before `/:orderId` |
| Notifications | `GET /admin/all`, `PUT /read-all` before `/:id` |
| Coupons | `GET /statistics`, `GET /validate`, `GET /available` before `/:id` |
| Products | `GET /search`, `GET /category/:id`, `GET /:id/reviews`, `GET /:id/variants` before `/:id` |

## Security / middleware fixes

| Change | Before | After |
|--------|--------|-------|
| Omise webhook | Behind JWT auth | **Public** at `POST /api/payments/webhook/omise` (before auth middleware) |
| Shipping mutations | Some routes lacked admin guard | All method/zone/shipment writes require **admin** |
| Reports | Unmounted | Admin-only + rate limited |
| Suppliers / inventory | Unmounted | Admin-only |

## Deprecated paths (still work)

| Deprecated | Use instead |
|------------|-------------|
| `POST /api/payments/create` | `POST /api/payments/` |
| `POST /api/cart/checkout` | `POST /api/orders/checkout` (canonical) |
| `GET /api/report/*` | `GET /api/reports/*` |
| `POST /api/users/create` | `POST /api/users/` |

## Frontend alignment checklist

- [ ] Admin reports: use `/api/reports/orders` or `/api/report/orders` (both work)
- [ ] OAuth: `/oauth/{provider}` — not `/api/oauth`
- [ ] Checkout: prefer `POST /api/orders/checkout`
- [ ] Payment create: `POST /api/payments/`
- [ ] Addresses admin: `/api/addresses/admin/*` (not `/address/admin`)

## Data layer notes

- **Inventory** reads/writes `store_inventory` (not a separate `inventory_items` table). Use `storeId` or pass store UUID as `location`.
- **Suppliers** use an in-memory store until a `suppliers` migration is added; data resets on server restart.

## Validation change

`validationMiddleware(schema, source)` now accepts `"body"` (default), `"query"`, or `"params"`. Report GET endpoints validate **query string** parameters.
