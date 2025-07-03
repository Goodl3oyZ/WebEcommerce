import { storePickupService } from "../services/storePickupService.js";

export const storePickupController = {
  async createPickupLocation(req, res) {
    try {
      const userId = req.user.id;
      const { storeId } = req.params;
      const locationData = req.body;
      const location = await storePickupService.createPickupLocation(
        userId,
        storeId,
        locationData
      );
      res.status(201).json(location);
    } catch (error) {
      if (error.message === "Store not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Not authorized to manage pickup locations") {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error creating pickup location",
        error: error.message,
      });
    }
  },

  async getPickupLocations(req, res) {
    try {
      const { storeId } = req.params;
      const locations = await storePickupService.getPickupLocations(storeId);
      res.json(locations);
    } catch (error) {
      if (error.message === "Store not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error fetching pickup locations",
        error: error.message,
      });
    }
  },

  async updatePickupLocation(req, res) {
    try {
      const userId = req.user.id;
      const { storeId, locationId } = req.params;
      const locationData = req.body;
      const location = await storePickupService.updatePickupLocation(
        userId,
        storeId,
        locationId,
        locationData
      );
      res.json(location);
    } catch (error) {
      if (
        error.message === "Store not found" ||
        error.message === "Pickup location not found"
      ) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Not authorized to manage pickup locations") {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error updating pickup location",
        error: error.message,
      });
    }
  },

  async deletePickupLocation(req, res) {
    try {
      const userId = req.user.id;
      const { storeId, locationId } = req.params;
      await storePickupService.deletePickupLocation(
        userId,
        storeId,
        locationId
      );
      res.json({ message: "Pickup location deleted successfully" });
    } catch (error) {
      if (
        error.message === "Store not found" ||
        error.message === "Pickup location not found"
      ) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Not authorized to manage pickup locations") {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error deleting pickup location",
        error: error.message,
      });
    }
  },

  async getPickupAvailability(req, res) {
    try {
      const { storeId, locationId } = req.params;
      const { date } = req.query;
      const availability = await storePickupService.getPickupAvailability(
        storeId,
        locationId,
        date
      );
      res.json(availability);
    } catch (error) {
      if (
        error.message === "Store not found" ||
        error.message === "Pickup location not found"
      ) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error fetching pickup availability",
        error: error.message,
      });
    }
  },

  async schedulePickup(req, res) {
    try {
      const userId = req.user.id;
      const { storeId, locationId } = req.params;
      const { orderId, pickupTime } = req.body;
      const pickup = await storePickupService.schedulePickup(
        userId,
        storeId,
        locationId,
        orderId,
        pickupTime
      );
      res.status(201).json(pickup);
    } catch (error) {
      if (
        error.message === "Store not found" ||
        error.message === "Pickup location not found"
      ) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Time slot not available") {
        return res.status(400).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error scheduling pickup", error: error.message });
    }
  },

  async cancelPickup(req, res) {
    try {
      const userId = req.user.id;
      const { storeId, pickupId } = req.params;
      await storePickupService.cancelPickup(userId, storeId, pickupId);
      res.json({ message: "Pickup cancelled successfully" });
    } catch (error) {
      if (
        error.message === "Store not found" ||
        error.message === "Pickup not found"
      ) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Not authorized to cancel pickup") {
        return res.status(403).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error cancelling pickup", error: error.message });
    }
  },

  async getPickupHistory(req, res) {
    try {
      const userId = req.user.id;
      const { storeId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const history = await storePickupService.getPickupHistory(
        userId,
        storeId,
        { page, limit }
      );
      res.json(history);
    } catch (error) {
      if (error.message === "Store not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Not authorized to view pickup history") {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error fetching pickup history",
        error: error.message,
      });
    }
  },
};
