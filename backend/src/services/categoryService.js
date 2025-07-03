import { db } from "../config/db.js";
import { categories, products } from "../models/schema.js";
import { eq, and, like, or, desc, sql } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { productService } from "./productService.js";

export const categoryService = {
  async getAllCategories({ page = 1, limit = 10, search }) {
    const offset = (page - 1) * limit;

    const whereConditions = [];
    if (search) {
      whereConditions.push(
        or(
          like(categories.name, `%${search}%`),
          like(categories.description, `%${search}%`)
        )
      );
    }

    const categoryList = await db.query.categories.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        parent: true,
        children: true,
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      orderBy: (categories, { asc }) => [asc(categories.order)],
    });

    const total = await db
      .select({ count: sql`count(*)` })
      .from(categories)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    return {
      categories: categoryList,
      pagination: {
        total: total[0].count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total[0].count / limit),
      },
    };
  },

  async getCategories() {
    return {
      categories: await db.query.categories.findMany({
        orderBy: [desc(categories.id)],
      }),
    };
  },

  async getCategoryById(id) {
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    if (!category) {
      throw new ApiError("Category not found", 404);
    }

    return category;
  },

  async getCategoryProducts(categoryId, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const [productsList, total] = await Promise.all([
      db.query.products.findMany({
        where: eq(products.categoryId, categoryId),
        with: {
          category: true,
          variants: true,
        },
        orderBy: [desc(products.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ count: sql`count(*)` })
        .from(products)
        .where(eq(products.categoryId, categoryId)),
    ]);

    // Generate presigned URLs for product images
    const productsWithPresignedUrls = await Promise.all(
      productsList.map((product) =>
        productService.withPresignedImageUrl(product)
      )
    );

    return {
      products: productsWithPresignedUrls,
      pagination: {
        total: Number(total[0].count),
        page,
        limit,
        pages: Math.ceil(Number(total[0].count) / limit),
      },
    };
  },

  async createCategory(categoryData) {
    const [newCategory] = await db
      .insert(categories)
      .values(categoryData)
      .returning();

    return newCategory;
  },

  async updateCategory(id, updates) {
    const [updatedCategory] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();

    if (!updatedCategory) {
      throw new ApiError("Category not found", 404);
    }

    return updatedCategory;
  },

  async deleteCategory(id) {
    // Check if category has products
    const productsCount = await db
      .select({ count: sql`count(*)` })
      .from(products)
      .where(eq(products.categoryId, id));

    if (Number(productsCount[0].count) > 0) {
      throw new ApiError(
        "Cannot delete category with associated products",
        400
      );
    }

    const [deletedCategory] = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning();

    if (!deletedCategory) {
      throw new ApiError("Category not found", 404);
    }

    return deletedCategory;
  },

  async getCategoryTree() {
    const allCategories = await db.query.categories.findMany({
      with: {
        children: true,
      },
      orderBy: (categories, { asc }) => [asc(categories.order)],
    });

    // Build tree structure
    const categoryMap = new Map();
    const tree = [];

    // First pass: create map of all categories
    allCategories.forEach((category) => {
      categoryMap.set(category.id, {
        ...category,
        children: [],
      });
    });

    // Second pass: build tree structure
    allCategories.forEach((category) => {
      const categoryWithChildren = categoryMap.get(category.id);
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(categoryWithChildren);
        }
      } else {
        tree.push(categoryWithChildren);
      }
    });

    return tree;
  },

  async updateCategoryOrder(id, order) {
    const [updatedCategory] = await db
      .update(categories)
      .set({ order })
      .where(eq(categories.id, id))
      .returning();

    if (!updatedCategory) {
      throw new Error("Category not found");
    }

    return updatedCategory;
  },

  async updateCategoryVisibility(id, isVisible) {
    const [updatedCategory] = await db
      .update(categories)
      .set({ isVisible })
      .where(eq(categories.id, id))
      .returning();

    if (!updatedCategory) {
      throw new Error("Category not found");
    }

    return updatedCategory;
  },
};
