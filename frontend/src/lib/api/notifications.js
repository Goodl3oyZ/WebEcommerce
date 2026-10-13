import { apiClient } from "./apiClient";

const data = (p) => p.then((r) => r.data);

/** The signed-in user's own notifications. */
export const notificationsAPI = {
  list: (params) => data(apiClient.get("/notifications", { params })),
  markRead: (id) => data(apiClient.patch(`/notifications/${id}/read`)),
  markAllRead: () => data(apiClient.patch("/notifications/read-all", {})),
  remove: (id) => apiClient.delete(`/notifications/${id}`),
};
