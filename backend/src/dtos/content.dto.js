import { z } from "zod";

export const POST_KINDS = ["article", "page"];
export const POST_STATUSES = ["draft", "published"];
// Lowercase latin letters, digits and single dashes: safe in any URL.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const page = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional().describe("Max 50 (larger values are capped)"),
};

const fields = {
  kind: z.enum(POST_KINDS),
  title: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(160)
    .regex(SLUG, "Use a-z, 0-9 and dashes (e.g. how-to-choose-a-watch)")
    .describe("Created from the title when omitted"),
  excerpt: z.string().trim().max(500).nullable(),
  content: z.string().max(200_000).describe("HTML from the editor; sanitized when shown"),
  coverImage: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .describe("Key from /api/uploads/site, or a site path like /landing/train.webp"),
  status: z.enum(POST_STATUSES),
};

export const contentDto = {
  listQuery: z.object(page),
  adminListQuery: z.object({
    ...page,
    kind: z.enum(POST_KINDS).optional(),
    status: z.enum(POST_STATUSES).optional(),
  }),
  create: z
    .object({
      ...fields,
      kind: fields.kind.default("article"),
      slug: fields.slug.optional(),
      excerpt: fields.excerpt.optional(),
      content: fields.content.default(""),
      coverImage: fields.coverImage.optional(),
      status: fields.status.default("draft"),
    })
    .strict(),
  update: z
    .object(fields)
    .partial()
    .strict()
    .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided for update" }),
};
