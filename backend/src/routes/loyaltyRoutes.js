import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { loyaltyController } from "../controllers/loyaltyController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { loyaltyDto } from "../dtos/loyalty.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.use(apiRateLimiter);
router.use(authMiddleware);

// Customers
router.get("/points", loyaltyController.getLoyaltyPoints);
router.get("/history", validationMiddleware(loyaltyDto.historyQuery, "query"), loyaltyController.getPointsHistory);
router.get("/rewards", loyaltyController.getAvailableRewards);
router.post("/rewards/redeem/:id", loyaltyController.redeemReward);

// Admin
router.use(requireRole(ROLES.ADMIN));
router.get(
  "/statistics",
  validationMiddleware(loyaltyDto.statisticsQuery, "query"),
  loyaltyController.getLoyaltyStatistics
);
router.get("/tiers", loyaltyController.getLoyaltyTiers);
// Tiers and rewards are fixed in code: these answer 501 Not Supported.
router.post("/tiers", loyaltyController.createLoyaltyTier);
router.put("/tiers/:id", loyaltyController.updateLoyaltyTier);
router.post("/rewards", loyaltyController.createReward);
router.put("/rewards/:id", loyaltyController.updateReward);
router.delete("/rewards/:id", loyaltyController.deleteReward);

export default router;
