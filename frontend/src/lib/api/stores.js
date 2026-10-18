import { apiClient } from "./apiClient";

export const storesAPI = {
  /** Open branches customers can collect orders from. */
  list: async () => {
    const response = await apiClient.get("/stores", { params: { limit: 100 } });
    return response.data?.items ?? [];
  },
};
