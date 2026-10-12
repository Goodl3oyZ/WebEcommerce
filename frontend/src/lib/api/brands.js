import axiosInstance from "./axiosInstance";

export const brandsAPI = {
  async getAllBrands() {
    try {
      // Brand pickers need the whole list, not the default page of 10.
      const response = await axiosInstance.get("/brands", { params: { limit: 100 } });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch brands:", error);
      throw error;
    }
  },
};
