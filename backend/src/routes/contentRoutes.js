import express from "express";
import { contentController } from "../controllers/contentController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { contentDto } from "../dtos/content.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";
import { uuidParam } from "../middlewares/uuidParam.js";

const router = express.Router();
router.param("id", uuidParam("Post not found"));
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);

// Public: published content only.
router.get("/articles", validationMiddleware(contentDto.listQuery, "query"), contentController.listArticles);
router.get("/articles/:slug", contentController.getArticle);
router.get("/pages/:slug", contentController.getPage);

// Admin: drafts included.
router.use("/admin", authMiddleware, requireAdmin);
router.get("/admin", validationMiddleware(contentDto.adminListQuery, "query"), contentController.adminList);
router.get("/admin/:id", contentController.adminGet);
router.post("/admin", validationMiddleware(contentDto.create), contentController.create);
router.put("/admin/:id", validationMiddleware(contentDto.update), contentController.update);
router.delete("/admin/:id", contentController.remove);

export default router;
