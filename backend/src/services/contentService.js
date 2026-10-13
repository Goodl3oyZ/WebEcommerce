/**
 * Blog articles and site pages (About) written in the admin panel.
 * Visitors only ever see published posts; drafts are admin-only.
 */
import { randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { BUCKETS, deleteFile, getFileUrl, toStoredKey } from "../config/minio.js";
import { posts } from "../models/schema.js";
import { ApiError } from "../utils/ApiError.js";
import { paginationMeta } from "../utils/pagination.js";

const MAX_PAGE = 50;

/** a-z0-9 slug from a title; Thai-only titles get a short random one. */
export function slugify(title) {
  const base = String(title)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
  return base || `post-${randomBytes(3).toString("hex")}`;
}

/** Uploaded files are stored as keys; site paths ("/landing/x.webp") and URLs pass through. */
const coverUrl = (value) => {
  if (!value) return null;
  if (value.startsWith("/") || /^https?:\/\//.test(value)) return value;
  return getFileUrl(BUCKETS.SITE, value);
};
const storedCover = (value) => (value ? toStoredKey(BUCKETS.SITE, value) : null);
const isUploadedKey = (value) => Boolean(value) && !value.startsWith("/") && !/^https?:\/\//.test(value);

function present(post, { withContent = true } = {}) {
  if (!post) return post;
  const { author, content, ...rest } = post;
  return {
    ...rest,
    ...(withContent ? { content } : {}),
    coverImageUrl: coverUrl(post.coverImage),
    author: author ? { id: author.id, name: author.name } : null,
  };
}

const withAuthor = { author: { columns: { id: true, name: true } } };

async function uniqueSlug(slug, exceptId) {
  const taken = await db.query.posts.findFirst({ where: eq(posts.slug, slug), columns: { id: true } });
  if (taken && taken.id !== exceptId) {
    throw new ApiError(409, `The address "${slug}" is already used by another post`, null, "SLUG_TAKEN");
  }
  return slug;
}

async function findById(id) {
  const post = await db.query.posts.findFirst({ where: eq(posts.id, id), with: withAuthor });
  if (!post) throw ApiError.notFound("Post not found");
  return post;
}

export const contentService = {
  /** Published articles, newest first (no body). */
  async listArticles(pagination) {
    const limit = Math.min(pagination.limit, MAX_PAGE);
    const where = and(eq(posts.kind, "article"), eq(posts.status, "published"));
    const [items, [{ total }]] = await Promise.all([
      db.query.posts.findMany({
        where,
        with: withAuthor,
        orderBy: [desc(posts.publishedAt)],
        limit,
        offset: pagination.offset,
      }),
      db.select({ total: sql`count(*)::int` }).from(posts).where(where),
    ]);
    return {
      articles: items.map((p) => present(p, { withContent: false })),
      pagination: paginationMeta(total, { ...pagination, limit }),
    };
  },

  async getPublished(kind, slug) {
    const post = await db.query.posts.findFirst({
      where: and(eq(posts.kind, kind), eq(posts.slug, slug), eq(posts.status, "published")),
      with: withAuthor,
    });
    if (!post) throw ApiError.notFound(kind === "page" ? "Page not found" : "Article not found");
    return present(post);
  },

  // --- Admin -----------------------------------------------------------------
  async adminList({ kind, status }, pagination) {
    const limit = Math.min(pagination.limit, MAX_PAGE);
    const where = and(kind ? eq(posts.kind, kind) : undefined, status ? eq(posts.status, status) : undefined);
    const [items, [{ total }]] = await Promise.all([
      db.query.posts.findMany({
        where,
        with: withAuthor,
        orderBy: [desc(posts.updatedAt)],
        limit,
        offset: pagination.offset,
      }),
      db.select({ total: sql`count(*)::int` }).from(posts).where(where),
    ]);
    return {
      posts: items.map((p) => present(p, { withContent: false })),
      pagination: paginationMeta(total, { ...pagination, limit }),
    };
  },

  async adminGet(id) {
    return present(await findById(id));
  },

  async create(data, actorId) {
    const slug = await uniqueSlug(data.slug || slugify(data.title));
    const [row] = await db
      .insert(posts)
      .values({
        kind: data.kind,
        slug,
        title: data.title,
        excerpt: data.excerpt || null,
        content: data.content ?? "",
        coverImage: storedCover(data.coverImage),
        status: data.status,
        publishedAt: data.status === "published" ? new Date() : null,
        authorId: actorId ?? null,
      })
      .returning();
    return present(await findById(row.id));
  },

  async update(id, data) {
    const current = await findById(id);
    const changes = { updatedAt: new Date() };
    for (const key of ["kind", "title", "content", "status"]) if (data[key] !== undefined) changes[key] = data[key];
    if (data.excerpt !== undefined) changes.excerpt = data.excerpt || null;
    if (data.slug !== undefined) changes.slug = await uniqueSlug(data.slug, id);
    if (data.coverImage !== undefined) changes.coverImage = storedCover(data.coverImage);
    // First publish sets the date; later edits keep it.
    if (data.status === "published" && !current.publishedAt) changes.publishedAt = new Date();

    await db.update(posts).set(changes).where(eq(posts.id, id));
    // A replaced uploaded cover is no longer used anywhere.
    if (changes.coverImage !== undefined && isUploadedKey(current.coverImage) && current.coverImage !== changes.coverImage) {
      await deleteFile(BUCKETS.SITE, current.coverImage).catch(() => {});
    }
    return present(await findById(id));
  },

  async remove(id) {
    const current = await findById(id);
    await db.delete(posts).where(eq(posts.id, id));
    if (isUploadedKey(current.coverImage)) await deleteFile(BUCKETS.SITE, current.coverImage).catch(() => {});
  },
};
