import axiosInstance from "./axiosInstance";

export const cartAPI = {
  // Get user's cart
  getCart: async () => {
    try {
      const response = await axiosInstance.get("/cart");
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { items: [], subtotal: 0 };
      }
      throw error;
    }
  },

  // Add item to cart
  addItem: async (itemData) => {
    try {
      const cartItemData = {
        productId: itemData.productId || itemData.id,
        quantity: parseInt(itemData.quantity, 10),
        variantId: itemData.variantId || null,
      };

      // Validate required fields
      if (!cartItemData.productId) {
        throw new Error("Product ID is required");
      }
      if (!cartItemData.quantity || cartItemData.quantity < 1) {
        throw new Error("Valid quantity is required");
      }

      const response = await axiosInstance.post("/cart/items", cartItemData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update item quantity
  updateItem: async (itemId, quantity) => {
    try {
      if (!itemId) {
        throw new Error("Item ID is required");
      }
      if (!quantity || quantity < 1) {
        throw new Error("Valid quantity is required");
      }

      const response = await axiosInstance.put(`/cart/items/${itemId}`, {
        quantity: parseInt(quantity, 10),
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Remove item
  removeItem: async (itemId) => {
    try {
      if (!itemId) {
        throw new Error("Item ID is required");
      }

      const response = await axiosInstance.delete(`/cart/items/${itemId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Clear cart
  clearCart: async () => {
    try {
      const response = await axiosInstance.delete("/cart/items");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Merge guest cart with user cart
  mergeGuestCart: async ({ items }) => {
    try {
      const response = await axiosInstance.post("/cart/merge", { items });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Checkout cart (DEPRECATED: กรุณาใช้ orderAPI.createOrder แทน)
  checkout: async (checkoutData) => {
    throw new Error(
      "cartAPI.checkout() ถูกยกเลิกแล้ว กรุณาใช้ orderAPI.createOrder แทน"
    );
    // ถ้าจำเป็นต้องใช้ guest checkout ให้แก้ไข backend และ flow ให้รองรับ orderAPI.createOrder
  },
};
