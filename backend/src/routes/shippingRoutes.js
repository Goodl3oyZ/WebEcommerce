import express from "express";
import { shippingController } from "../controllers/shippingController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { shippingDto } from "../dtos/shipping.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);

// Public
router.get("/methods", shippingController.getShippingMethods);
router.get("/zones", shippingController.getShippingZones);
router.post("/calculate", shippingController.calculateShipping);

router.use(authMiddleware);

// Static auth paths
router.get("/tracking/:trackingNumber", shippingController.trackShipment);
router.get("/order/:orderId", shippingController.getOrderShipment);
router.get("/stats", requireAdmin, shippingController.getShippingStats);

// Admin — methods & zones
router.post(
  "/methods",
  requireAdmin,
  validationMiddleware(shippingDto.createShippingMethod),
  shippingController.createShippingMethod
);
router.put(
  "/methods/:id",
  requireAdmin,
  validationMiddleware(shippingDto.updateShippingMethod),
  shippingController.updateShippingMethod
);
router.delete(
  "/methods/:id",
  requireAdmin,
  shippingController.deleteShippingMethod
);
router.post(
  "/zones",
  requireAdmin,
  validationMiddleware(shippingDto.createShippingZone),
  shippingController.createShippingZone
);
router.put(
  "/zones/:id",
  requireAdmin,
  validationMiddleware(shippingDto.updateShippingZone),
  shippingController.updateShippingZone
);
router.delete("/zones/:id", requireAdmin, shippingController.deleteShippingZone);

// Admin — shipments (list/stats before /:id)
router.get("/", requireAdmin, shippingController.getAllShipments);
router.post(
  "/",
  requireAdmin,
  validationMiddleware(shippingDto.createShipment),
  shippingController.createShipment
);
router.get("/:id/label", requireAdmin, shippingController.getShippingLabel);
router.post("/:id/label", requireAdmin, shippingController.generateShippingLabel);
router.get("/:id", requireAdmin, shippingController.getShipmentById);
router.put(
  "/:id",
  requireAdmin,
  validationMiddleware(shippingDto.updateShipment),
  shippingController.updateShipment
);

export default router;
