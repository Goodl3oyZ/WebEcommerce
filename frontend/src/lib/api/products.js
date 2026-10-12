import axiosInstance from "./axiosInstance";
import { APIError } from "./axiosInstance";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const retryRequest = async (requestFn, retries = MAX_RETRIES) => {
  try {
    return await requestFn();
  } catch (error) {
    if (
      retries > 0 &&
      (error.message === "Network Error" || error.code === "ECONNABORTED")
    ) {
      await delay(RETRY_DELAY);
      return retryRequest(requestFn, retries - 1);
    }
    throw error;
  }
};

const productsAPI = {
  getAllProducts: async (params = {}) => {
    try {
      const response = await retryRequest(() =>
        axiosInstance.get("/products", {
          params,
          timeout: 10000, // 10 second timeout
        })
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { products: [], total: 0 };
      }
      if (error.message === "Network Error") {
        throw new APIError(
          "Unable to connect to the server. Please check your internet connection.",
          "NETWORK_ERROR"
        );
      }
      throw new APIError(
        error.response?.data?.message || "Failed to fetch products",
        error.response?.status || 500
      );
    }
  },

  getProductById: async (id) => {
    try {
      const response = await retryRequest(() =>
        axiosInstance.get(`/products/${id}`, {
          timeout: 10000,
        })
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new APIError(
          `Product with ID ${id} not found`,
          "PRODUCT_NOT_FOUND"
        );
      }
      if (error.message === "Network Error") {
        throw new APIError(
          "Unable to connect to the server. Please check your internet connection.",
          "NETWORK_ERROR"
        );
      }
      throw new APIError(
        error.response?.data?.message || "Failed to fetch product details",
        error.response?.status || 500
      );
    }
  },

  getProductsByCategory: async (categoryId, params = {}) => {
    try {
      const response = await axiosInstance.get(
        `/categories/${categoryId}/products`,
        { params }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { products: [], total: 0 };
      }
      throw error;
    }
  },

  searchProducts: async (query, params = {}) => {
    try {
      const response = await retryRequest(() =>
        axiosInstance.get("/products/search", {
          params: { q: query, ...params },
          timeout: 10000,
        })
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { products: [], total: 0 };
      }
      if (error.message === "Network Error") {
        throw new APIError(
          "Unable to connect to the server. Please check your internet connection.",
          "NETWORK_ERROR"
        );
      }
      throw new APIError(
        error.response?.data?.message || "Failed to search products",
        error.response?.status || 500
      );
    }
  },

  // Protected routes
  createProduct: async (productData) => {
    try {
      const response = await axiosInstance.post("/products", productData);
      return {
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  },

  updateProduct: async (id, productData) => {
    try {
      const response = await axiosInstance.put(`/products/${id}`, productData);
      return {
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  },

  deleteProduct: async (id) => {
    try {
      const response = await axiosInstance.delete(`/products/${id}`);
      return {
        status: response.status,
        data: response.data, // จะเป็น undefined ใน 204 แต่ไม่เป็นไร
      };
    } catch (error) {
      throw error;
    }
  },
  // User routes (requires auth)
  createReview: async (productId, reviewData) => {
    try {
      // The API only accepts these fields (the author is the logged-in user).
      const { rating, comment } = reviewData;
      const response = await axiosInstance.post(`/products/${productId}/review`, {
        rating,
        comment,
      });
      return {
        status: response.status,
        data: response.data, // จะเป็น undefined ใน 204 แต่ไม่เป็นไร
      };
    } catch (error) {
      throw error;
    }
  },

  updateReview: async (productId, reviewId, reviewData) => {
    try {
      const { rating, comment } = reviewData;
      const response = await axiosInstance.put(
        `/products/${productId}/review/${reviewId}`,
        { rating, comment }
      );
      return {
        status: response.status,
        data: response.data, // จะเป็น undefined ใน 204 แต่ไม่เป็นไร
      };
    } catch (error) {
      throw error;
    }
  },

  deleteReview: async (productId, reviewId) => {
    try {
      const response = await axiosInstance.delete(
        `/products/${productId}/review/${reviewId}`
      );
      return {
        status: response.status,
        data: response.data, // จะเป็น undefined ใน 204 แต่ไม่เป็นไร
      };
    } catch (error) {
      throw error;
    }
  },

  // Product variants (Admin only)
  createVariant: async (productId, variantData) => {
    try {
      console.log("Sending variant data to backend:", variantData); // Debug log
      console.log("Type of variantData:", typeof variantData); // Debug log
      console.log("Is Array?", Array.isArray(variantData)); // Debug log

      const response = await axiosInstance.post(
        `/products/${productId}/variants`,
        variantData
      );
      return {
        status: response.status,
        data: response.data, // จะเป็น undefined ใน 204 แต่ไม่เป็นไร
      };
    } catch (error) {
      throw error;
    }
  },

  updateVariant: async (productId, variantId, variantData) => {
    try {
      const response = await axiosInstance.put(
        `/products/${productId}/variants/${variantId}`,
        variantData
      );
      return {
        status: response.status,
        data: response.data, // จะเป็น undefined ใน 204 แต่ไม่เป็นไร
      };
    } catch (error) {
      throw error;
    }
  },

  deleteVariant: async (productId, variantId) => {
    try {
      const response = await axiosInstance.delete(
        `/products/${productId}/variants/${variantId}`
      );
      return {
        status: response.status,
        data: response.data, // จะเป็น undefined ใน 204 แต่ไม่เป็นไร
      };
    } catch (error) {
      throw error;
    }
  },
};

export { productsAPI };
