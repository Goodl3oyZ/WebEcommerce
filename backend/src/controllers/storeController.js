import { storeService } from "../services/storeService.js";
import { parsePagination } from "../utils/pagination.js";
import { isAdminRole } from "../utils/roles.js";

/** Inactive branches are visible to admins only. */
const adminView = (req) => isAdminRole(req.user?.role);

export const storeController = {
  async getAllStores(req, res) {
    res.json(
      await storeService.getAllStores(
        { search: req.query.search, includeInactive: adminView(req) },
        parsePagination(req.query, { defaultLimit: 20 })
      )
    );
  },

  async getStoreById(req, res) {
    res.json(await storeService.getStoreById(req.params.id, { includeInactive: adminView(req) }));
  },

  async getStoreProducts(req, res) {
    res.json(await storeService.getStoreProducts(req.params.id, parsePagination(req.query)));
  },

  async getStoreReviews(req, res) {
    res.json(await storeService.getStoreReviews(req.params.id, parsePagination(req.query)));
  },

  // --- Admin ---------------------------------------------------------------
  async createStore(req, res) {
    res.status(201).json(await storeService.createStore(req.body));
  },

  async updateStore(req, res) {
    res.json(await storeService.updateStore(req.params.id, req.body));
  },

  async deleteStore(req, res) {
    const store = await storeService.deleteStore(req.params.id);
    res.json({ success: true, data: store, message: "Store deactivated" });
  },

  async getStoreOrders(req, res) {
    res.json(await storeService.getStoreOrders(req.params.id, { status: req.query.status }, parsePagination(req.query)));
  },

  async getStoreAnalytics(req, res) {
    res.json(await storeService.getStoreAnalytics(req.params.id, req.query));
  },

  async updateStoreSettings(req, res) {
    res.json(await storeService.updateStoreSettings(req.params.id, req.body));
  },
};
