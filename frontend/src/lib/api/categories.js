import axiosInstance from "./axiosInstance";

const categoriesAPI = {
  getAllCategories: async () => {
    try {
      const response = await axiosInstance.get("/categories");
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return []; // Return empty array if no categories found
      }
      throw error;
    }
  },

  getCategoryById: async (id) => {
    try {
      const response = await axiosInstance.get(`/categories/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // Return null if category not found
      }
      throw error;
    }
  },

  getCategoryProducts: async (id, params = {}) => {
    try {
      const response = await axiosInstance.get(`/categories/${id}/products`, {
        params,
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { products: [], total: 0 }; // Return empty result if no products found
      }
      throw error;
    }
  },

  // Protected routes
  createCategory: async (categoryData) => {
    try {
      const response = await axiosInstance.post("/categories", categoryData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateCategory: async (id, categoryData) => {
    try {
      const response = await axiosInstance.put(
        `/categories/${id}`,
        categoryData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteCategory: async (id) => {
    try {
      const response = await axiosInstance.delete(`/categories/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export { categoriesAPI };
