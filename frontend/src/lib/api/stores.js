import { apiClient } from "./apiClient";

export const storesAPI = {
  /** Open branches customers can collect orders from. */
  list: async () => {
    const response = await apiClient.get("/stores", { params: { limit: 100 } });
    return response.data?.items ?? [];
  },

  /** Per open branch: { storeId, available, short: [{ variantId, requested, available }] }. */
  availability: async (items) => {
    const response = await apiClient.post("/stores/availability", { items });
    return response.data?.stores ?? [];
  },
};
