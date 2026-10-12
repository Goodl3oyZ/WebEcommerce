import { z } from "zod";

// Hard ceiling; the configured maxMessageLength (≤ this) is checked by the service.
const body = z.string().trim().min(1).max(4000);
const topic = z.object({
  id: z.string().trim().regex(/^[a-z0-9_-]{1,30}$/, "Use a-z, 0-9, - or _"),
  label: z.string().trim().min(1).max(60),
});

export const supportDto = {
  startConversation: z.object({
    topic: z.string().trim().min(1).max(50).describe("One of the topic ids from GET /api/support/config"),
    message: body,
  }),
  postMessage: z.object({ body }),
  listQuery: z.object({
    status: z.enum(["open", "waiting", "active", "closed", "all"]).optional().describe("Default: open (waiting + active)"),
    assigned: z
      .string()
      .optional()
      .describe("me | unassigned | an agent's user id"),
  }),
  assign: z.object({
    agentId: z.string().uuid().nullable().describe("null sends the conversation back to the queue"),
  }),
  updateAgent: z
    .object({
      isAgent: z.boolean().optional(),
      accepting: z.boolean().optional(),
      maxActive: z.number().int().min(1).max(50).nullable().optional().describe("null = use the global limit"),
    })
    .strict(),
  availability: z.object({ accepting: z.boolean() }),
  updateSettings: z
    .object({
      enabled: z.boolean().optional(),
      assignmentMode: z.enum(["auto", "manual"]).optional(),
      maxActivePerAgent: z.number().int().min(1).max(50).optional(),
      messagesPerMinute: z.number().int().min(1).max(60).optional(),
      maxUnanswered: z.number().int().min(1).max(50).optional(),
      maxMessageLength: z.number().int().min(50).max(4000).optional(),
      topics: z.array(topic).min(1).max(20).optional(),
    })
    .strict()
    .refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" }),
};
