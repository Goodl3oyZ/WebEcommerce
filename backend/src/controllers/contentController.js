import { contentService } from "../services/contentService.js";
import { writeAuditLog } from "../services/auditService.js";
import { parsePagination } from "../utils/pagination.js";

export const contentController = {
  async listArticles(req, res) {
    res.json(await contentService.listArticles(parsePagination(req.query, { defaultLimit: 12 })));
  },

  async getArticle(req, res) {
    res.json(await contentService.getPublished("article", req.params.slug));
  },

  async getPage(req, res) {
    res.json(await contentService.getPublished("page", req.params.slug));
  },

  // --- Admin -----------------------------------------------------------------
  async adminList(req, res) {
    const { kind, status } = req.query;
    res.json(await contentService.adminList({ kind, status }, parsePagination(req.query, { defaultLimit: 20 })));
  },

  async adminGet(req, res) {
    res.json(await contentService.adminGet(req.params.id));
  },

  async create(req, res) {
    const post = await contentService.create(req.body, req.user.id);
    await writeAuditLog({ actorId: req.user.id, entity: "content", entityId: post.id, action: "create", after: { title: post.title, status: post.status } });
    res.status(201).json(post);
  },

  async update(req, res) {
    const post = await contentService.update(req.params.id, req.body);
    await writeAuditLog({ actorId: req.user.id, entity: "content", entityId: post.id, action: "update", after: { title: post.title, status: post.status } });
    res.json(post);
  },

  async remove(req, res) {
    await contentService.remove(req.params.id);
    await writeAuditLog({ actorId: req.user.id, entity: "content", entityId: req.params.id, action: "delete" });
    res.status(204).send();
  },
};
