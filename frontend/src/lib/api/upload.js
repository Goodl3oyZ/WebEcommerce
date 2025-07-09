import axiosInstance from "./axiosInstance";

export const uploadAPI = {
  // ---------- Upload ----------
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await axiosInstance.put("/uploads/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  uploadProductImage: async (file, productId) => {
    const formData = new FormData();
    formData.append("image", file);
    if (productId) formData.append("productId", productId);
    const res = await axiosInstance.post("/uploads/product", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  uploadBrandLogo: async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await axiosInstance.put("/uploads/brand", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  uploadStoreImage: async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await axiosInstance.put("/uploads/store", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  uploadReviewImage: async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await axiosInstance.put("/uploads/review", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // ---------- Delete ----------
  deleteAvatar: async () => {
    const res = await axiosInstance.delete("/uploads/avatar");
    return res.data;
  },

  deleteProductImage: async () => {
    const res = await axiosInstance.delete("/uploads/product");
    return res.data;
  },

  deleteBrandLogo: async () => {
    const res = await axiosInstance.delete("/uploads/brand");
    return res.data;
  },

  deleteStoreImage: async () => {
    const res = await axiosInstance.delete("/uploads/store");
    return res.data;
  },

  deleteReviewImage: async () => {
    const res = await axiosInstance.delete("/uploads/review");
    return res.data;
  },
};
