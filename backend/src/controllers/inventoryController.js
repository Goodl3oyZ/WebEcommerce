import { inventoryService, LOW_STOCK_THRESHOLD } from "../services/inventoryService.js";
import { parsePagination } from "../utils/pagination.js";

export const inventoryController = {
  async getAllInventoryItems(req, res) {
    res.json(await inventoryService.getAllInventoryItems(parsePagination(req.query)));
  },

  async getInventoryItemById(req, res) {
    res.json(await inventoryService.getInventoryItemById(req.params.id));
  },

  async createInventoryItem(req, res) {
    res.status(201).json(await inventoryService.createInventoryItem(req.body));
  },

  async updateInventoryItem(req, res) {
    res.json(await inventoryService.updateInventoryItem(req.params.id, req.body));
  },

  async adjustInventory(req, res) {
    res.json(await inventoryService.adjustInventory(req.params.id, req.body));
  },

  async transferInventory(req, res) {
    res.json(await inventoryService.transferInventory(req.params.id, req.body.toStoreId, req.body.quantity));
  },

  async getInventoryByLocation(req, res) {
    res.json(await inventoryService.getInventoryByLocation(req.params.location, parsePagination(req.query)));
  },

  async getInventoryByProduct(req, res) {
    res.json(await inventoryService.getInventoryByProduct(req.params.productId, parsePagination(req.query)));
  },

  async getLowStockItems(req, res) {
    res.json(
      await inventoryService.getLowStockItems(req.query.threshold ?? LOW_STOCK_THRESHOLD, parsePagination(req.query))
    );
  },
};
