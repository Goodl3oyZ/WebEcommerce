import axiosInstance from "./axiosInstance";

export const adminAPI = {
  // --- Address ---
  getAllAddresses: async () =>
    axiosInstance.get("/address/admin/all").then((r) => r.data),
  getUserAddresses: async (userId) =>
    axiosInstance.get(`/address/admin/user/${userId}`).then((r) => r.data),
  getAddressById: async (addrId) =>
    axiosInstance.get(`/address/admin/${addrId}`).then((r) => r.data),

  // --- Auth ---
  logoutAllSessions: async () =>
    axiosInstance.post("/auth/logout-all").then((r) => r.data),

  // --- Brands ---
  createBrand: async (brandData) =>
    axiosInstance.post("/brands", brandData).then((r) => r.data),
  updateBrand: async (brandId, brandData) =>
    axiosInstance.put(`/brands/${brandId}`, brandData).then((r) => r.data),
  deleteBrand: async (brandId) =>
    axiosInstance.delete(`/brands/${brandId}`).then((r) => r.data),

  // --- Categories ---
  createCategory: async (categoryData) =>
    axiosInstance.post(`/categories`, categoryData).then((r) => r.data),
  updateCategory: async (categoryId, categoryData) =>
    axiosInstance
      .put(`/categories/${categoryId}`, categoryData)
      .then((r) => r.data),
  deleteCategory: async (categoryId) =>
    axiosInstance.delete(`/categories/${categoryId}`).then((r) => r.data),

  // --- Coupons ---
  getCoupons: async () =>
    axiosInstance.get("/coupons").then((r) => r.data),
  createCoupon: async (couponsData) =>
    axiosInstance.post(`/coupons`, couponsData).then((r) => r.data),
  updateCoupon: async (couponId, couponData) =>
    axiosInstance.put(`/coupons/${couponId}`, couponData).then((r) => r.data),
  deleteCoupon: async (couponId) =>
    axiosInstance.delete(`/coupons/${couponId}`).then((r) => r.data),
  getCouponStatistics: async () =>
    axiosInstance.get(`/coupons/statistics`).then((r) => r.data),
  activateCoupon: async (couponId) =>
    axiosInstance.post(`/coupons/${couponId}/activate`).then((r) => r.data),
  deactivateCoupon: async (couponId) =>
    axiosInstance.post(`/coupons/${couponId}/deactivate`).then((r) => r.data),

  // --- Users ---
  getUsers: async (params = {}) =>
    axiosInstance.get("/users", { params }).then((r) => r.data),
  createUser: async (userData) =>
    axiosInstance.post("/users/create", userData).then((r) => r.data),
  updateUserRole: async (userId, newUserRole) =>
    axiosInstance.put(`/users/${userId}/role`, newUserRole).then((r) => r.data),
  setUserActive: async (userId, data) =>
    axiosInstance.patch(`/users/${userId}/status`, data).then((r) => r.data),
  getUserOrders: async (userId, params = {}) =>
    axiosInstance.get(`/users/${userId}/orders`, { params }).then((r) => r.data),

  // --- Orders (admin only) ---
  getAllOrders: async (params = {}) =>
    axiosInstance.get("/orders/admin/all", { params }).then((r) => r.data),
  updateOrderStatus: async (orderId, status, notes) =>
    axiosInstance
      .put(`/orders/admin/${orderId}/status`, { status, notes })
      .then((r) => r.data),
  getOrderStats: async (params = {}) =>
    axiosInstance.get("/orders/admin/stats", { params }).then((r) => r.data),
  updateShippingInfo: async (orderId, data) =>
    axiosInstance.put(`/orders/admin/${orderId}/shipping`, data).then((r) => r.data),
  getOrderPayments: async (orderId) =>
    axiosInstance.get(`/payments/order/${orderId}`).then((r) => r.data),

  // --- Shipping (admin only) ---
  getShippingMethods: async () =>
    axiosInstance.get("/shipping/methods").then((r) => r.data),
  createShippingMethod: async (data) =>
    axiosInstance.post("/shipping/methods", data).then((r) => r.data),
  updateShippingMethod: async (id, data) =>
    axiosInstance.put(`/shipping/methods/${id}`, data).then((r) => r.data),
  deleteShippingMethod: async (id) =>
    axiosInstance.delete(`/shipping/methods/${id}`).then((r) => r.data),
  getShippingZones: async () =>
    axiosInstance.get("/shipping/zones").then((r) => r.data),
  createShippingZone: async (data) =>
    axiosInstance.post("/shipping/zones", data).then((r) => r.data),
  updateShippingZone: async (id, data) =>
    axiosInstance.put(`/shipping/zones/${id}`, data).then((r) => r.data),
  deleteShippingZone: async (id) =>
    axiosInstance.delete(`/shipping/zones/${id}`).then((r) => r.data),

  // --- Payments (admin only) ---
  getAllTransactions: async (params = {}) =>
    axiosInstance.get("/payments/admin/transactions", { params }).then((r) => r.data),
  updatePaymentStatus: async (paymentId, status, transactionId) =>
    axiosInstance
      .put(`/payments/${paymentId}/status`, { status, transactionId })
      .then((r) => r.data),
  refundPayment: async (paymentId, data) =>
    axiosInstance
      .post(`/payments/${paymentId}/refund`, data)
      .then((r) => r.data),

  // --- Reports (admin only) ---
  getOrderReport: async (params = {}) =>
    axiosInstance.get("/report/orders", { params }).then((r) => r.data),
  getSalesReport: async (params = {}) =>
    axiosInstance.get("/report/sales", { params }).then((r) => r.data),
  getProductReport: async (params = {}) =>
    axiosInstance.get("/report/inventory", { params }).then((r) => r.data),
  getCustomerReport: async (params = {}) =>
    axiosInstance.get("/report/customer", { params }).then((r) => r.data),
  getSupplierReport: async (params = {}) =>
    axiosInstance.get("/report/supplier", { params }).then((r) => r.data),

  // --- Notifications (admin only) ---
  getNotifications: async (params = {}) =>
    axiosInstance.get("/notifications/admin/all", { params }).then((r) => r.data),
  sendNotification: async (data) =>
    axiosInstance.post("/notifications", data).then((r) => r.data),
  deleteNotification: async (id) =>
    axiosInstance.delete(`/notifications/admin/${id}`).then((r) => r.data),

  // --- Settings (admin only) ---
  getSettings: async () => axiosInstance.get("/settings").then((r) => r.data),
  updateSettings: async (data) =>
    axiosInstance.put("/settings", data).then((r) => r.data),
  getDashboard: async () =>
    axiosInstance.get("/admin/dashboard").then((r) => r.data),
  runSeed: async (seedType) =>
    axiosInstance.post("/admin/seed", { seedType }).then((r) => r.data),
};
