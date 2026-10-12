import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { addressController } from "../controllers/addressController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { addressDto } from "../dtos/address.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";
import { uuidParam } from "../middlewares/uuidParam.js";

const router = express.Router();
router.param("id", uuidParam("Address not found"));
router.param("userId", uuidParam("User not found"));
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);
router.use(authMiddleware);

// Own addresses
router.get("/", addressController.getUserAddresses);
router.post("/", validationMiddleware(addressDto.createAddress), addressController.createAddress);
router.put("/:id", validationMiddleware(addressDto.updateAddress), addressController.updateAddress);
router.put("/:id/default", addressController.setDefaultAddress);
router.delete("/:id", addressController.deleteAddress);

// Admin
router.get(
  "/admin/all",
  requireAdmin,
  validationMiddleware(addressDto.adminListQuery, "query"),
  addressController.getAllAddresses
);
router.get("/admin/user/:userId", requireAdmin, addressController.getUserAddressesAdmin);
router.get("/admin/:id", requireAdmin, addressController.getAddressByIdAdmin);

export default router;
