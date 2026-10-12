import { documentRoutes } from "./registry.js";
import { supportDto } from "../dtos/support.dto.js";

const limits =
  "Anti-spam: one open conversation per customer, a topic from the configured list, a per-minute message limit (429 SUPPORT_RATE_LIMIT), a cap on messages in a row without an agent reply (429 SUPPORT_WAIT_FOR_REPLY) and a maximum length.";
const realtime =
  "Clients also receive Socket.IO events (authenticated with the same cookie): support:message, support:conversation, support:assigned, support:typing.";

documentRoutes("Support chat", [
  { method: "get", path: "/api/support/config", summary: "Chat availability, topics and limits", auth: "user", responses: { 200: "{ enabled, topics, maxMessageLength, messagesPerMinute, maxUnanswered }" } },
  { method: "get", path: "/api/support/conversations/current", summary: "My latest conversation with messages (or null)", auth: "user", responses: { 200: "{ conversation }" } },
  { method: "get", path: "/api/support/conversations", summary: "My conversation history", auth: "user", responses: { 200: "{ conversations }" } },
  {
    method: "post",
    path: "/api/support/conversations",
    summary: "Start a conversation",
    description: `${limits} With automatic assignment the conversation goes straight to a free agent; otherwise it waits in the queue. ${realtime}`,
    auth: "user",
    body: supportDto.startConversation,
    responses: { 201: "Conversation with messages", 409: "Already have an open conversation (SUPPORT_ALREADY_OPEN)", 503: "Chat is switched off" },
  },
  { method: "get", path: "/api/support/conversations/:id", summary: "A conversation with its messages", description: "Customers see their own; staff see all.", auth: "user", responses: { 200: "Conversation", 404: "Conversation not found" } },
  {
    method: "post",
    path: "/api/support/conversations/:id/messages",
    summary: "Send a message",
    description: `Customers: ${limits} Staff: the assigned agent or an admin; replying to an unassigned conversation claims it.`,
    auth: "user",
    body: supportDto.postMessage,
    responses: { 201: "Message", 403: "Assigned to another agent", 404: "Conversation not found", 429: "Too many messages" },
  },
  { method: "post", path: "/api/support/conversations/:id/close", summary: "Close a conversation", auth: "user", responses: { 200: "Conversation", 404: "Conversation not found" } },

  { method: "get", path: "/api/support/admin/conversations", summary: "Conversations for staff (queue, mine, all)", auth: "moderator", query: supportDto.listQuery, responses: { 200: "{ conversations }" } },
  { method: "post", path: "/api/support/admin/conversations/:id/claim", summary: "Take a conversation", description: "Agents stay within their active-chat limit; admins may exceed it.", auth: "moderator", responses: { 200: "Conversation", 409: "Taken by another agent, or the agent is at their limit" } },
  { method: "post", path: "/api/support/admin/conversations/:id/assign", summary: "Assign to an agent or return to the queue", auth: "admin", body: supportDto.assign, responses: { 200: "Conversation", 400: "Not a staff account / conversation closed" } },
  { method: "get", path: "/api/support/admin/me", summary: "My agent status, limit and current load", auth: "moderator", responses: { 200: "Agent" } },
  { method: "put", path: "/api/support/admin/availability", summary: "Set my own availability for new chats", auth: "moderator", body: supportDto.availability, responses: { 200: "Agent" } },
  { method: "get", path: "/api/support/admin/agents", summary: "Staff with agent status, limits and load", auth: "admin", responses: { 200: "{ agents }" } },
  { method: "put", path: "/api/support/admin/agents/:userId", summary: "Add/remove an agent, set availability or limit", description: "Removing an agent returns their open chats to the queue.", auth: "admin", body: supportDto.updateAgent, responses: { 200: "Agent", 400: "Not a staff account" } },
  { method: "get", path: "/api/support/admin/settings", summary: "Chat settings", auth: "admin", responses: { 200: "Settings" } },
  { method: "put", path: "/api/support/admin/settings", summary: "Update chat settings (assignment mode, limits, topics)", auth: "admin", body: supportDto.updateSettings, responses: { 200: "Settings" } },
]);
