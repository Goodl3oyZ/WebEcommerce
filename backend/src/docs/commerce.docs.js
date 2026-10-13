import { z } from "zod";
import { documentRoutes } from "./registry.js";
import { cartDto } from "../dtos/cart.dto.js";
import { orderDto } from "../dtos/order.dto.js";
import { paymentDto } from "../dtos/payment.dto.js";
import { couponDto } from "../dtos/coupon.dto.js";
import { paginationQuery } from "./common.js";

const moneyNote =
  "All amounts (prices, shipping, coupon discount, 7% VAT on the discounted subtotal, total) are computed by the server; amount fields sent by the client are ignored.";

documentRoutes("Cart", [
  { method: "get", path: "/api/cart", summary: "Current user's cart (current prices and stock)", auth: "user", responses: { 200: "Cart" } },
  {
    method: "post",
    path: "/api/cart/items",
    summary: "Add a product variant (merges with an existing line)",
    auth: "user",
    body: cartDto.addItem,
    responses: { 200: "Updated cart", 404: "Product or variant not found", 409: "Not enough stock" },
  },
  {
    method: "put",
    path: "/api/cart/items/:itemId",
    summary: "Change a line's quantity",
    auth: "user",
    body: cartDto.updateItem,
    responses: { 200: "Updated cart", 404: "Cart item not found", 409: "Not enough stock" },
  },
  {
    method: "delete",
    path: "/api/cart/items/:itemId",
    summary: "Remove a line",
    auth: "user",
    responses: { 200: "Updated cart", 404: "Cart item not found" },
  },
  { method: "delete", path: "/api/cart/items", summary: "Empty the cart", auth: "user", responses: { 204: "Cart emptied" } },
  {
    method: "post",
    path: "/api/cart/checkout",
    summary: "Check out the whole cart",
    description: `Same rules as POST /api/orders/checkout, using the cart's lines. ${moneyNote}`,
    auth: "user",
    body: cartDto.checkout,
    responses: { 201: "Order created", 400: "Empty cart or invalid input", 402: "Payment failed", 409: "Not enough stock" },
  },
  {
    method: "post",
    path: "/api/cart/merge",
    summary: "Merge a guest cart after login",
    description:
      "Client prices are ignored. A product already in the cart keeps the larger quantity (so merging twice never doubles it); unavailable items are skipped and quantities are capped at stock.",
    auth: "user",
    body: cartDto.mergeGuestCart,
    responses: { 200: "Merged cart with `skipped` and `limited` (reduced to stock) lines" },
  },
]);

const orderIdNote = "Customers can only access their own orders; admins can read any order.";

