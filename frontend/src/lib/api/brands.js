import axiosInstance from "./axiosInstance";

export const brandsAPI = {
  async getAllBrands() {
    try {
      const response = await axiosInstance.get("/brands");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch brands:", error);
      throw error;
    }
  },
};
