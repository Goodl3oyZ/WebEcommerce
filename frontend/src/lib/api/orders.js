import { apiClient } from "./apiClient";

export const orderAPI = {
  // Create order (checkout)
  createOrder: async (data) => {
    // data ต้องมี: shippingAddressId, billingAddressId, shippingMethodId, paymentMethodId, items
    try {
      const response = await apiClient.post("/orders/checkout", data);
      return response.data;
    } catch (error) {
      // handle error เช่น stock ไม่พอ, ค่าจัดส่งไม่ตรง
      throw error.response?.data || { message: "Order creation failed" };
    }
  },

  // Cancel order (ถ้ามี endpoint)
  cancelOrder: async (orderId, reason) => {
    try {
      const response = await apiClient.post(`/orders/${orderId}/cancel`, {
        reason,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Order cancellation failed" };
    }
  },

  // Refund order (ถ้ามี endpoint)
  refundOrder: async (orderId, refundData) => {
    try {
      const response = await apiClient.post(
        `/orders/${orderId}/refund`,
        refundData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Order refund failed" };
    }
  },

  // Get order details
  getOrder: async (orderId) => {
    const response = await apiClient.get(`/orders/${orderId}`);
    return response.data;
  },

  // Get user orders with pagination (ไม่ต้องส่ง userId)
  getOrders: async ({ page = 1, limit = 10 } = {}) => {
    const response = await apiClient.get("/orders", {
      params: { page, limit },
    });
    return response.data;
  },

  // Update order status (payload ตรงกับ zod schema)
  updateOrderStatus: async (orderId, status) => {
    const response = await apiClient.patch(`/orders/${orderId}/status`, {
      status,
    });
    return response.data;
  },

  // Get order tracking
  getOrderTracking: async (orderId) => {
    const response = await apiClient.get(`/orders/${orderId}/tracking`);
    return response.data;
  },

  // Update tracking number
  updateTrackingNumber: async (orderId, trackingNumber) => {
    // Admin only: tracking lives on the order's shipping info.
    const response = await apiClient.put(`/orders/admin/${orderId}/shipping`, {
      trackingNumber,
    });
    return response.data;
  },
};
