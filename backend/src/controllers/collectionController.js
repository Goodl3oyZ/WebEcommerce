import { collectionService } from "../services/collectionService.js";
import { ApiError } from "../utils/ApiError.js";

export const collectionController = {
  // Get all collections
  async getCollections(req, res, next) {
    try {
      const { page, limit, search } = req.query;
      const collections = await collectionService.getCollections({
        page,
        limit,
        search,
      });
      res.json(collections);
    } catch (error) {
      next(error);
    }
  },

  // Get collection by ID
  async getCollectionById(req, res, next) {
    try {
      const { id } = req.params;
      const collection = await collectionService.getCollectionById(id);
      res.json(collection);
    } catch (error) {
      next(error);
    }
  },

  // Get products in a collection
  async getCollectionProducts(req, res, next) {
    try {
      const { id } = req.params;
      const { page, limit } = req.query;
      const products = await collectionService.getCollectionProducts(id, {
        page,
        limit,
      });
      res.json(products);
    } catch (error) {
      next(error);
    }
  },

  // Create new collection (Admin only)
  async createCollection(req, res, next) {
    try {
      const collectionData = req.body;
      const newCollection = await collectionService.createCollection(
        collectionData
      );
      res.status(201).json(newCollection);
    } catch (error) {
      next(error);
    }
  },

  // Update collection (Admin only)
  async updateCollection(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedCollection = await collectionService.updateCollection(
        id,
        updates
      );
      res.json(updatedCollection);
    } catch (error) {
      next(error);
    }
  },

  // Delete collection (Admin only)
  async deleteCollection(req, res, next) {
    try {
      const { id } = req.params;
      await collectionService.deleteCollection(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  // Add products to collection (Admin only)
  async addProducts(req, res, next) {
    try {
      const { id } = req.params;
      const { productIds } = req.body;
      const updatedCollection = await collectionService.addProducts(
        id,
        productIds
      );
      res.json(updatedCollection);
    } catch (error) {
      next(error);
    }
  },

  // Remove products from collection (Admin only)
  async removeProducts(req, res, next) {
    try {
      const { id } = req.params;
      const { productIds } = req.body;
      const updatedCollection = await collectionService.removeProducts(
        id,
        productIds
      );
      res.json(updatedCollection);
    } catch (error) {
      next(error);
    }
  },

  async updateCollectionVisibility(req, res) {
    try {
      const { id } = req.params;
      const { isVisible } = req.body;
      const collection = await collectionService.updateCollectionVisibility(
        id,
        isVisible
      );
      res.json(collection);
    } catch (error) {
      if (error.message === "Collection not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error updating collection visibility",
        error: error.message,
      });
    }
  },
};
