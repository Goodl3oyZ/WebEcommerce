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

const router = express.Router();

router.use(apiRateLimiter);
router.use(authMiddleware);
router.use(requireRole(ROLES.ADMIN));

router.get("/dashboard", adminController.getDashboard);
// Can wipe data: super admins only (and disabled in production by default).
router.post("/seed", requireRole(ROLES.SUPER_ADMIN), validationMiddleware(seedDto), adminController.runSeed);

export default router;
