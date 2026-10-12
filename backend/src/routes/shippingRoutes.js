import express from "express";
import { shippingController } from "../controllers/shippingController.js";
import { authMiddleware, optionalAuth } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { shippingDto } from "../dtos/shipping.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";
import { uuidParam } from "../middlewares/uuidParam.js";
import { ApiError } from "../utils/ApiError.js";

const router = express.Router();
router.param("id", uuidParam("Not found"));
router.param("orderId", uuidParam("Shipment not found"));
const requireAdmin = requireRole(ROLES.ADMIN);

/** Looking up methods for a specific address requires owning it. */
const requireLoginForAddress = (req, res, next) =>
  req.query.addressId && !req.user ? next(ApiError.unauthorized("Log in to see shipping for an address")) : next();

router.use(apiRateLimiter);

// Public (admins additionally see disabled methods/zones).
router.get(
  "/methods",
  optionalAuth,
  validationMiddleware(shippingDto.methodsQuery, "query"),
  requireLoginForAddress,
  shippingController.getShippingMethods
);
router.get("/zones", optionalAuth, shippingController.getShippingZones);

router.use(authMiddleware);

// Customers (own addresses/orders; admins any)
router.post("/calculate", validationMiddleware(shippingDto.calculate), shippingController.calculateShipping);
router.get("/tracking/:trackingNumber", shippingController.trackShipment);
router.get("/order/:orderId", shippingController.getOrderShipment);

// Admin: methods and zones
router.post("/methods", requireAdmin, validationMiddleware(shippingDto.createShippingMethod), shippingController.createShippingMethod);
router.put("/methods/:id", requireAdmin, validationMiddleware(shippingDto.updateShippingMethod), shippingController.updateShippingMethod);
router.delete("/methods/:id", requireAdmin, shippingController.deleteShippingMethod);
router.post("/zones", requireAdmin, validationMiddleware(shippingDto.createShippingZone), shippingController.createShippingZone);
router.put("/zones/:id", requireAdmin, validationMiddleware(shippingDto.updateShippingZone), shippingController.updateShippingZone);
router.delete("/zones/:id", requireAdmin, shippingController.deleteShippingZone);

// Admin: shipments
router.get("/stats", requireAdmin, shippingController.getShippingStats);
router.get("/", requireAdmin, validationMiddleware(shippingDto.listQuery, "query"), shippingController.getAllShipments);
router.post("/", requireAdmin, validationMiddleware(shippingDto.createShipment), shippingController.createShipment);
router.get("/:id/label", requireAdmin, shippingController.getShippingLabel);
router.post("/:id/label", requireAdmin, shippingController.generateShippingLabel);
router.get("/:id", requireAdmin, shippingController.getShipmentById);
router.put("/:id", requireAdmin, validationMiddleware(shippingDto.updateShipment), shippingController.updateShipment);

export default router;
