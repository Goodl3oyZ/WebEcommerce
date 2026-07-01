# WebEcommerce REST API

Base URL: `http://localhost:5000`

- JSON request/response bodies
- Auth: `Authorization: Bearer <token>` or cookies `accessToken` / `refreshToken`
- Admin routes require role `admin` or `super_admin`

Full migration notes: [API-MIGRATION.md](./API-MIGRATION.md)

---

## Health & debug

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | Plain text ping |
| GET | `/api/health` | Public | DB, Redis, MinIO status |
| GET | `/api/test-error` | Public | Intentional 418 (error handler test) |

---

## Authentication — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | Public | Register account |
| POST | `/login` | Public | Login; sets cookies |
| POST | `/forgot-password` | Public | Request reset email |
| POST | `/reset-password` | Public | Reset with token |
| GET | `/verify-email` | Public | Verify email token |
| GET | `/me` | User | Current user profile |
| POST | `/change-password` | User | Change password |
| POST | `/refresh-token` | User | Refresh JWT |
| POST | `/logout` | User | Logout session |
| POST | `/logout-all` | Admin | Revoke all sessions |

---

## OAuth — `/oauth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/github` | Public | Start GitHub OAuth |
| GET | `/github/callback` | Public | GitHub callback |
| GET | `/google` | Public | Start Google OAuth |
| GET | `/google/callback` | Public | Google callback |
| GET | `/facebook` | Public | Start Facebook OAuth |
| GET | `/facebook/callback` | Public | Facebook callback |
| GET | `/me` | User | OAuth-linked profile |
| GET | `/logout` | Public | OAuth logout redirect |

---

## Users — `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/profile` | User | Profile + role |
| PUT | `/profile` | User | Update profile (optional avatar) |
| DELETE | `/profile/image` | User | Remove avatar |
| GET | `/preferences` | User | User preferences |
| PUT | `/preferences` | User | Update preferences |
| GET | `/orders` | User | User order history |
| GET | `/points` | User | Loyalty points balance |
| GET | `/points/history` | User | Points transaction history |
| GET | `/` | Admin | List users |
| POST | `/` | Admin | Create user |
| POST | `/create` | Admin | Create user (deprecated alias) |
| GET | `/:userId` | Admin | User by ID |
| PUT | `/:userId/role` | Admin | Update user role |

---

## Products — `/api/products`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List products |
| GET | `/search` | Public | Search products |
| GET | `/category/:categoryId` | Public | Products by category |
| GET | `/:id/reviews` | Public | Product reviews |
| GET | `/:id/variants` | Public | Product variants |
| GET | `/:id` | Public | Product detail |
| POST | `/:id/review` | User | Create review |
| PUT | `/:id/review/:reviewId` | User | Update review |
| DELETE | `/:id/review/:reviewId` | User | Delete review |
| POST | `/` | Admin | Create product |
| PUT | `/:id` | Admin | Update product |
| PATCH | `/:id` | Admin | Partial update |
| DELETE | `/:id` | Admin | Delete product |
| POST | `/:id/variants` | Admin | Create variant |
| PUT | `/:id/variants/:variantId` | Admin | Update variant |
| PATCH | `/:id/variants/:variantId` | Admin | Partial variant update |
| DELETE | `/:id/variants/:variantId` | Admin | Delete variant |

---

## Categories — `/api/categories`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List categories |
| GET | `/:id` | Public | Category detail |
| GET | `/:id/products` | Public | Category products |
| POST | `/` | Admin | Create category |
| PUT | `/:id` | Admin | Update category |
| DELETE | `/:id` | Admin | Delete category |

---

## Brands — `/api/brands`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List brands |
| GET | `/:id` | Public | Brand detail |
| GET | `/:id/products` | Public | Brand products |
| POST | `/` | Admin | Create brand |
| PUT | `/:id` | Admin | Update brand |
| DELETE | `/:id` | Admin | Delete brand |

---

## Collections — `/api/collections`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List collections |
| GET | `/:id` | Public | Collection detail |
| GET | `/:id/products` | Public | Collection products |
| POST | `/` | Admin | Create collection |
| PUT | `/:id` | Admin | Update collection |
| DELETE | `/:id` | Admin | Delete collection |
| POST | `/:id/products` | Admin | Add product to collection |
| DELETE | `/:id/products` | Admin | Remove product from collection |

---

