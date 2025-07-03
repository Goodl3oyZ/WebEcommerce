import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { addressController } from "../controllers/addressController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { addressDto } from "../dtos/address.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Apply rate limiter to all address routes
router.use(apiRateLimiter);

// Protected routes (auth required)
router.use(authMiddleware);

// User routes
router.get("/", addressController.getUserAddresses);
router.post(
  "/",
  validationMiddleware(addressDto.createAddress),
  addressController.createAddress
);
router.put(
  "/:id",
  validationMiddleware(addressDto.updateAddress),
  addressController.updateAddress
);
router.put("/:id/default", addressController.setDefaultAddress);
router.delete("/:id", addressController.deleteAddress);

// Admin routes
router.get(
  "/admin/all",
  requireRole(ROLES.ADMIN),
  addressController.getAllAddresses
);
router.get(
  "/admin/user/:userId",
  requireRole(ROLES.ADMIN),
  addressController.getUserAddresses
);
router.get(
  "/admin/:id",
  requireRole(ROLES.ADMIN),
  addressController.getAddressById
);

export default router;
