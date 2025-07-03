import { apiClient } from "./apiClient";

export const shippingAPI = {
  // Get all shipping methods (optionally by addressId)
  getMethods: async (addressId) => {
    if (addressId) {
      // ถ้ามี addressId จะดึงเฉพาะ method ที่ใช้ได้กับที่อยู่นั้น
      const response = await apiClient.get(`/shipping/methods`, {
        params: { addressId },
      });
      return response.data;
    } else {
      // ดึงทั้งหมด (public)
      const response = await apiClient.get(`/shipping/methods`);
      return response.data;
    }
  },

  // Calculate shipping cost (by addressId + items)
  calculateShippingCost: async (addressId, items) => {
    // items: [{ productId, variantId, quantity, weight? }]
    const response = await apiClient.post(`/shipping/calculate`, {
      addressId,
      items,
    });
    return response.data;
  },
};
