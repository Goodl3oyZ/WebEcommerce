import { shippingService } from "../services/shippingService.js";
import { parsePagination } from "../utils/pagination.js";
import { isAdminRole } from "../utils/roles.js";

const actor = (req) => ({ id: req.user.id, isAdmin: isAdminRole(req.user.role) });

export const shippingController = {
  async getShippingMethods(req, res) {
    res.json(
      await shippingService.getShippingMethods({
        addressId: req.query.addressId,
        userId: req.user?.id,
        includeInactive: isAdminRole(req.user?.role),
      })
    );
  },

  async getShippingZones(req, res) {
    res.json(await shippingService.getShippingZones({ includeInactive: isAdminRole(req.user?.role) }));
  },

  async calculateShipping(req, res) {
    res.json(await shippingService.calculateShippingCost(req.body.addressId, req.body.items, { userId: req.user.id }));
  },

  async trackShipment(req, res) {
    res.json(await shippingService.trackShipment(req.params.trackingNumber, actor(req)));
  },

  async getOrderShipment(req, res) {
    res.json(await shippingService.getOrderShipment(req.params.orderId, actor(req)));
  },

  // --- Admin ---------------------------------------------------------------
  async getShippingStats(req, res) {
    res.json(await shippingService.getShippingStats());
  },

  async getAllShipments(req, res) {
    const { status, search } = req.query;
    res.json(await shippingService.getAllShipments({ status, search }, parsePagination(req.query)));
  },

  async getShipmentById(req, res) {
    res.json(await shippingService.getShipmentById(req.params.id));
  },

  async createShipment(req, res) {
    res.status(201).json(await shippingService.createShipment(req.body));
  },

  async updateShipment(req, res) {
    res.json(await shippingService.updateShipment(req.params.id, req.body, req.user.id));
  },

  async generateShippingLabel(req, res) {
    res.status(201).json(await shippingService.generateShippingLabel(req.params.id));
  },

  async getShippingLabel(req, res) {
    res.json(await shippingService.getShippingLabel(req.params.id));
  },

  async createShippingMethod(req, res) {
    res.status(201).json(await shippingService.createShippingMethod(req.body));
  },

  async updateShippingMethod(req, res) {
    res.json(await shippingService.updateShippingMethod(req.params.id, req.body));
  },

  async deleteShippingMethod(req, res) {
    res.json(await shippingService.deleteShippingMethod(req.params.id));
  },

  async createShippingZone(req, res) {
    res.status(201).json(await shippingService.createShippingZone(req.body));
  },

  async updateShippingZone(req, res) {
    res.json(await shippingService.updateShippingZone(req.params.id, req.body));
  },

  async deleteShippingZone(req, res) {
    res.json(await shippingService.deleteShippingZone(req.params.id));
  },
};
