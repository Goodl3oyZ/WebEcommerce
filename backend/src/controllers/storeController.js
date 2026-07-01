import { storeService } from "../services/storeService.js";

export const storeController = {
  async getAllStores(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await storeService.getAllStores({
        page,
        limit,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({
        message: "Error fetching stores",
        error: error.message,
      });
    }
  },

  async createStore(req, res) {
    try {
      const userId = req.user.id;
      const storeData = req.body;
      const store = await storeService.createStore(userId, storeData);
      res.status(201).json(store);
    } catch (error) {
      if (error.message === "User already has a store") {
        return res.status(400).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error creating store", error: error.message });
    }
  },

  async getStoreById(req, res) {
    try {
      const { id } = req.params;
      const store = await storeService.getStoreById(id);
      res.json(store);
    } catch (error) {
      if (error.message === "Store not found") {
        return res.status(404).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error fetching store", error: error.message });
    }
  },

  async updateStore(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const storeData = req.body;
      const store = await storeService.updateStore(userId, id, storeData);
      res.json(store);
    } catch (error) {
      if (error.message === "Store not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Not authorized to update store") {
        return res.status(403).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error updating store", error: error.message });
    }
  },

  async deleteStore(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      await storeService.deleteStore(userId, id);
      res.json({ message: "Store deleted successfully" });
    } catch (error) {
      if (error.message === "Store not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Not authorized to delete store") {
        return res.status(403).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error deleting store", error: error.message });
    }
  },

  async getStoreProducts(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const products = await storeService.getStoreProducts(id, { page, limit });
      res.json(products);
    } catch (error) {
      if (error.message === "Store not found") {
        return res.status(404).json({ message: error.message });
      }
      res
        .status(500)
        .json({
          message: "Error fetching store products",
          error: error.message,
        });
    }
  },

  async getStoreOrders(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const orders = await storeService.getStoreOrders(userId, id, {
        page,
        limit,
      });
      res.json(orders);
    } catch (error) {
      if (error.message === "Store not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Not authorized to view store orders") {
        return res.status(403).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error fetching store orders", error: error.message });
    }
  },

  async getStoreAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { startDate, endDate } = req.query;
      const analytics = await storeService.getStoreAnalytics(userId, id, {
        startDate,
        endDate,
      });
      res.json(analytics);
    } catch (error) {
      if (error.message === "Store not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Not authorized to view store analytics") {
        return res.status(403).json({ message: error.message });
      }
      res
        .status(500)
        .json({
          message: "Error fetching store analytics",
          error: error.message,
        });
    }
  },

  async updateStoreSettings(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const settings = req.body;
      const updatedSettings = await storeService.updateStoreSettings(
        userId,
        id,
        settings
      );
      res.json(updatedSettings);
    } catch (error) {
      if (error.message === "Store not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Not authorized to update store settings") {
        return res.status(403).json({ message: error.message });
      }
      res
        .status(500)
        .json({
          message: "Error updating store settings",
          error: error.message,
        });
    }
  },

  async getStoreReviews(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const reviews = await storeService.getStoreReviews(id, { page, limit });
      res.json(reviews);
    } catch (error) {
      if (error.message === "Store not found") {
        return res.status(404).json({ message: error.message });
      }
      res
        .status(500)
        .json({
          message: "Error fetching store reviews",
          error: error.message,
        });
    }
  },
};
