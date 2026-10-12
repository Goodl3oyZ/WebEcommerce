import { collectionService } from "../services/collectionService.js";
import { parsePagination } from "../utils/pagination.js";
import { isAdminRole } from "../utils/roles.js";

/** Admins see hidden collections and products; everyone else does not. */
const adminView = (req) => isAdminRole(req.user?.role);

export const collectionController = {
  async getCollections(req, res) {
    res.json(
      await collectionService.getCollections(
        { search: req.query.search, includeInactive: adminView(req) },
        parsePagination(req.query)
      )
    );
  },

  async getCollectionById(req, res) {
    res.json(await collectionService.getCollectionById(req.params.id, { includeInactive: adminView(req) }));
  },

  async getCollectionProducts(req, res) {
    res.json(
      await collectionService.getCollectionProducts(
        req.params.id,
        { includeInactive: adminView(req) },
        parsePagination(req.query)
      )
    );
  },

  async createCollection(req, res) {
    res.status(201).json(await collectionService.createCollection(req.body));
  },

  async updateCollection(req, res) {
    res.json(await collectionService.updateCollection(req.params.id, req.body));
  },

  async deleteCollection(req, res) {
    await collectionService.deleteCollection(req.params.id);
    res.json({ success: true, message: "Collection deleted" });
  },

  async addProducts(req, res) {
    res.json(await collectionService.addProducts(req.params.id, req.body.productIds));
  },

  async removeProducts(req, res) {
    res.json(await collectionService.removeProducts(req.params.id, req.body.productIds));
  },
};
