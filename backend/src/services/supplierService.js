import { db } from "../config/db.js";
import { suppliers, supplierProducts, products } from "../models/schema.js";
import { eq, and, desc, or, ilike, sql } from "drizzle-orm";
import { paginationMeta } from "../utils/pagination.js";
import { ApiError } from "../utils/ApiError.js";

export const supplierService = {
  async getAllSuppliers({ search, status }, pagination) {
    const where = and(
      status ? eq(suppliers.status, status) : undefined,
      search
        ? or(ilike(suppliers.name, `%${search}%`), ilike(suppliers.contactPerson, `%${search}%`), ilike(suppliers.email, `%${search}%`))
        : undefined
    );
    const [items, total] = await Promise.all([
      db.query.suppliers.findMany({
        where,
        orderBy: [desc(suppliers.createdAt)],
        limit: pagination.limit,
        offset: pagination.offset,
      }),
      db.select({ count: sql`count(*)::int` }).from(suppliers).where(where),
    ]);
    return { suppliers: items, pagination: paginationMeta(total[0].count, pagination) };
  },

  async getSupplierById(id) {
    const supplier = await db.query.suppliers.findFirst({
      where: eq(suppliers.id, id),
      with: {
        products: true,
      },
    });

    if (!supplier) {
      throw ApiError.notFound("Supplier not found");
    }

    return supplier;
  },

  async createSupplier(data) {
    const [supplier] = await db
      .insert(suppliers)
      .values({
        name: data.name,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        taxId: data.taxId ?? null,
        paymentTerms: data.paymentTerms ?? null,
        notes: data.notes ?? null,
        status: data.status ?? "active",
      })
      .returning();

    return { ...supplier, products: [] };
  },

  async updateSupplier(id, data) {
    await this.getSupplierById(id);

    const [updated] = await db
      .update(suppliers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, id))
      .returning();

    return updated;
  },

  async deleteSupplier(id) {
    await this.getSupplierById(id);
    await db.delete(suppliers).where(eq(suppliers.id, id));
  },

  async getSupplierProducts(supplierId) {
    await this.getSupplierById(supplierId);

    return db.query.supplierProducts.findMany({
      where: eq(supplierProducts.supplierId, supplierId),
      with: { product: { columns: { id: true, name: true, price: true, isActive: true } } },
    });
  },

  async addSupplierProduct(supplierId, data) {
    await this.getSupplierById(supplierId);

    const existing = await db.query.supplierProducts.findFirst({
      where: and(
        eq(supplierProducts.supplierId, supplierId),
        eq(supplierProducts.productId, data.productId)
      ),
    });

    if (existing) {
      throw ApiError.conflict("Product already linked to supplier");
    }
    const product = await db.query.products.findFirst({ where: eq(products.id, data.productId) });
    if (!product) throw ApiError.notFound("Product not found");

    const [link] = await db
      .insert(supplierProducts)
      .values({
        supplierId,
        productId: data.productId,
        sku: data.sku,
        cost: String(data.cost),
        leadTime: data.leadTime,
        minimumOrder: data.minimumOrder,
        notes: data.notes ?? null,
      })
      .returning();

    return link;
  },

  async updateSupplierProduct(supplierId, productId, data) {
    const existing = await db.query.supplierProducts.findFirst({
      where: and(
        eq(supplierProducts.supplierId, supplierId),
        eq(supplierProducts.productId, productId)
      ),
    });

    if (!existing) {
      throw ApiError.notFound("Supplier product not found");
    }

    const updates = { updatedAt: new Date() };
    if (data.sku != null) updates.sku = data.sku;
    if (data.cost != null) updates.cost = String(data.cost);
    if (data.leadTime != null) updates.leadTime = data.leadTime;
    if (data.minimumOrder != null) updates.minimumOrder = data.minimumOrder;
    if (data.notes !== undefined) updates.notes = data.notes;

    const [updated] = await db
      .update(supplierProducts)
      .set(updates)
      .where(eq(supplierProducts.id, existing.id))
      .returning();

    return updated;
  },

  async removeSupplierProduct(supplierId, productId) {
    const existing = await db.query.supplierProducts.findFirst({
      where: and(
        eq(supplierProducts.supplierId, supplierId),
        eq(supplierProducts.productId, productId)
      ),
    });

    if (!existing) {
      throw ApiError.notFound("Supplier product not found");
    }

    await db
      .delete(supplierProducts)
      .where(eq(supplierProducts.id, existing.id));
  },
};
