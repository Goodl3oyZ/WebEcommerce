import { ApiError } from "./ApiError.js";

/**
 * Allowed order status changes.
 * - "paid" is set by the payment flow when a charge succeeds.
 * - "refund_requested" is set by the customer; an admin then refunds the
 *   payment (which moves the order to "refunded") or rejects back to "delivered".
 */
export const ORDER_TRANSITIONS = {
  pending: ["paid", "confirmed", "processing", "cancelled"],
  paid: ["confirmed", "processing", "refunded"],
  confirmed: ["processing", "cancelled", "refunded"],
  processing: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered"],
  delivered: ["refund_requested", "refunded"],
  refund_requested: ["delivered", "refunded"],
  cancelled: [],
  refunded: [],
};

export const ORDER_STATUSES = Object.keys(ORDER_TRANSITIONS);

/**
 * Pickup orders are never shipped: the customer collects the prepared order
 * at the branch, which takes it from "processing" straight to "delivered".
 */
const PICKUP_TRANSITIONS = {
  ...ORDER_TRANSITIONS,
  processing: ["delivered", "cancelled", "refunded"],
};

export function assertOrderTransition(from, to, fulfillment = "delivery") {
  if (from === to) return;
  const table = fulfillment === "pickup" ? PICKUP_TRANSITIONS : ORDER_TRANSITIONS;
  const allowed = table[from] || [];
  if (!allowed.includes(to)) {
    throw ApiError.badRequest(`ไม่สามารถเปลี่ยนสถานะจาก "${from}" เป็น "${to}" ได้`);
  }
}

/** Statuses in which reserved stock should go back to inventory. */
export const RELEASES_STOCK = ["cancelled"];
