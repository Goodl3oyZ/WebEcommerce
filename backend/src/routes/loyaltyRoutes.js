import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { loyaltyController } from "../controllers/loyaltyController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { loyaltyDto } from "../dtos/loyalty.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Apply rate limiter to all loyalty routes
router.use(apiRateLimiter);

// User Loyalty Routes
router.use(authMiddleware);

router.get("/points", loyaltyController.getLoyaltyPoints);
router.get("/history", loyaltyController.getPointsHistory);
router.get("/rewards", loyaltyController.getAvailableRewards);
router.post(
  "/rewards/redeem/:id",
  validationMiddleware(loyaltyDto.redeemReward),
  loyaltyController.redeemReward
);

// Admin Loyalty Routes
router.use(requireRole(ROLES.ADMIN));

router.get("/statistics", loyaltyController.getLoyaltyStatistics);
router.get("/tiers", loyaltyController.getLoyaltyTiers);
router.post(
  "/tiers",
  validationMiddleware(loyaltyDto.createReward),
  loyaltyController.createLoyaltyTier
);
router.put(
  "/tiers/:id",
  validationMiddleware(loyaltyDto.updateReward),
  loyaltyController.updateLoyaltyTier
);
router.post(
  "/rewards",
  validationMiddleware(loyaltyDto.createReward),
  loyaltyController.createReward
);
router.put(
  "/rewards/:id",
  validationMiddleware(loyaltyDto.updateReward),
  loyaltyController.updateReward
);
router.delete("/rewards/:id", loyaltyController.deleteReward);

export default router;
