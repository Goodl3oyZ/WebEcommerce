import { productService } from "../services/productService.js";
import { parsePagination } from "../utils/pagination.js";
import { isAdminRole } from "../utils/roles.js";

/**
 * Hidden products are visible to admins only (public routes use optionalAuth).
 * Admins see them by default, as the admin panel expects; ?includeInactive=false
 * gives an admin the public view.
 */
const canSeeInactive = (req) => isAdminRole(req.user?.role);
const includeInactive = (req) => canSeeInactive(req) && req.query.includeInactive !== "false";

function listFilters(req) {
  const q = req.query;
  return {
    sort: q.sort,
    categoryId: q.category,
    brandId: q.brand,
    minPrice: q.minPrice,
    maxPrice: q.maxPrice,
    search: q.search,
    inStock: q.inStock === "true",
    includeInactive: includeInactive(req),
  };
}

export const productController = {
  async getProducts(req, res) {
    res.json(await productService.getProducts(listFilters(req), parsePagination(req.query)));
  },

  async searchProducts(req, res) {
    res.json(await productService.searchProducts(req.query.q, listFilters(req), parsePagination(req.query)));
  },

  async getProductsByCategory(req, res) {
    res.json(
      await productService.getProductsByCategory(req.params.categoryId, listFilters(req), parsePagination(req.query))
    );
  },

  async getProductById(req, res) {
    res.json(await productService.getProductById(req.params.id, { includeInactive: canSeeInactive(req) }));
  },

  async getProductVariants(req, res) {
    res.json(await productService.getProductVariants(req.params.id, { includeInactive: canSeeInactive(req) }));
  },

  async getProductReviews(req, res) {
    res.json(await productService.getProductReviews(req.params.id, parsePagination(req.query)));
  },

  async createProduct(req, res) {
    res.status(201).json(await productService.createProduct(req.body));
  },

  async updateProduct(req, res) {
    res.json(await productService.updateProduct(req.params.id, req.body));
  },

  async deleteProduct(req, res) {
    await productService.deleteProduct(req.params.id);
    res.json({ success: true, message: "ปิดการขายสินค้าแล้ว (soft delete)" });
  },

  async createVariant(req, res) {
    res.status(201).json(await productService.createVariant(req.params.id, req.body, { actorId: req.user?.id }));
  },

  async updateVariant(req, res) {
    res.json(await productService.updateVariant(req.params.id, req.params.variantId, req.body, { actorId: req.user?.id }));
  },

  async deleteVariant(req, res) {
    await productService.deleteVariant(req.params.id, req.params.variantId);
    res.status(204).send();
  },

  async createReview(req, res) {
    res.status(201).json(await productService.createReview(req.params.id, req.user.id, req.body));
  },

  async updateReview(req, res) {
    res.json(await productService.updateReview(req.params.id, req.params.reviewId, req.user.id, req.body));
  },

  async deleteReview(req, res) {
    await productService.deleteReview(req.params.id, req.params.reviewId, req.user);
    res.status(204).send();
  },
};
