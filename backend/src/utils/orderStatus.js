import { ApiError } from "./ApiError.js";

export const ORDER_TRANSITIONS = {
  pending: ["processing", "confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
  paid: ["processing", "cancelled", "refunded"],
};

export function assertOrderTransition(from, to) {
  const current = from === "confirmed" ? "confirmed" : from;
  const allowed = ORDER_TRANSITIONS[current] || [];
  if (from === to) return;
  if (!allowed.includes(to)) {
    throw ApiError.badRequest(
      `ไม่สามารถเปลี่ยนสถานะจาก "${from}" เป็น "${to}" ได้`
    );
  }
}
