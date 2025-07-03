import { categoryService } from "../services/categoryService.js";
import { ApiError } from "../utils/ApiError.js";

export const categoryController = {
  // Get all categories
  async getCategories(req, res, next) {
    try {
      const categories = await categoryService.getCategories();
      res.json(categories);
    } catch (error) {
      next(error);
    }
  },

  // Get category by ID
  async getCategoryById(req, res, next) {
    try {
      const { id } = req.params;
      const category = await categoryService.getCategoryById(id);
      res.json(category);
    } catch (error) {
      next(error);
    }
  },

  // Get products in a category
  async getCategoryProducts(req, res, next) {
    try {
      const { id } = req.params;
      const { page, limit } = req.query;
      const products = await categoryService.getCategoryProducts(id, {
        page,
        limit,
      });
      res.json(products);
    } catch (error) {
      next(error);
    }
  },

  // Create new category (Admin only)
  async createCategory(req, res, next) {
    try {
      const categoryData = req.body;
      const newCategory = await categoryService.createCategory(categoryData);
      res.status(201).json(newCategory);
    } catch (error) {
      next(error);
    }
  },

  // Update category (Admin only)
  async updateCategory(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedCategory = await categoryService.updateCategory(id, updates);
      res.json(updatedCategory);
    } catch (error) {
      next(error);
    }
  },

  // Delete category (Admin only)
  async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;
      await categoryService.deleteCategory(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async getCategoryTree(req, res) {
    try {
      const tree = await categoryService.getCategoryTree();
      res.json(tree);
    } catch (error) {
      res.status(500).json({
        message: "Error fetching category tree",
        error: error.message,
      });
    }
  },

  async updateCategoryOrder(req, res) {
    try {
      const { id } = req.params;
      const { order } = req.body;
      const category = await categoryService.updateCategoryOrder(id, order);
      res.json(category);
    } catch (error) {
      if (error.message === "Category not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error updating category order",
        error: error.message,
      });
    }
  },

  async updateCategoryVisibility(req, res) {
    try {
      const { id } = req.params;
      const { isVisible } = req.body;
      const category = await categoryService.updateCategoryVisibility(
        id,
        isVisible
      );
      res.json(category);
    } catch (error) {
      if (error.message === "Category not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({
        message: "Error updating category visibility",
        error: error.message,
      });
    }
  },
};
