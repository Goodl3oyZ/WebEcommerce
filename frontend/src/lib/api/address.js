import { apiClient } from "./apiClient";

export const addressAPI = {
  // Get user addresses
  getAddresses: async () => {
    const response = await apiClient.get("/addresses");
    return response.data;
  },

  // Create new address
  createAddress: async (addressData) => {
    const response = await apiClient.post("/addresses", addressData);
    return response.data;
  },

  // Update existing address
  updateAddress: async (addressId, addressData) => {
    const response = await apiClient.put(
      `/addresses/${addressId}`,
      addressData
    );
    return response.data;
  },

  // Set address as default
  setDefaultAddress: async (addressId) => {
    const response = await apiClient.put(`/addresses/${addressId}/default`);
    return response.data;
  },

  // Delete address
  deleteAddress: async (addressId) => {
    const response = await apiClient.delete(`/addresses/${addressId}`);
    return response.data;
  },

  // Get all provinces
  getProvinces: async () => {
    const response = await fetch("/api/addressData/provinces");
    return response.json();
  },

  // Get districts by province name
  getDistricts: async (provinceName) => {
    const response = await fetch(
      `/api/addressData/districts?province=${encodeURIComponent(provinceName)}`
    );
    return response.json();
  },

  // Get subdistricts by district name. District names repeat across
  // provinces, so pass the province to get the right ones.
  getSubdistricts: async (districtName, provinceName) => {
    const params = new URLSearchParams({ district: districtName });
    if (provinceName) params.set("province", provinceName);
    const response = await fetch(`/api/addressData/subdistricts?${params}`);
    return response.json();
  },
};
