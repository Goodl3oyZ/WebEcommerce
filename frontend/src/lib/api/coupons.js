import { apiClient } from "./apiClient";

export const couponsAPI = {
  /** { valid, discount, coupon } for a code against a cart subtotal (THB). */
  validate: async (code, amount) => {
    const response = await apiClient.get("/coupons/validate", { params: { code, amount } });
    return response.data;
  },
};
