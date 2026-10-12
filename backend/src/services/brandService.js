import { db } from "../config/db.js";
import { brands, products } from "../models/schema.js";
import { eq, and, ne, ilike, or, asc, sql } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { getFileUrl, toStoredKey, BUCKETS } from "../config/minio.js";
import { paginationMeta } from "../utils/pagination.js";
import { listProducts } from "./productService.js";

const present = (brand) => brand && { ...brand, logo: brand.logo ? getFileUrl(BUCKETS.BRANDS, brand.logo) : null };

async function assertNameAvailable(name, exceptId) {
  const existing = await db.query.brands.findFirst({
    where: exceptId ? and(eq(brands.name, name), ne(brands.id, exceptId)) : eq(brands.name, name),
  });
  if (existing) throw ApiError.conflict("มีแบรนด์นี้อยู่แล้ว");
}

export const brandService = {
  /** Disabled brands are listed for admins only. */
  async getBrands({ search, includeInactive }, pagination) {
    const conditions = [];
    if (!includeInactive) conditions.push(eq(brands.isActive, true));
    if (search) conditions.push(or(ilike(brands.name, `%${search}%`), ilike(brands.description, `%${search}%`)));
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, total] = await Promise.all([
      db.query.brands.findMany({
        where,
        orderBy: [asc(brands.name)],
        limit: pagination.limit,
        offset: pagination.offset,
      }),
      db.select({ count: sql`count(*)::int` }).from(brands).where(where),
    ]);
    return { brands: rows.map(present), pagination: paginationMeta(total[0].count, pagination) };
  },

  async getBrandById(id, { includeInactive = false } = {}) {
    const brand = await db.query.brands.findFirst({ where: eq(brands.id, id) });
    if (!brand || (!brand.isActive && !includeInactive)) throw ApiError.notFound("Brand not found");
    return present(brand);
  },

  async getBrandProducts(brandId, filters, pagination) {
    await this.getBrandById(brandId, { includeInactive: filters.includeInactive });
    return listProducts({ ...filters, brandId }, pagination);
  },

  async createBrand(data) {
    await assertNameAvailable(data.name);
    const [brand] = await db
      .insert(brands)
      .values({
        name: data.name,
        description: data.description?.trim() || null,
        logo: data.logo ? toStoredKey(BUCKETS.BRANDS, data.logo) : null,
        website: data.website || null,
        isActive: data.isActive ?? true,
      })
      .returning();
    return present(brand);
  },

  async updateBrand(id, updates) {
    await this.getBrandById(id, { includeInactive: true });
    const changes = { updatedAt: new Date() };
    if (updates.name !== undefined) {
      await assertNameAvailable(updates.name, id);
      changes.name = updates.name;
    }
    if (updates.description !== undefined) changes.description = updates.description?.trim() || null;
    if (updates.logo !== undefined) changes.logo = updates.logo ? toStoredKey(BUCKETS.BRANDS, updates.logo) : null;
    if (updates.website !== undefined) changes.website = updates.website || null;
    if (updates.isActive !== undefined) changes.isActive = updates.isActive;
    const [brand] = await db.update(brands).set(changes).where(eq(brands.id, id)).returning();
    return present(brand);
  },

  /** Disables the brand; refused while active products still use it. */
  async deleteBrand(id) {
    await this.getBrandById(id, { includeInactive: true });
    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(products)
      .where(and(eq(products.brandId, id), eq(products.isActive, true)));
    if (count > 0) {
      throw ApiError.badRequest(`ไม่สามารถลบแบรนด์ได้ เนื่องจากมีสินค้าผูกอยู่ ${count} รายการ`);
    }
    const [brand] = await db
      .update(brands)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(brands.id, id))
      .returning();
    return present(brand);
  },
};