documentRoutes("Orders", [
  {
    method: "post",
    path: "/api/orders/checkout",
    summary: "Place an order and pay",
    description: `${moneyNote} Stock is reserved atomically (row-locked conditional update, variants locked in id order, retried on deadlock; a CHECK constraint keeps stock ≥ 0) and every change is written to inventory_movements. Card payments are charged immediately; PromptPay returns a QR (\`charge.qrCodeUrl\`). An unpaid order keeps its stock until \`paymentDeadline\` (PAYMENT_DEADLINE_MINUTES, default 30), then the payment worker confirms with Omise and expires it. Send an \`Idempotency-Key\` header (or \`idempotencyKey\`) to make retries safe: the same key returns the first order (200) without charging again. If Omise does not answer, the order is kept and the response is 202 with \`paymentUncertain: true\`; the outcome is reconciled automatically. A rejected card cancels the order and releases the stock (402).`,
    auth: "user",
    body: orderDto.checkout,
    responses: {
      201: "Order created",
      200: "Repeated request with the same Idempotency-Key: the first order",
      202: "Order kept; the payment outcome is being confirmed with Omise (paymentUncertain)",
      402: "Payment declined or failed",
      404: "Product variant not found",
      409: "Not enough stock (INSUFFICIENT_STOCK)",
    },
  },
  { method: "get", path: "/api/orders", summary: "Current user's orders", auth: "user", query: orderDto.listQuery, responses: { 200: "Orders and pagination" } },
  { method: "get", path: "/api/orders/:orderId", summary: "Order details", description: orderIdNote, auth: "user", responses: { 200: "Order", 404: "Order not found" } },
  { method: "get", path: "/api/orders/:orderId/status", summary: "Order status and history", description: orderIdNote, auth: "user", responses: { 200: "Status and history", 404: "Order not found" } },
  { method: "get", path: "/api/orders/:orderId/tracking", summary: "Shipment tracking", description: orderIdNote, auth: "user", responses: { 200: "Shipment", 404: "Order or shipment not found" } },
  {
    method: "post",
    path: "/api/orders/:orderId/cancel",
    summary: "Cancel an unpaid pending order",
    description: "Releases reserved stock. Paid orders must be refunded instead.",
    auth: "user",
    body: orderDto.cancelOrder,
    responses: { 200: "Cancelled order", 400: "Order can no longer be cancelled", 404: "Order not found" },
  },
  {
    method: "post",
    path: "/api/orders/:orderId/refund",
    summary: "Request a refund for a delivered order",
    description: "Moves the order to `refund_requested`. No money moves until an admin refunds the payment.",
    auth: "user",
    body: orderDto.refundOrder,
    responses: { 200: "Refund requested", 400: "Not refundable or amount too high", 404: "Order not found" },
  },
  {
    method: "patch",
    path: "/api/orders/:orderId/status",
    summary: "Confirm delivery of a shipped order",
    description: "The only status change a customer can make.",
    auth: "user",
    body: orderDto.confirmDelivery,
    responses: { 200: "Delivered order", 400: "Order is not shipped", 404: "Order not found" },
  },
  {
    method: "delete",
    path: "/api/orders/:orderId",
    summary: "Not supported: orders are never deleted",
    auth: "user",
    responses: { 400: "Use cancel or refund instead" },
  },
  { method: "get", path: "/api/orders/admin/all", summary: "All orders", auth: "admin", query: orderDto.adminListQuery, responses: { 200: "Orders and pagination" } },
  {
    method: "get",
    path: "/api/orders/admin/stats",
    summary: "Order counts per status and paid revenue",
    auth: "admin",
    query: orderDto.statsQuery,
    responses: { 200: "Statistics" },
  },
  ...["put", "patch"].map((method) => ({
    method,
    path: "/api/orders/admin/:orderId/status",
    summary: "Change an order's status",
    description:
      "Allowed transitions: pending→confirmed/processing/cancelled, paid→processing, processing→shipped, shipped→delivered, refund_requested→delivered (reject). Cancelling releases stock. Paid orders must be refunded via POST /api/payments/:id/refund.",
    auth: "admin",
    body: orderDto.updateOrderStatus,
    responses: { 200: "Updated order", 400: "Transition not allowed", 404: "Order not found" },
  })),
  {
    method: "put",
    path: "/api/orders/admin/:orderId/shipping",
    summary: "Set carrier/tracking (and ship the order)",
    description: "Also updates the shipment record. status=shipped moves a paid/processing order to shipped.",
    auth: "admin",
    body: orderDto.updateShippingInfo,
    responses: { 200: "Updated order", 404: "Order not found" },
  },
]);

const paymentIdNote = "Customers can only access their own payments; admins can read any payment.";