## Cart — `/api/cart`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | User | Get cart |
| POST | `/items` | User | Add item |
| PUT | `/items/:itemId` | User | Update item qty |
| DELETE | `/items/:itemId` | User | Remove item |
| DELETE | `/items` | User | Clear cart |
| POST | `/checkout` | User | Checkout (deprecated — use orders) |
| POST | `/merge` | User | Merge guest cart |

---

## Wishlist — `/api/wishlist`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | User | User wishlist |
| POST | `/` | User | Add to wishlist |
| PUT | `/:id` | User | Update wishlist item |
| DELETE | `/:id` | User | Remove item |
| POST | `/:id/move-to-cart` | User | Move item to cart |
| GET | `/admin/all` | Admin | All wishlists |
| GET | `/admin/user/:userId` | Admin | Wishlist by user |
| GET | `/admin/product/:productId` | Admin | Wishlist by product |

---

## Orders — `/api/orders`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/all` | Admin | All orders |
| GET | `/admin/stats` | Admin | Order statistics |
| PUT | `/admin/:orderId/status` | Admin | Update order status |
| PATCH | `/admin/:orderId/status` | Admin | Update order status |
| PUT | `/admin/:orderId/shipping` | Admin | Update shipping info |
| POST | `/checkout` | User | **Canonical** checkout |
| GET | `/` | User | User orders |
| GET | `/:orderId/status` | User | Order status |
| GET | `/:orderId/tracking` | User | Tracking info |
| POST | `/:orderId/cancel` | User | Cancel order |
| POST | `/:orderId/refund` | User | Request refund |
| PATCH | `/:orderId/status` | User | Update status |
| GET | `/:orderId` | User | Order detail |

---

## Payments — `/api/payments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhook/omise` | Public | Omise webhook |
| GET | `/methods` | User | Payment methods |
| GET | `/history` | User | Payment history |
| GET | `/stats` | User | Payment stats |
| GET | `/admin/transactions` | Admin | All transactions |
| GET | `/admin/statistics` | Admin | Payment statistics |
| GET | `/order/:orderId` | User | Payments for order |
| GET | `/store/:storeId` | User | Payments for store |
| POST | `/token` | User | Create Omise token |
| POST | `/` | User | Create payment |
| POST | `/create` | User | Create payment (deprecated) |
| GET | `/:id/status` | User | Payment status |
| POST | `/:id/verify` | User | Verify payment |
| PUT | `/:id/status` | Admin | Update status |
| POST | `/:id/refund` | Admin | Process refund |
| GET | `/:id` | User | Payment detail |

---

## Shipping — `/api/shipping`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/methods` | Public | Shipping methods |
| GET | `/zones` | Public | Shipping zones |
| POST | `/calculate` | Public | Calculate shipping cost |
| GET | `/tracking/:trackingNumber` | User | Track shipment |
| GET | `/order/:orderId` | User | Shipment for order |
| GET | `/stats` | Admin | Shipping stats |
| POST | `/methods` | Admin | Create method |
| PUT | `/methods/:id` | Admin | Update method |
| DELETE | `/methods/:id` | Admin | Delete method |
| POST | `/zones` | Admin | Create zone |
| PUT | `/zones/:id` | Admin | Update zone |
| DELETE | `/zones/:id` | Admin | Delete zone |
| GET | `/` | Admin | List shipments |
| POST | `/` | Admin | Create shipment |
| GET | `/:id/label` | Admin | Get label |
| POST | `/:id/label` | Admin | Generate label |
| GET | `/:id` | Admin | Shipment detail |
| PUT | `/:id` | Admin | Update shipment |

---

## Stores — `/api/stores`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List stores |
| GET | `/:id` | Public | Store detail |
| GET | `/:id/products` | Public | Store products |
| GET | `/:id/reviews` | Public | Store reviews |
| POST | `/` | Admin | Create store |
| PUT | `/:id` | Admin | Update store |
| PATCH | `/:id` | Admin | Partial update |
| DELETE | `/:id` | Admin | Delete store |
| GET | `/:id/orders` | Admin | Store orders |
| GET | `/:id/analytics` | Admin | Store analytics |
| PUT | `/:id/settings` | Admin | Store settings |

---

## Coupons — `/api/coupons`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/validate` | User | Validate coupon code |
| GET | `/available` | User | Available coupons |
| GET | `/statistics` | Admin | Coupon statistics |
| GET | `/` | Admin | List coupons |
| POST | `/` | Admin | Create coupon |
| GET | `/:id/usage` | Admin | Usage stats |
| POST | `/:id/activate` | Admin | Activate |
| POST | `/:id/deactivate` | Admin | Deactivate |
| GET | `/:id` | Admin | Coupon detail |
| PUT | `/:id` | Admin | Update coupon |
| PATCH | `/:id` | Admin | Partial update |
| DELETE | `/:id` | Admin | Delete coupon |

