import express from "express";
import { adminController } from "../controllers/adminController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole(ROLES.ADMIN));

router.get("/dashboard", adminController.getDashboard);

export default router;
