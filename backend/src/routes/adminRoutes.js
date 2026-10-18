import express from "express";
import { z } from "zod";
import { adminController } from "../controllers/adminController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

export const seedDto = z
  .object({
    seedType: z.enum(["address", "shipping", "main", "all"]),
    confirm: z.string().optional().describe('Required for destructive seeds: "DELETE EXISTING DATA"'),
  })
  .strict();

export const DEMO_REMOVE_CONFIRMATION = "REMOVE DEMO DATA";
export const demoRemoveDto = z
  .object({ confirm: z.literal(DEMO_REMOVE_CONFIRMATION).describe(`Must be "${DEMO_REMOVE_CONFIRMATION}"`) })
  .strict();

export const auditLogQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
  actorId: z.string().uuid().optional(),
  entity: z.string().trim().max(50).optional().describe('First part of the route, e.g. "products", "orders", or "auth" for sign-ins'),
  action: z.string().trim().max(50).optional().describe('e.g. "create", "update", "delete", "login", "login_failed"'),
  search: z.string().trim().max(100).optional().describe("Actor email, target id or route"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const router = express.Router();

router.use(apiRateLimiter);
router.use(authMiddleware);
router.use(requireRole(ROLES.ADMIN));

router.get("/dashboard", adminController.getDashboard);
router.get("/audit-logs", validationMiddleware(auditLogQuery, "query"), adminController.listAuditLogs);
// Can wipe data: super admins only (and disabled in production by default).
router.get("/seed/preview", requireRole(ROLES.SUPER_ADMIN), adminController.getSeedPreview);
router.post("/seed", requireRole(ROLES.SUPER_ADMIN), validationMiddleware(seedDto), adminController.runSeed);
// Demo catalogue: only adds/removes its own rows, so it also works in production.
router.get("/demo-data", requireRole(ROLES.SUPER_ADMIN), adminController.getDemoData);
router.post("/demo-data", requireRole(ROLES.SUPER_ADMIN), adminController.installDemoData);
router.post("/demo-data/remove", requireRole(ROLES.SUPER_ADMIN), validationMiddleware(demoRemoveDto), adminController.removeDemoData);

export default router;