---

## Loyalty — `/api/loyalty`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/points` | User | Loyalty points |
| GET | `/history` | User | Points history |
| GET | `/rewards` | User | Available rewards |
| POST | `/rewards/redeem/:id` | User | Redeem reward |
| GET | `/statistics` | Admin | Loyalty statistics |
| GET | `/tiers` | Admin | List tiers |
| POST | `/tiers` | Admin | Create tier |
| PUT | `/tiers/:id` | Admin | Update tier |
| POST | `/rewards` | Admin | Create reward |
| PUT | `/rewards/:id` | Admin | Update reward |
| DELETE | `/rewards/:id` | Admin | Delete reward |

---

## Addresses — `/api/addresses`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | User | User addresses |
| POST | `/` | User | Create address |
| PUT | `/:id` | User | Update address |
| PUT | `/:id/default` | User | Set default |
| DELETE | `/:id` | User | Delete address |
| GET | `/admin/all` | Admin | All addresses |
| GET | `/admin/user/:userId` | Admin | Addresses by user |
| GET | `/admin/:id` | Admin | Address detail |

---

## Address data — `/api/addressData`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/provinces` | Public | Thailand provinces |
| GET | `/districts` | Public | Districts (query: province) |
| GET | `/subdistricts` | Public | Subdistricts (query: district) |

---

## Uploads — `/api/uploads`

Auth required for all. Types: `avatar`, `product`, `brand`, `store`, `review`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/{type}` | Upload file |
| PUT | `/{type}` | Replace file |
| DELETE | `/{type}` | Delete file |

---

## Admin — `/api/admin`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard` | Admin | Dashboard metrics |

---

## Settings — `/api/settings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/public` | Public | Public-safe settings |
| GET | `/` | Public | All settings (read) |
| PUT | `/` | Admin | Update settings |
| PATCH | `/` | Admin | Partial update |

---

## Reports — `/api/reports` (alias: `/api/report`)

Admin only. Query params validated via Zod.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sales` | Sales report |
| GET | `/orders` | Sales report alias |
| GET | `/inventory` | Inventory report |
| GET | `/customer` | Customer report |
| GET | `/supplier` | Supplier report |

---

## Suppliers — `/api/suppliers`

Admin only.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List suppliers |
| POST | `/` | Create supplier |
| GET | `/:id/products` | Supplier products |
| POST | `/:id/products` | Add product |
| PUT | `/:id/products/:productId` | Update link |
| DELETE | `/:id/products/:productId` | Remove product |
| GET | `/:id` | Supplier detail |
| PUT | `/:id` | Update supplier |
| DELETE | `/:id` | Delete supplier |

---

## Inventory — `/api/inventory`

Admin only.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/low-stock` | Low stock items |
| GET | `/product/:productId` | Stock by product |
| GET | `/location/:location` | Stock by location |
| GET | `/` | List inventory |
| POST | `/` | Create item |
| POST | `/:id/adjust` | Adjust quantity |
| POST | `/:id/transfer` | Transfer stock |
| GET | `/:id` | Item detail |
| PUT | `/:id` | Update item |

---

## Notifications — `/api/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/all` | Admin | All notifications |
| GET | `/admin/:id` | Admin | Notification detail |
| DELETE | `/admin/:id` | Admin | Delete (admin) |
| GET | `/` | User | User notifications |
| PUT | `/read-all` | User | Mark all read |
| PATCH | `/read-all` | User | Mark all read |
| POST | `/` | Admin | Create / broadcast |
| PUT | `/:id/read` | User | Mark read |
| PATCH | `/:id/read` | User | Mark read |
| PUT | `/:id` | Admin | Update |
| PATCH | `/:id` | Admin | Partial update |
| DELETE | `/:id` | User | Delete |
| GET | `/:id` | User | Notification detail |

---

## Socket.IO events

Namespace: default (`ws://localhost:5000`)

| Event | Direction | Description |
|-------|-------------|-------------|
| `join_public` | Client → Server | Join public chat |
| `join_private` | Client → Server | Join private room |
| `public_message` | Client → Server | Send public message |
| `private_message` | Client → Server | Send private message |
| `new_message` | Server → Client | Incoming message |
| `typing` | Client → Server | Typing indicator |
| `user_typing` | Server → Client | Typing broadcast |

---

*Generated from route audit. See `.cursor/backend-architecture.md` for stack and conventions.*
