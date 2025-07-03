import express from "express";
import { shippingController } from "../controllers/shippingController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { shippingDto } from "../dtos/shipping.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Apply rate limiter to all shipping routes
router.use(apiRateLimiter);

// Public routes
router.get("/methods", shippingController.getShippingMethods);
router.get("/zones", shippingController.getShippingZones);
router.post("/calculate", shippingController.calculateShipping);

// Protected routes (require authentication)
router.use(authMiddleware);

// Shipment tracking
router.get("/tracking/:trackingNumber", shippingController.trackShipment);
router.get("/order/:orderId", shippingController.getOrderShipment);

// Admin routes
const requireAdmin = requireRole(ROLES.ADMIN);

// Shipping methods management
router.post(
  "/methods",
  validationMiddleware(shippingDto.createShippingMethod),
  shippingController.createShippingMethod
);
router.put(
  "/methods/:id",
  validationMiddleware(shippingDto.updateShippingMethod),
  shippingController.updateShippingMethod
);
router.delete("/methods/:id", shippingController.deleteShippingMethod);

// Shipping zones management
router.post(
  "/zones",
  validationMiddleware(shippingDto.createShippingZone),
  shippingController.createShippingZone
);
router.put(
  "/zones/:id",
  validationMiddleware(shippingDto.updateShippingZone),
  shippingController.updateShippingZone
);
router.delete("/zones/:id", shippingController.deleteShippingZone);

// Shipment management
router.post(
  "/",
  validationMiddleware(shippingDto.createShipment),
  shippingController.createShipment
);
router.put(
  "/:id",
  validationMiddleware(shippingDto.updateShipment),
  shippingController.updateShipment
);
router.get("/:id", shippingController.getShipmentById);
router.get("/", shippingController.getAllShipments);
router.get("/stats", shippingController.getShippingStats);

// Shipping labels
router.post("/:id/label", shippingController.generateShippingLabel);
router.get("/:id/label", shippingController.getShippingLabel);

export default router;
