import { categoryService } from "../services/categoryService.js";
import { parsePagination } from "../utils/pagination.js";
import { isAdminRole } from "../utils/roles.js";

export const categoryController = {
  async getCategories(req, res) {
    res.json(await categoryService.getCategories());
  },

  async getCategoryById(req, res) {
    res.json(await categoryService.getCategoryById(req.params.id));
  },

  async getCategoryProducts(req, res) {
    const { sort, minPrice, maxPrice, search, inStock, includeInactive } = req.query;
    res.json(
      await categoryService.getCategoryProducts(
        req.params.id,
        {
          sort,
          minPrice,
          maxPrice,
          search,
          inStock: inStock === "true",
          includeInactive: isAdminRole(req.user?.role) && includeInactive !== "false",
        },
        parsePagination(req.query)
      )
    );
  },

  async createCategory(req, res) {
    res.status(201).json(await categoryService.createCategory(req.body));
  },

  async updateCategory(req, res) {
    res.json(await categoryService.updateCategory(req.params.id, req.body));
  },

  async deleteCategory(req, res) {
    await categoryService.deleteCategory(req.params.id);
    res.json({ success: true, message: "ลบหมวดหมู่แล้ว" });
  },
};
