import { documentRoutes } from "./registry.js";
import { contentDto } from "../dtos/content.dto.js";

const shape =
  "Each post has `kind` (article | page), `slug`, `title`, `excerpt`, `content` (editor HTML, sanitize before display), `coverImageUrl`, `status`, `publishedAt` and `author`.";

documentRoutes("Content", [
  {
    method: "get",
    path: "/api/content/articles",
    summary: "Published blog articles, newest first",
    description: "Without `content`. " + shape,
    auth: "public",
    query: contentDto.listQuery,
    responses: { 200: "Articles and pagination" },
  },
  {
    method: "get",
    path: "/api/content/articles/:slug",
    summary: "One published article",
    auth: "public",
    responses: { 200: "Article", 404: "Not found or not published" },
  },
  {
    method: "get",
    path: "/api/content/pages/:slug",
    summary: "A published site page (e.g. about)",
    auth: "public",
    responses: { 200: "Page", 404: "Not found or not published" },
  },
  {
    method: "get",
    path: "/api/content/admin",
    summary: "All posts including drafts",
    auth: "admin",
    query: contentDto.adminListQuery,
    responses: { 200: "Posts and pagination" },
  },
  { method: "get", path: "/api/content/admin/:id", summary: "One post (any status)", auth: "admin", responses: { 200: "Post", 404: "Not found" } },
  {
    method: "post",
    path: "/api/content/admin",
    summary: "Create an article or page",
    description: "The slug is made from the title when omitted. Publishing sets `publishedAt` once.",
    auth: "admin",
    body: contentDto.create,
    responses: { 201: "Post", 409: "Slug already used (SLUG_TAKEN)" },
  },
  {
    method: "put",
    path: "/api/content/admin/:id",
    summary: "Edit a post",
    description: "A replaced uploaded cover image is deleted from storage.",
    auth: "admin",
    body: contentDto.update,
    responses: { 200: "Post", 404: "Not found", 409: "Slug already used (SLUG_TAKEN)" },
  },
  { method: "delete", path: "/api/content/admin/:id", summary: "Delete a post (and its uploaded cover)", auth: "admin", responses: { 204: "Deleted", 404: "Not found" } },
]);
