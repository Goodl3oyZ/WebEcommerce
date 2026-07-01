import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { couponController } from "../controllers/couponController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { couponDto } from "../dtos/coupon.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);

// User routes (auth required)
router.get("/validate", authMiddleware, couponController.validateCoupon);
router.get("/available", authMiddleware, couponController.getAvailableCoupons);

// Admin routes
router.use(authMiddleware);
router.use(requireAdmin);

router.get("/statistics", couponController.getCouponStatistics);
router.get("/", couponController.getCoupons);
router.post(
  "/",
  validationMiddleware(couponDto.createCoupon),
  couponController.createCoupon
);
router.get("/:id/usage", couponController.getCouponUsage);
router.post("/:id/activate", couponController.activateCoupon);
router.post("/:id/deactivate", couponController.deactivateCoupon);
router.get("/:id", couponController.getCouponById);
router.put(
  "/:id",
  validationMiddleware(couponDto.updateCoupon),
  couponController.updateCoupon
);
router.patch(
  "/:id",
  validationMiddleware(couponDto.updateCoupon),
  couponController.updateCoupon
);
router.delete("/:id", couponController.deleteCoupon);

export default router;
