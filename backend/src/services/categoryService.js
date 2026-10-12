import { db } from "../config/db.js";
import { categories, products } from "../models/schema.js";
import { eq, and, ne, asc, sql } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { listProducts } from "./productService.js";

async function assertNameAvailable(name, exceptId) {
  const existing = await db.query.categories.findFirst({
    where: exceptId ? and(eq(categories.name, name), ne(categories.id, exceptId)) : eq(categories.name, name),
  });
  if (existing) throw ApiError.conflict("มีหมวดหมู่นี้อยู่แล้ว");
}

export const categoryService = {
  /** All categories (small list, used for navigation), with active product counts. */
  async getCategories() {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        productCount: sql`(count(${products.id}) filter (where ${products.isActive} = true))::int`,
      })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .groupBy(categories.id)
      .orderBy(asc(categories.name));
    return { categories: rows };
  },

  async getCategoryById(id) {
    const category = await db.query.categories.findFirst({ where: eq(categories.id, id) });
    if (!category) throw ApiError.notFound("Category not found");
    return category;
  },

  async getCategoryProducts(categoryId, filters, pagination) {
    await this.getCategoryById(categoryId);
    return listProducts({ ...filters, categoryId }, pagination);
  },

  async createCategory({ name, description }) {
    await assertNameAvailable(name);
    const [category] = await db
      .insert(categories)
      .values({ name, description: description?.trim() || null })
      .returning();
    return category;
  },

  async updateCategory(id, updates) {
    await this.getCategoryById(id);
    const changes = {};
    if (updates.name !== undefined) {
      await assertNameAvailable(updates.name, id);
      changes.name = updates.name;
    }
    if (updates.description !== undefined) changes.description = updates.description?.trim() || null;
    const [category] = await db.update(categories).set(changes).where(eq(categories.id, id)).returning();
    return category;
  },

  /** Only empty categories can be deleted (products would lose their category). */
  async deleteCategory(id) {
    await this.getCategoryById(id);
    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(products)
      .where(eq(products.categoryId, id));
    if (count > 0) {
      throw ApiError.badRequest(`ไม่สามารถลบหมวดหมู่ได้ เพราะมีสินค้าผูกอยู่ ${count} รายการ`);
    }
    const [deleted] = await db.delete(categories).where(eq(categories.id, id)).returning();
    return deleted;
  },
};