documentRoutes("Payments", [
  {
    method: "post",
    path: "/api/payments/webhook/omise",
    summary: "Omise webhook",
    description:
      "Called by Omise. Only the charge id is read from the body; the charge is fetched from Omise before anything changes, so forged events have no effect.",
    auth: "public",
    responses: { 200: "Received" },
  },
  { method: "get", path: "/api/payments/methods", summary: "Active payment methods", auth: "user", responses: { 200: "Payment methods" } },
  { method: "get", path: "/api/payments/history", summary: "Current user's payments", auth: "user", query: paymentDto.historyQuery, responses: { 200: "Payments and pagination" } },
  ...["/api/payments", "/api/payments/create"].map((path) => ({
    method: "post",
    path,
    summary: path.endsWith("create") ? "Pay an order (alias of POST /api/payments)" : "Pay or retry paying an order",
    deprecated: path.endsWith("create"),
    description:
      "Charges the order total (client amount is ignored). A previous pending attempt is superseded, so a new PromptPay QR can be requested.",
    auth: "user",
    body: paymentDto.createPayment,
    responses: { 201: "Payment (and charge)", 402: "Card declined", 404: "Order not found", 409: "Order already paid or cancelled" },
  })),
  { method: "get", path: "/api/payments/order/:orderId", summary: "Payments for an order", description: paymentIdNote, auth: "user", responses: { 200: "Payments", 404: "Order not found" } },
  { method: "get", path: "/api/payments/:id", summary: "Payment details", description: paymentIdNote, auth: "user", responses: { 200: "Payment", 404: "Payment not found" } },
  {
    method: "get",
    path: "/api/payments/:id/status",
    summary: "Payment status (re-checked with Omise while pending)",
    auth: "user",
    responses: { 200: "Status", 404: "Payment not found" },
  },
  {
    method: "post",
    path: "/api/payments/:id/verify",
    summary: "Re-check a payment with Omise",
    description: "Use when a webhook may have been missed (e.g. polling after showing a PromptPay QR).",
    auth: "user",
    body: paymentDto.verifyPayment,
    bodyOptional: true,
    responses: { 200: "Status", 404: "Payment not found" },
  },
  {
    method: "delete",
    path: "/api/payments/:id",
    summary: "Not supported: payments are never deleted",
    auth: "user",
    responses: { 400: "Use a refund instead" },
  },
  { method: "get", path: "/api/payments/admin/transactions", summary: "All payments", auth: "admin", query: paymentDto.adminListQuery, responses: { 200: "Payments and pagination" } },
  ...["/api/payments/admin/statistics", "/api/payments/stats"].map((path) => ({
    method: "get",
    path,
    summary: "Payment statistics (money received, counts per status)",
    auth: "admin",
    query: paymentDto.statsQuery,
    responses: { 200: "Statistics" },
  })),
  {
    method: "get",
    path: "/api/payments/store/:storeId",
    summary: "Payments for orders picked up at a store",
    auth: "admin",
    query: paymentDto.storeQuery,
    responses: { 200: "Payments" },
  },
  {
    method: "put",
    path: "/api/payments/:id/status",
    summary: "Override a payment's status",
    description: "Keeps the order's payment status in sync. Refunds must use the refund endpoint.",
    auth: "admin",
    body: paymentDto.updatePaymentStatus,
    responses: { 200: "Updated payment", 404: "Payment not found" },
  },
  {
    method: "post",
    path: "/api/payments/:id/refund",
    summary: "Refund a payment (full or partial)",
    description: "Refunds through Omise for card/PromptPay payments. The total refunded can never exceed the amount paid.",
    auth: "admin",
    body: paymentDto.processRefund,
    responses: { 200: "Refund recorded", 400: "Not refundable or amount too high", 404: "Payment not found" },
  },
]);

documentRoutes("Coupons", [
  {
    method: "get",
    path: "/api/coupons/validate",
    summary: "Check a coupon against an amount",
    description: "Case-insensitive. Checks dates, minimum purchase and usage limits; the discount never exceeds the amount.",
    auth: "user",
    query: couponDto.validateQuery,
    responses: { 200: "Discount", 400: "Invalid, expired, exhausted or below minimum" },
  },
  { method: "get", path: "/api/coupons/available", summary: "Coupons usable right now", auth: "user", responses: { 200: "Coupons" } },
  { method: "get", path: "/api/coupons", summary: "All coupons", auth: "admin", query: z.object({ search: z.string().optional() }), responses: { 200: "Coupons" } },
  { method: "post", path: "/api/coupons", summary: "Create a coupon", auth: "admin", body: couponDto.createCoupon, responses: { 201: "Coupon", 409: "Code already exists" } },
  { method: "get", path: "/api/coupons/statistics", summary: "Coupon statistics", auth: "admin", responses: { 200: "Statistics" } },
  { method: "get", path: "/api/coupons/:id", summary: "Get a coupon", auth: "admin", responses: { 200: "Coupon", 404: "Coupon not found" } },
  ...["put", "patch"].map((method) => ({
    method,
    path: "/api/coupons/:id",
    summary: "Update a coupon",
    auth: "admin",
    body: couponDto.updateCoupon,
    responses: { 200: "Coupon", 404: "Coupon not found", 409: "Code already exists" },
  })),
  {
    method: "delete",
    path: "/api/coupons/:id",
    summary: "Disable a coupon",
    description: "Coupons are never hard-deleted because orders reference them.",
    auth: "admin",
    responses: { 200: "Disabled coupon", 404: "Coupon not found" },
  },
  { method: "post", path: "/api/coupons/:id/activate", summary: "Activate a coupon", auth: "admin", responses: { 200: "Coupon", 404: "Coupon not found" } },
  { method: "post", path: "/api/coupons/:id/deactivate", summary: "Deactivate a coupon", auth: "admin", responses: { 200: "Coupon", 404: "Coupon not found" } },
  {
    method: "get",
    path: "/api/coupons/:id/usage",
    summary: "Orders that used a coupon",
    auth: "admin",
    query: paginationQuery,
    responses: { 200: "Usage and pagination", 404: "Coupon not found" },
  },
]);
