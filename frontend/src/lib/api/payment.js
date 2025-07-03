// @lib/api/payment.js
import { apiClient } from "./apiClient";

const allowedMethods = ["credit_card", "promptpay", "cash_on_delivery"];

export const paymentsAPI = {
  // Create payment (รองรับ token, paymentDetails, method)
  createPayment: async (data) => {
    const paymentDetails = data.paymentDetails || {};
    if (data.token) {
      paymentDetails.token = data.token;
    }
    let method = data.method || data.paymentMethod || "credit_card";
    if (!allowedMethods.includes(method)) {
      throw new Error("Invalid payment method");
    }
    const validatedData = {
      orderId: data.orderId,
      method,
      amount: data.amount,
      currency: data.currency || "THB",
      paymentDetails,
    };
    try {
      const response = await apiClient.post("/payments", validatedData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Payment failed" };
    }
  },

  // Update payment status (admin or webhook)
  updatePaymentStatus: async (paymentId, status, transactionId) => {
    try {
      const response = await apiClient.put(`/payments/${paymentId}/status`, {
        status,
        transactionId,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Update payment status failed" };
    }
  },

  // Get payment details
  getPayment: async (paymentId) => {
    const response = await apiClient.get(`/payments/${paymentId}`);
    return response.data;
  },

  // Process refund
  processRefund: async (paymentId, data) => {
    const response = await apiClient.post(
      `/payments/${paymentId}/refund`,
      data
    );
    return response.data;
  },

  // Create credit card token
  createToken: async (cardData) => {
    const response = await apiClient.post("/payments/token", {
      card: cardData,
    });
    return response.data;
  },

  // Get payment methods
  getPaymentMethods: async () => {
    const response = await apiClient.get("/payments/methods");
    return response.data;
  },
};
