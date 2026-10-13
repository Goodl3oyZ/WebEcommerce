import { apiClient } from "./apiClient";

const data = (p) => p.then((r) => r.data);

/** Admin: blog articles and site pages (drafts included). */
export const contentAPI = {
  list: (params) => data(apiClient.get("/content/admin", { params })),
  get: (id) => data(apiClient.get(`/content/admin/${id}`)),
  create: (body) => data(apiClient.post("/content/admin", body)),
  update: (id, body) => data(apiClient.put(`/content/admin/${id}`, body)),
  remove: (id) => apiClient.delete(`/content/admin/${id}`),
};
