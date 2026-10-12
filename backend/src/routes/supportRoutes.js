import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";
import { uuidParam } from "../middlewares/uuidParam.js";
import { supportController } from "../controllers/supportController.js";
import { supportDto } from "../dtos/support.dto.js";

const router = express.Router();
router.param("id", uuidParam("Conversation not found"));
router.param("userId", uuidParam("Agent not found"));
router.use(apiRateLimiter);
router.use(authMiddleware);

const staff = requireRole(ROLES.MODERATOR);
const admin = requireRole(ROLES.ADMIN);

// Staff (agents and admins)
router.get("/admin/conversations", staff, validationMiddleware(supportDto.listQuery, "query"), supportController.listForStaff);
router.post("/admin/conversations/:id/claim", staff, supportController.claim);
router.post("/admin/conversations/:id/assign", admin, validationMiddleware(supportDto.assign), supportController.assign);
router.get("/admin/me", staff, supportController.getMe);
router.put("/admin/availability", staff, validationMiddleware(supportDto.availability), supportController.setAvailability);
router.get("/admin/agents", admin, supportController.listAgents);
router.put("/admin/agents/:userId", admin, validationMiddleware(supportDto.updateAgent), supportController.updateAgent);
router.get("/admin/settings", admin, supportController.getSettings);
router.put("/admin/settings", admin, validationMiddleware(supportDto.updateSettings), supportController.updateSettings);

// Customers (and staff, for conversations they can see)
router.get("/config", supportController.getConfig);
router.get("/conversations/current", supportController.getCurrent);
router.get("/conversations", supportController.listMine);
router.post("/conversations", validationMiddleware(supportDto.startConversation), supportController.start);
router.get("/conversations/:id", supportController.getConversation);
router.post("/conversations/:id/messages", validationMiddleware(supportDto.postMessage), supportController.postMessage);
router.post("/conversations/:id/close", supportController.close);

export default router;
