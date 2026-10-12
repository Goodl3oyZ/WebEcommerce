import { apiClient } from "./apiClient";

const data = (p) => p.then((r) => r.data);

export const supportAPI = {
  config: () => data(apiClient.get("/support/config")),
  current: () => data(apiClient.get("/support/conversations/current")).then((d) => d.conversation),
  start: (topic, message) => data(apiClient.post("/support/conversations", { topic, message })),
  get: (id) => data(apiClient.get(`/support/conversations/${id}`)),
  send: (id, body) => data(apiClient.post(`/support/conversations/${id}/messages`, { body })),
  close: (id) => data(apiClient.post(`/support/conversations/${id}/close`)),

  // staff
  list: (params) => data(apiClient.get("/support/admin/conversations", { params })).then((d) => d.conversations),
  claim: (id) => data(apiClient.post(`/support/admin/conversations/${id}/claim`)),
  assign: (id, agentId) => data(apiClient.post(`/support/admin/conversations/${id}/assign`, { agentId })),
  me: () => data(apiClient.get("/support/admin/me")),
  setAvailability: (accepting) => data(apiClient.put("/support/admin/availability", { accepting })),
  agents: () => data(apiClient.get("/support/admin/agents")).then((d) => d.agents),
  updateAgent: (userId, changes) => data(apiClient.put(`/support/admin/agents/${userId}`, changes)),
  settings: () => data(apiClient.get("/support/admin/settings")),
  updateSettings: (changes) => data(apiClient.put("/support/admin/settings", changes)),
};

const REASONS = {
  SUPPORT_RATE_LIMIT: "ส่งข้อความเร็วเกินไป กรุณารอสักครู่",
  SUPPORT_WAIT_FOR_REPLY: "กรุณารอทีมงานตอบก่อน แล้วค่อยส่งข้อความเพิ่ม",
  SUPPORT_ALREADY_OPEN: "คุณมีบทสนทนาที่เปิดอยู่แล้ว",
  SUPPORT_DISABLED: "ระบบแชทปิดให้บริการชั่วคราว",
  SUPPORT_TAKEN: "มีทีมงานคนอื่นรับเรื่องนี้ไปแล้ว",
  SUPPORT_AGENT_FULL: "คุณรับเรื่องครบจำนวนที่กำหนดแล้ว ปิดเรื่องเดิมก่อน",
};

export const supportError = (e, fallback = "ทำรายการไม่สำเร็จ") =>
  REASONS[e?.response?.data?.code] || e?.response?.data?.message || e?.message || fallback;
