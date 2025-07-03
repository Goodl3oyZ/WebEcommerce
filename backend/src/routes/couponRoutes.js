import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { couponController } from "../controllers/couponController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { couponDto } from "../dtos/coupon.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Apply rate limiter to all coupon routes
router.use(apiRateLimiter);

// User Coupon Routes
router.get("/validate", authMiddleware, couponController.validateCoupon);
router.get("/available", authMiddleware, couponController.getAvailableCoupons);

// Admin Coupon Routes
router.use(authMiddleware);
router.use(requireRole(ROLES.ADMIN));

router.post(
  "/",
  validationMiddleware(couponDto.createCoupon),
  couponController.createCoupon
);
router.put(
  "/:id",
  validationMiddleware(couponDto.updateCoupon),
  couponController.updateCoupon
);
router.delete("/:id", couponController.deleteCoupon);
router.get("/statistics", couponController.getCouponStatistics);
router.post("/:id/activate", couponController.activateCoupon);
router.post("/:id/deactivate", couponController.deactivateCoupon);

export default router;
