import { inventoryService } from "../services/inventoryService.js";

export const inventoryController = {
  async getAllInventoryItems(req, res, next) {
    try {
      const items = await inventoryService.getAllInventoryItems();
      res.json(items);
    } catch (error) {
      next(error);
    }
  },

  async getInventoryItemById(req, res, next) {
    try {
      const item = await inventoryService.getInventoryItemById(req.params.id);
      res.json(item);
    } catch (error) {
      next(error);
    }
  },

  async createInventoryItem(req, res, next) {
    try {
      const item = await inventoryService.createInventoryItem(req.body);
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  },

  async updateInventoryItem(req, res, next) {
    try {
      const item = await inventoryService.updateInventoryItem(
        req.params.id,
        req.body
      );
      res.json(item);
    } catch (error) {
      next(error);
    }
  },

  async adjustInventory(req, res, next) {
    try {
      const item = await inventoryService.adjustInventory(
        req.params.id,
        req.body
      );
      res.json(item);
    } catch (error) {
      next(error);
    }
  },

  async transferInventory(req, res, next) {
    try {
      const item = await inventoryService.transferInventory(
        req.params.id,
        req.body.toLocation || req.body.destinationLocation,
        req.body.quantity
      );
      res.json(item);
    } catch (error) {
      next(error);
    }
  },

  async getInventoryByLocation(req, res, next) {
    try {
      const items = await inventoryService.getInventoryByLocation(
        req.params.location
      );
      res.json(items);
    } catch (error) {
      next(error);
    }
  },

  async getInventoryByProduct(req, res, next) {
    try {
      const items = await inventoryService.getInventoryByProduct(
        req.params.productId
      );
      res.json(items);
    } catch (error) {
      next(error);
    }
  },

  async getLowStockItems(req, res, next) {
    try {
      const items = await inventoryService.getLowStockItems();
      res.json(items);
    } catch (error) {
      next(error);
    }
  },
};
