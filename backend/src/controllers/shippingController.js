import { shippingService } from "../services/shippingService.js";

export const shippingController = {
  async calculateShippingCost(req, res) {
    try {
      const { addressId, items } = req.body;
      const cost = await shippingService.calculateShippingCost(
        addressId,
        items
      );
      res.json(cost);
    } catch (error) {
      if (error.message === "Address not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error calculating shipping cost",
        error: error.message,
      });
    }
  },

  async getShippingMethods(req, res) {
    try {
      const { addressId } = req.query;
      const methods = await shippingService.getShippingMethods(addressId);
      res.json(methods);
    } catch (error) {
      if (error.message === "Address not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error fetching shipping methods",
        error: error.message,
      });
    }
  },

  async createShippingLabel(req, res) {
    try {
      const { orderId, shippingMethod } = req.body;
      const label = await shippingService.createShippingLabel(
        orderId,
        shippingMethod
      );
      res.status(201).json(label);
    } catch (error) {
      if (error.message === "Order not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Invalid shipping method") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error creating shipping label",
        error: error.message,
      });
    }
  },

  async trackShipment(req, res) {
    try {
      const { trackingNumber } = req.params;
      const tracking = await shippingService.trackShipment(trackingNumber);
      res.json(tracking);
    } catch (error) {
      if (error.message === "Shipment not found") {
        return res.status(404).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error tracking shipment", error: error.message });
    }
  },

  async updateShipmentStatus(req, res) {
    try {
      const { trackingNumber } = req.params;
      const { status, location } = req.body;
      const shipment = await shippingService.updateShipmentStatus(
        trackingNumber,
        status,
        location
      );
      res.json(shipment);
    } catch (error) {
      if (error.message === "Shipment not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Invalid shipment status") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error updating shipment status",
        error: error.message,
      });
    }
  },

  async getShippingHistory(req, res) {
    try {
      const { orderId } = req.params;
      const history = await shippingService.getShippingHistory(orderId);
      res.json(history);
    } catch (error) {
      if (error.message === "Order not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error fetching shipping history",
        error: error.message,
      });
    }
  },

  async validateAddress(req, res) {
    try {
      const { address } = req.body;
      const validation = await shippingService.validateAddress(address);
      res.json(validation);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error validating address", error: error.message });
    }
  },

  async getShippingZones(req, res) {
    try {
      const zones = await shippingService.getShippingZones();
      res.json(zones);
    } catch (error) {
      res.status(500).json({
        message: "Error fetching shipping zones",
        error: error.message,
      });
    }
  },

  async getShippingAddresses(req, res) {
    try {
      const userId = req.user.id;
      const addresses = await shippingService.getShippingAddresses(userId);
      res.json(addresses);
    } catch (error) {
      res.status(500).json({
        message: "Error fetching shipping addresses",
        error: error.message,
      });
    }
  },

  async addShippingAddress(req, res) {
    try {
      const userId = req.user.id;
      const addressData = req.body;
      const address = await shippingService.addShippingAddress(
        userId,
        addressData
      );
      res.status(201).json(address);
    } catch (error) {
      if (error.message === "Invalid address data") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error adding shipping address",
        error: error.message,
      });
    }
  },

  async updateShippingAddress(req, res) {
    try {
      const userId = req.user.id;
      const { addressId } = req.params;
      const addressData = req.body;
      const address = await shippingService.updateShippingAddress(
        userId,
        addressId,
        addressData
      );
      res.json(address);
    } catch (error) {
      if (error.message === "Address not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Invalid address data") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error updating shipping address",
        error: error.message,
      });
    }
  },

  async removeShippingAddress(req, res) {
    try {
      const userId = req.user.id;
      const { addressId } = req.params;
      await shippingService.removeShippingAddress(userId, addressId);
      res.status(204).send();
    } catch (error) {
      if (error.message === "Address not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error removing shipping address",
        error: error.message,
      });
    }
  },

  async getShippingCarriers(req, res) {
    try {
      const carriers = await shippingService.getShippingCarriers();
      res.json(carriers);
    } catch (error) {
      res.status(500).json({
        message: "Error fetching shipping carriers",
        error: error.message,
      });
    }
  },

  async addShippingCarrier(req, res) {
    try {
      const carrierData = req.body;
      const carrier = await shippingService.addShippingCarrier(carrierData);
      res.status(201).json(carrier);
    } catch (error) {
      if (error.message === "Invalid carrier data") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error adding shipping carrier",
        error: error.message,
      });
    }
  },

  async updateShippingCarrier(req, res) {
    try {
      const { carrierId } = req.params;
      const carrierData = req.body;
      const carrier = await shippingService.updateShippingCarrier(
        carrierId,
        carrierData
      );
      res.json(carrier);
    } catch (error) {
      if (error.message === "Carrier not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Invalid carrier data") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error updating shipping carrier",
        error: error.message,
      });
    }
  },

  async removeShippingCarrier(req, res) {
    try {
      const { carrierId } = req.params;
      await shippingService.removeShippingCarrier(carrierId);
      res.status(204).send();
    } catch (error) {
      if (error.message === "Carrier not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error removing shipping carrier",
        error: error.message,
      });
    }
  },

  async createShippingMethod(req, res) {
    try {
      const method = await shippingService.createShippingMethod(req.body);
      res.status(201).json(method);
    } catch (error) {
      res.status(500).json({
        message: "Error creating shipping method",
        error: error.message,
      });
    }
  },

  async updateShippingMethod(req, res) {
    try {
      const { id } = req.params;
      const method = await shippingService.updateShippingMethod(id, req.body);
      res.json(method);
    } catch (error) {
      res.status(500).json({
        message: "Error updating shipping method",
        error: error.message,
      });
    }
  },

  async calculateShipping(req, res) {
    try {
      const { addressId, items } = req.body;
      const cost = await shippingService.calculateShippingCost(
        addressId,
        items
      );
      res.json(cost);
    } catch (error) {
      res.status(500).json({
        message: "Error calculating shipping",
        error: error.message,
      });
    }
  },

  async getOrderShipment(req, res) {
    try {
      const { orderId } = req.params;
      const shipment = await shippingService.getOrderShipment(orderId);
      res.json(shipment);
    } catch (error) {
      res.status(500).json({
        message: "Error fetching order shipment",
        error: error.message,
      });
    }
  },

  async createShipment(req, res) {
    try {
      const shipmentData = req.body;
      const shipment = await shippingService.createShipment(shipmentData);
      res.status(201).json(shipment);
    } catch (error) {
      res.status(500).json({
        message: "Error creating shipment",
        error: error.message,
      });
    }
  },

  async updateShipment(req, res) {
    try {
      const { id } = req.params;
      const shipmentData = req.body;
      const shipment = await shippingService.updateShipment(id, shipmentData);
      res.json(shipment);
    } catch (error) {
      res.status(500).json({
        message: "Error updating shipment",
        error: error.message,
      });
    }
  },

  async getShipmentById(req, res) {
    try {
      const { id } = req.params;
      const shipment = await shippingService.getShipmentById(id);
      res.json(shipment);
    } catch (error) {
      res.status(500).json({
        message: "Error fetching shipment",
        error: error.message,
      });
    }
  },

  async getAllShipments(req, res) {
    try {
      const shipments = await shippingService.getAllShipments();
      res.json(shipments);
    } catch (error) {
      res.status(500).json({
        message: "Error fetching shipments",
        error: error.message,
      });
    }
  },

  async getShippingStats(req, res) {
    try {
      const stats = await shippingService.getShippingStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({
        message: "Error fetching shipping stats",
        error: error.message,
      });
    }
  },

  async generateShippingLabel(req, res) {
    try {
      const { id } = req.params;
      const label = await shippingService.generateShippingLabel(id);
      res.json(label);
    } catch (error) {
      res.status(500).json({
        message: "Error generating shipping label",
        error: error.message,
      });
    }
  },

  async getShippingLabel(req, res) {
    try {
      const { id } = req.params;
      const label = await shippingService.getShippingLabel(id);
      res.json(label);
    } catch (error) {
      res.status(500).json({
        message: "Error fetching shipping label",
        error: error.message,
      });
    }
  },

  async deleteShippingMethod(req, res) {
    try {
      const { id } = req.params;
      await shippingService.deleteShippingMethod(id);
      res.status(204).send();
    } catch (error) {
      if (error.message === "Shipping method not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error deleting shipping method",
        error: error.message,
      });
    }
  },

  async deleteShippingZone(req, res) {
    try {
      const { id } = req.params;
      await shippingService.deleteShippingZone(id);
      res.status(204).send();
    } catch (error) {
      if (error.message === "Shipping zone not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error deleting shipping zone",
        error: error.message,
      });
    }
  },

  async createShippingZone(req, res) {
    try {
      const zoneData = req.body;
      const zone = await shippingService.createShippingZone(zoneData);
      res.status(201).json(zone);
    } catch (error) {
      if (error.message === "Invalid zone data") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error creating shipping zone",
        error: error.message,
      });
    }
  },

  async updateShippingZone(req, res) {
    try {
      const { id } = req.params;
      const zoneData = req.body;
      const zone = await shippingService.updateShippingZone(id, zoneData);
      res.json(zone);
    } catch (error) {
      if (error.message === "Shipping zone not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Invalid zone data") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error updating shipping zone",
        error: error.message,
      });
    }
  },
};
