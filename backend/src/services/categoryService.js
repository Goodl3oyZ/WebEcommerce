import { db } from "../config/db.js";
import { categories, products } from "../models/schema.js";
import { eq, and, ilike, or, desc, sql } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { productService } from "./productService.js";

export const categoryService = {
  async getAllCategories({ page = 1, limit = 10, search }) {
    const offset = (page - 1) * limit;

    const whereConditions = [];
    if (search) {
      whereConditions.push(
        or(
          ilike(categories.name, `%${search}%`),
          ilike(categories.description, `%${search}%`)
        )
      );
    }

    const categoryList = await db.query.categories.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset),
      orderBy: (categories, { asc }) => [asc(categories.name)],
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
    const name = String(categoryData.name || "").trim();
    if (!name) {
      throw ApiError.badRequest("กรุณากรอกชื่อหมวดหมู่");
    }
    const existing = await db.query.categories.findFirst({
      where: eq(categories.name, name),
    });
    if (existing) {
      throw ApiError.conflict("มีหมวดหมู่นี้อยู่แล้ว");
    }
    const [newCategory] = await db
      .insert(categories)
      .values({
        name,
        description: categoryData.description?.trim() || null,
      })
      .returning();

    return newCategory;
  },

  async updateCategory(id, updates) {
    const payload = {};
    if (updates.name != null) payload.name = String(updates.name).trim();
    if (updates.description !== undefined) {
      payload.description = updates.description?.trim() || null;
    }
    if (Object.keys(payload).length === 0) {
      throw ApiError.badRequest("ไม่มีข้อมูลที่จะอัปเดต");
    }
    const [updatedCategory] = await db
      .update(categories)
      .set(payload)
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

    const related = Number(productsCount[0].count);
    if (related > 0) {
      throw ApiError.badRequest(
        `ไม่สามารถลบหมวดหมู่ได้ เพราะมีสินค้าผูกอยู่ ${related} รายการ`
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
    return db.query.categories.findMany({
      orderBy: (categories, { asc }) => [asc(categories.name)],
    });
  },
};
