import { db } from "../config/db.js";
import { brands, products } from "../models/schema.js";
import { eq, and, ilike, or, desc, sql } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";

export const brandService = {
  async getBrands({ page = 1, limit = 10, search }) {
    const offset = (page - 1) * limit;

    const whereConditions = [];
    if (search) {
      whereConditions.push(
        or(
          ilike(brands.name, `%${search}%`),
          ilike(brands.description, `%${search}%`)
        )
      );
    }

    const [brandList, total] = await Promise.all([
      db.query.brands.findMany({
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
        orderBy: [desc(brands.id)],
        limit,
        offset,
      }),
      db
        .select({ count: sql`count(*)` })
        .from(brands)
        .where(
          whereConditions.length > 0 ? and(...whereConditions) : undefined
        ),
    ]);

    return {
      brands: brandList,
      pagination: {
        total: Number(total[0].count),
        page,
        limit,
        pages: Math.ceil(Number(total[0].count) / limit),
      },
    };
  },

  async getBrandById(id) {
    const brand = await db.query.brands.findFirst({
      where: eq(brands.id, id),
    });

    if (!brand) {
      throw new ApiError("Brand not found", 404);
    }

    return brand;
  },

  async getBrandProducts(brandId, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const [productsList, total] = await Promise.all([
      db.query.products.findMany({
        where: eq(products.brandId, brandId),
        with: {
          brand: true,
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
        .where(eq(products.brandId, brandId)),
    ]);

    return {
      products: productsList,
      pagination: {
        total: Number(total[0].count),
        page,
        limit,
        pages: Math.ceil(Number(total[0].count) / limit),
      },
    };
  },

  async createBrand(brandData) {
    const name = String(brandData.name || "").trim();
    const existing = await db.query.brands.findFirst({
      where: eq(brands.name, name),
    });
    if (existing) {
      throw ApiError.conflict("มีแบรนด์นี้อยู่แล้ว");
    }
    const [newBrand] = await db
      .insert(brands)
      .values({
        name,
        description: brandData.description?.trim() || null,
        logo: brandData.logo || null,
        website: brandData.website || null,
        isActive: brandData.isActive ?? true,
      })
      .returning();

    return newBrand;
  },

  async updateBrand(id, updates) {
    // Check if brand exists first
    const existingBrand = await db.query.brands.findFirst({
      where: eq(brands.id, id),
    });

    if (!existingBrand) {
      throw new ApiError("Brand not found", 404);
    }

    // Create valid updates object with only allowed fields
    const validUpdates = {
      name: updates.name,
      description: updates.description,
      logo: updates.logo,
      website: updates.website,
      isActive: updates.isActive,
      updatedAt: new Date(),
    };

    // Remove undefined values
    Object.keys(validUpdates).forEach(
      (key) => validUpdates[key] === undefined && delete validUpdates[key]
    );

    // Ensure at least one field is being updated
    if (Object.keys(validUpdates).length === 0) {
      throw new ApiError("No valid fields to update", 400);
    }

    const [updatedBrand] = await db
      .update(brands)
      .set(validUpdates)
      .where(eq(brands.id, id))
      .returning();

    return updatedBrand;
  },

  async deleteBrand(id) {
    const existingBrand = await db.query.brands.findFirst({
      where: eq(brands.id, id),
    });

    if (!existingBrand) {
      throw ApiError.notFound("ไม่พบแบรนด์");
    }

    const [related] = await db
      .select({ count: sql`count(*)::int` })
      .from(products)
      .where(eq(products.brandId, id));

    if (related?.count > 0) {
      throw ApiError.badRequest(
        `ไม่สามารถลบแบรนด์ได้ เนื่องจากมีสินค้าผูกอยู่ ${related.count} รายการ`
      );
    }

    const [updatedBrand] = await db
      .update(brands)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, id))
      .returning();

    return updatedBrand;
  },

  async updateBrandLogo(id, logoUrl) {
    const [updatedBrand] = await db
      .update(brands)
      .set({ logoUrl })
      .where(eq(brands.id, id))
      .returning();

    if (!updatedBrand) {
      throw new Error("Brand not found");
    }

    return updatedBrand;
  },

  async updateBrandVisibility(id, isVisible) {
    const [updatedBrand] = await db
      .update(brands)
      .set({ isVisible })
      .where(eq(brands.id, id))
      .returning();

    if (!updatedBrand) {
      throw new Error("Brand not found");
    }

    return updatedBrand;
  },
};
