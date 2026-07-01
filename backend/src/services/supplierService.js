import { db } from "../config/db.js";
import { suppliers, supplierProducts } from "../models/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";

export const supplierService = {
  async getAllSuppliers() {
    return db.query.suppliers.findMany({
      orderBy: [desc(suppliers.createdAt)],
    });
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
      throw ApiError.badRequest("Product already linked to supplier");
    }

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
