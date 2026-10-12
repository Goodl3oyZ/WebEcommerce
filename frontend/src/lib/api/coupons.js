import { apiClient } from "./apiClient";

export const couponsAPI = {
  /** { valid, discount, coupon } for a code against a cart subtotal (THB). */
  validate: async (code, amount) => {
    const response = await apiClient.get("/coupons/validate", { params: { code, amount } });
    return response.data;
  },

  /** Coupons the signed-in user can use right now (public + their own). */
  available: async () => {
    const response = await apiClient.get("/coupons/available");
    return Array.isArray(response.data) ? response.data : [];
  },
};

const REASONS = {
  COUPON_NOT_FOUND: "ไม่พบโค้ดนี้ ตรวจสอบการสะกดอีกครั้ง",
  COUPON_EXPIRED: "โค้ดนี้หมดอายุแล้ว",
  COUPON_NOT_STARTED: "โค้ดนี้ยังไม่เริ่มใช้งาน",
  COUPON_INACTIVE: "โค้ดนี้ถูกปิดการใช้งานแล้ว",
  COUPON_USAGE_LIMIT: "โค้ดนี้ถูกใช้ครบจำนวนแล้ว",
  COUPON_ALREADY_USED: "คุณใช้โค้ดนี้ครบสิทธิ์แล้ว",
};

/** Thai message for a coupon error response (falls back to the server text). */
export function couponErrorMessage(error) {
  const data = error?.response?.data;
  if (data?.code === "COUPON_MIN_PURCHASE") {
    const min = Number(String(data.message).match(/[\d.]+/)?.[0]);
    return Number.isFinite(min) ? `ต้องซื้อขั้นต่ำ ฿${min.toLocaleString("th-TH")} จึงจะใช้โค้ดนี้ได้` : "ยอดซื้อยังไม่ถึงขั้นต่ำของโค้ดนี้";
  }
  return REASONS[data?.code] || data?.message || error?.message || "ใช้โค้ดนี้ไม่ได้";
}

/** "ลด 10%" / "ลด ฿50" (+ cap) */
export function couponValueText(coupon) {
  const value = Number(coupon.value);
  const base = coupon.type === "percentage" ? `ลด ${value}%` : `ลด ฿${value.toLocaleString("th-TH")}`;
  return coupon.type === "percentage" && coupon.maxDiscount
    ? `${base} (สูงสุด ฿${Number(coupon.maxDiscount).toLocaleString("th-TH")})`
    : base;
}
