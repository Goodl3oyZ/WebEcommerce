import { productService } from "../services/productService.js";
import { ApiError } from "../utils/ApiError.js";

export const productController = {
  // Get all products with pagination and filters
  async getProducts(req, res, next) {
    try {
      const { page, limit, sort, category, minPrice, maxPrice, search, includeInactive } =
        req.query;
      const products = await productService.getProducts({
        page,
        limit,
        sort,
        category,
        minPrice,
        maxPrice,
        search,
        includeInactive: includeInactive === "true" || (req.user?.role === "admin" && includeInactive !== "false"),
      });
      res.json(products);
    } catch (error) {
      next(error);
    }
  },

  // Get product by ID
  async getProductById(req, res, next) {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);

      if (!product) {
        return res.status(404).json({
          message: `Product with ID ${id} not found`,
          code: "PRODUCT_NOT_FOUND",
        });
      }

      res.json(product);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          message: error.message,
          code: error.code || "PRODUCT_ERROR",
        });
      }
      next(error);
    }
  },

  // Get products by category
  async getProductsByCategory(req, res, next) {
    try {
      // Support both :id and :categoryId for robustness
      const categoryId = req.params.id || req.params.categoryId;
      const { page, limit } = req.query;
      const result = await productService.getProductsByCategory(categoryId, {
        page,
        limit,
      });
      res.json(result); // result includes presigned URLs
    } catch (error) {
      next(error);
    }
  },

  // Search products
  async searchProducts(req, res, next) {
    try {
      const { q, page, limit } = req.query;
      const products = await productService.searchProducts(q, { page, limit });
      res.json(products);
    } catch (error) {
      next(error);
    }
  },

  // Create new product (Admin only)
  async createProduct(req, res, next) {
    try {
      const productData = req.body;
      const newProduct = await productService.createProduct(productData);
      res.status(201).json(newProduct);
    } catch (error) {
      next(error);
    }
  },

  // Update product (Admin only)
  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedProduct = await productService.updateProduct(id, updates);
      res.json(updatedProduct);
    } catch (error) {
      next(error);
    }
  },

  // Delete product (Admin only)
  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      await productService.deleteProduct(id);
      res.json({ success: true, message: "ปิดการขายสินค้าแล้ว (soft delete)" });
    } catch (error) {
      next(error);
    }
  },

  // Create product variant (Admin only)
  async createVariant(req, res, next) {
    try {
      const { id } = req.params;
      const variantData = req.body;
      const newVariant = await productService.createVariant(id, variantData);
      res.status(201).json(newVariant);
    } catch (error) {
      next(error);
    }
  },

  // Update product variant (Admin only)
  async updateVariant(req, res, next) {
    try {
      const { id, variantId } = req.params;
      const updates = req.body;
      const updatedVariant = await productService.updateVariant(
        id,
        variantId,
        updates
      );
      res.json(updatedVariant);
    } catch (error) {
      next(error);
    }
  },

  // Delete product variant (Admin only)
  async deleteVariant(req, res, next) {
    try {
      const { id, variantId } = req.params;
      await productService.deleteVariant(id, variantId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  // Create product review
  async createReview(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const reviewData = req.body;
      const newReview = await productService.createReview(
        id,
        userId,
        reviewData
      );
      res.status(201).json(newReview);
    } catch (error) {
      next(error);
    }
  },

  // Update product review
  async updateReview(req, res, next) {
    try {
      const { id, reviewId } = req.params;
      const userId = req.user.id;
      const updates = req.body;
      const updatedReview = await productService.updateReview(
        id,
        reviewId,
        userId,
        updates
      );
      res.json(updatedReview);
    } catch (error) {
      next(error);
    }
  },

  // Delete product review
  async deleteReview(req, res, next) {
    try {
      const { id, reviewId } = req.params;
      const userId = req.user.id;
      await productService.deleteReview(id, reviewId, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async getProductReviews(req, res, next) {
    try {
      const { id } = req.params;
      const { page, limit } = req.query;
      const reviews = await productService.getProductReviews(id, { page, limit });
      res.json(reviews);
    } catch (error) {
      next(error);
    }
  },

  async getProductVariants(req, res, next) {
    try {
      const { id } = req.params;
      const variants = await productService.getProductVariants(id);
      res.json(variants);
    } catch (error) {
      next(error);
    }
  },
};
