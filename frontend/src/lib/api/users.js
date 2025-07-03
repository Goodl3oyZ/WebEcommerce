import { apiClient } from "./apiClient";

export const usersAPI = {
  // Get user profile
  async getProfile() {
    const response = await apiClient.get("/users/profile");
    return response.data;
  },

  // Update user profile
  async updateProfile(formData) {
    const response = await apiClient.put("/uploads/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Delete profile image
  async deleteProfileImage() {
    const response = await apiClient.delete("/uploads/avatar");
    return response.data;
  },

  // Get user preferences
  async getPreferences() {
    const response = await apiClient.get("/users/preferences");
    return response.data;
  },

  // Update user preferences
  async updatePreferences(preferences) {
    const response = await apiClient.put("/users/preferences", preferences);
    return response.data;
  },

  // Get user orders
  getUserOrders: async () => {
    try {
      const response = await apiClient.get("/users/orders");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch orders" };
    }
  },

  // Get user points
  async getUserPoints() {
    const response = await apiClient.get("/users/points");
    return response.data;
  },

  // Get points history
  async getPointsHistory() {
    const response = await apiClient.get("/users/points/history");
    return response.data;
  },
};
