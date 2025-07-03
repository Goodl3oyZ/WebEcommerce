import { brandService } from "../services/brandService.js";
import { ApiError } from "../utils/ApiError.js";

export const brandController = {
  // Get all brands
  async getBrands(req, res, next) {
    try {
      const { page, limit, search } = req.query;
      const brands = await brandService.getBrands({ page, limit, search });
      res.json(brands);
    } catch (error) {
      next(error);
    }
  },

  // Get brand by ID
  async getBrandById(req, res, next) {
    try {
      const { id } = req.params;
      const brand = await brandService.getBrandById(id);
      res.json(brand);
    } catch (error) {
      next(error);
    }
  },

  // Get products by brand
  async getBrandProducts(req, res, next) {
    try {
      const { id } = req.params;
      const { page, limit } = req.query;
      const products = await brandService.getBrandProducts(id, {
        page,
        limit,
      });
      res.json(products);
    } catch (error) {
      next(error);
    }
  },

  // Create new brand (Admin only)
  async createBrand(req, res, next) {
    try {
      const brandData = req.body;
      const newBrand = await brandService.createBrand(brandData);
      res.status(201).json(newBrand);
    } catch (error) {
      next(error);
    }
  },

  // Update brand (Admin only)
  async updateBrand(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedBrand = await brandService.updateBrand(id, updates);
      res.json(updatedBrand);
    } catch (error) {
      next(error);
    }
  },

  // Delete brand (Admin only)
  async deleteBrand(req, res, next) {
    try {
      const { id } = req.params;
      await brandService.deleteBrand(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async updateBrandLogo(req, res) {
    try {
      const { id } = req.params;
      const { logoUrl } = req.body;
      const brand = await brandService.updateBrandLogo(id, logoUrl);
      res.json(brand);
    } catch (error) {
      if (error.message === "Brand not found") {
        return res.status(404).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error updating brand logo", error: error.message });
    }
  },

  async updateBrandVisibility(req, res) {
    try {
      const { id } = req.params;
      const { isVisible } = req.body;
      const brand = await brandService.updateBrandVisibility(id, isVisible);
      res.json(brand);
    } catch (error) {
      if (error.message === "Brand not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error updating brand visibility",
        error: error.message,
      });
    }
  },
};
