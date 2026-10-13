/**
 * Demo data for showing the storefront, and removing it again after launch.
 *
 * install(): adds the demo catalogue (src/seed/demoCatalog.js) with photos,
 *   without deleting anything; every row it creates is recorded in
 *   seed_records. Running it again skips products that are already there.
 * plan()/remove(): takes out the demo catalogue plus anything the original
 *   "main" seed created (recognised by its fixed SKUs, codes and emails).
 *   Rows that real orders point at are hidden/deactivated instead of deleted,
 *   so order history stays intact. Categories and brands are only removed when
 *   none of your own products use them.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import {
  brands,
  categories,
  coupons,
  discounts,
  products,
  productAttributes,
  productVariants,
  seedRecords,
  stores,
  suppliers,
  users,
} from "../models/schema.js";
import { BUCKETS, deleteFile, uploadFile } from "../config/minio.js";
import {
  DEMO_CATALOG_BRANDS,
  DEMO_CATALOG_CATEGORIES,
  DEMO_CATALOG_PRODUCTS,
  DEMO_IMAGE_PREFIX,
} from "../seed/demoCatalog.js";
import * as mainSeed from "../seed/data.js";

const IMAGE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../seed/demo-images");
const DEMO_IMAGES = [...new Set(DEMO_CATALOG_PRODUCTS.flatMap((p) => p.images))];

// What the original (destructive) main seed created, recognised by fixed values.
const LEGACY = {
  skus: mainSeed.DEMO_PRODUCTS.flatMap((p) => p.variants.map((v) => v.sku)),
  categories: mainSeed.DEMO_CATEGORIES,
  brands: mainSeed.DEMO_BRANDS,
  couponCodes: mainSeed.DEMO_COUPONS.map((c) => c.code),
  discountName: mainSeed.DEMO_DISCOUNT.name,
  store: mainSeed.DEMO_STORE,
  supplierEmail: mainSeed.DEMO_SUPPLIER.email,
  adminEmail: mainSeed.DEMO_ADMIN.email,
};

const recorded = async (tx, tableName) =>
  (await tx.select({ id: seedRecords.recordId }).from(seedRecords).where(eq(seedRecords.tableName, tableName))).map(
    (r) => r.id
  );

const record = (tx, tableName, recordId) =>
  tx.insert(seedRecords).values({ tableName, recordId }).onConflictDoNothing();

/** Matches a seed category/brand by both name and description (so a real one with the same name is safe). */
const matchesSeed = (row, list) => list.some((s) => s.name === row.name && (s.description ?? null) === (row.description ?? null));

/** Delete, or when other rows still point at it (FK 23503), apply the fallback instead. */
async function deleteOr(tx, run, fallback) {
  try {
    await tx.transaction(async (sp) => run(sp));
    return "delete";
  } catch (error) {
    if ((error.cause?.code ?? error.code) !== "23503" || !fallback) throw error;
    await fallback(tx);
    return "hide";
  }
}

export const demoDataService = {
  /** What install would add and what remove would take out. */
  async status({ actorId } = {}) {
    const removal = await this.plan(db, { actorId });
    const existingSkus = await db
      .select({ sku: productVariants.sku })
      .from(productVariants)
      .where(inArray(productVariants.sku, DEMO_CATALOG_PRODUCTS.flatMap((p) => p.variants.map((v) => v.sku))));
    const present = new Set(existingSkus.map((r) => r.sku));
    const missing = DEMO_CATALOG_PRODUCTS.filter((p) => !p.variants.some((v) => present.has(v.sku)));
    return {
      catalog: {
        categories: DEMO_CATALOG_CATEGORIES.map((c) => c.name),
        brands: DEMO_CATALOG_BRANDS.map((b) => b.name),
        products: DEMO_CATALOG_PRODUCTS.map((p) => ({
          name: p.name,
          price: p.price,
          variants: p.variants.length,
          stock: p.variants.reduce((n, v) => n + v.stock, 0),
          installed: !missing.includes(p),
        })),
        images: DEMO_IMAGES.length,
        toInstall: missing.length,
      },
      removal,
    };
  },

  /** Everything remove() would touch, with what happens to each row. */
  async plan(tx, { actorId } = {}) {
    const recordedProducts = await recorded(tx, "products");
    const legacyProducts = (
      await tx
        .selectDistinct({ id: productVariants.productId })
        .from(productVariants)
        .where(inArray(productVariants.sku, LEGACY.skus))
    ).map((r) => r.id);
    const productIds = [...new Set([...recordedProducts, ...legacyProducts])];
    const productRows = productIds.length
      ? await tx
          .select({
            id: products.id,
            name: products.name,
            categoryId: products.categoryId,
            brandId: products.brandId,
            isActive: products.isActive,
            ordered: sql`exists (select 1 from order_items oi where oi.product_id = "products"."id")`.mapWith(Boolean),
          })
          .from(products)
          .where(inArray(products.id, productIds))
      : [];

    // Categories/brands: recorded or matching the old seed, and unused by your products.
    const owners = async (table, column, recordedIds, legacyList) => {
      const rows = await tx.select().from(table);
      const candidates = rows.filter((r) => recordedIds.includes(r.id) || matchesSeed(r, legacyList));
      if (!candidates.length) return [];
      const used = await tx
        .selectDistinct({ id: column })
        .from(products)
        .where(
          and(
            inArray(column, candidates.map((c) => c.id)),
            productIds.length ? notInArray(products.id, productIds) : undefined
          )
        );
      const usedIds = new Set(used.map((u) => u.id));
      return candidates.map((c) => ({ id: c.id, name: c.name, action: usedIds.has(c.id) ? "keep" : "delete" }));
    };
    const categoryRows = await owners(categories, products.categoryId, await recorded(tx, "categories"), [
      ...LEGACY.categories,
    ]);
    const brandRows = await owners(brands, products.brandId, await recorded(tx, "brands"), [...LEGACY.brands]);

    const couponRows = await tx.select({ id: coupons.id, name: coupons.code }).from(coupons).where(inArray(coupons.code, LEGACY.couponCodes));
    const discountRows = await tx.select({ id: discounts.id, name: discounts.name }).from(discounts).where(eq(discounts.name, LEGACY.discountName));
    const storeRows = await tx
      .select({ id: stores.id, name: stores.name })
      .from(stores)
      .where(and(eq(stores.name, LEGACY.store.name), eq(stores.email, LEGACY.store.email)));
    const supplierRows = await tx.select({ id: suppliers.id, name: suppliers.name }).from(suppliers).where(eq(suppliers.email, LEGACY.supplierEmail));
    const adminRows = await tx
      .select({
        id: users.id,
        name: users.email,
        isActive: users.isActive,
        hasOrders: sql`exists (select 1 from orders o where o.user_id = "users"."id")`.mapWith(Boolean),
      })
      .from(users)
      .where(eq(users.email, LEGACY.adminEmail));

    const groups = [
      {
        key: "products",
        label: "สินค้าตัวอย่าง",
        // Ordered ones already hidden by an earlier removal have nothing left to do.
        items: productRows
          .filter((p) => !(p.ordered && p.isActive === false))
          .map((p) => ({ id: p.id, name: p.name, action: p.ordered ? "hide" : "delete" })),
      },
      { key: "categories", label: "หมวดหมู่", items: categoryRows },
      { key: "brands", label: "แบรนด์", items: brandRows },
      { key: "coupons", label: "คูปองตัวอย่าง", items: couponRows.map((c) => ({ ...c, action: "delete" })) },
      { key: "discounts", label: "โปรโมชันตัวอย่าง", items: discountRows.map((d) => ({ ...d, action: "delete" })) },
      { key: "stores", label: "สาขาตัวอย่าง", items: storeRows.map((s) => ({ ...s, action: "delete" })) },
      { key: "suppliers", label: "ซัพพลายเออร์ตัวอย่าง", items: supplierRows.map((s) => ({ ...s, action: "delete" })) },
      {
        key: "users",
        label: "บัญชีแอดมินตัวอย่าง",
        items: adminRows.filter((u) => !(u.hasOrders && u.isActive === false)).map((u) => ({
          id: u.id,
          name: u.name,
          action: u.id === actorId ? "keep" : u.hasOrders ? "hide" : "delete",
          ...(u.id === actorId && { reason: "คุณกำลังใช้บัญชีนี้อยู่" }),
        })),
      },
    ].filter((g) => g.items.length);
    return { groups, total: groups.reduce((n, g) => n + g.items.filter((i) => i.action !== "keep").length, 0) };
  },

  /** Add the demo catalogue (with photos). Never deletes anything. */
  async install() {
    // Upload photos first (same keys every time, so re-running overwrites).
    for (const file of DEMO_IMAGES) {
      const buffer = await fs.promises.readFile(path.join(IMAGE_DIR, file));
      await uploadFile(BUCKETS.PRODUCTS, `${DEMO_IMAGE_PREFIX}${file}`, buffer, "image/jpeg");
    }

    return db.transaction(async (tx) => {
      const ids = { categories: {}, brands: {} };
      const created = { categories: 0, brands: 0, products: 0, skipped: 0 };
      for (const [list, table, bucket] of [
        [DEMO_CATALOG_CATEGORIES, categories, "categories"],
        [DEMO_CATALOG_BRANDS, brands, "brands"],
      ]) {
        for (const item of list) {
          const [existing] = await tx.select({ id: table.id }).from(table).where(eq(table.name, item.name)).limit(1);
          if (existing) {
            ids[bucket][item.key] = existing.id; // reuse yours; it is not removed later
            continue;
          }
          const [row] = await tx.insert(table).values({ name: item.name, description: item.description }).returning({ id: table.id });
          await record(tx, bucket, row.id);
          ids[bucket][item.key] = row.id;
          created[bucket] += 1;
        }
      }

      const skus = DEMO_CATALOG_PRODUCTS.flatMap((p) => p.variants.map((v) => v.sku));
      const taken = new Set(
        (await tx.select({ sku: productVariants.sku }).from(productVariants).where(inArray(productVariants.sku, skus))).map((r) => r.sku)
      );
      // Oldest first so the first product in the file shows first under "newest".
      for (const item of [...DEMO_CATALOG_PRODUCTS].reverse()) {
        if (item.variants.some((v) => taken.has(v.sku))) {
          created.skipped += 1;
          continue;
        }
        const [product] = await tx
          .insert(products)
          .values({
            name: item.name,
            description: item.description,
            price: String(item.price),
            imageUrl: item.images.map((file) => `${DEMO_IMAGE_PREFIX}${file}`),
            categoryId: ids.categories[item.category],
            brandId: ids.brands[item.brand],
            isActive: true,
          })
          .returning({ id: products.id });
        await tx.insert(productVariants).values(
          item.variants.map((v) => ({ productId: product.id, color: v.color, size: v.size, sku: v.sku, stock: v.stock, price: String(v.price) }))
        );
        const specs = Object.entries(item.attributes ?? {});
        if (specs.length) {
          await tx.insert(productAttributes).values(specs.map(([name, value]) => ({ productId: product.id, name, value })));
        }
        await record(tx, "products", product.id);
        created.products += 1;
      }
      return created;
    });
  },

  /** Remove demo and old seed data; see plan(). Returns what happened per group. */
  async remove({ actorId } = {}) {
    const result = await db.transaction(async (tx) => {
      const { groups } = await this.plan(tx, { actorId });
      const done = {};
      const ids = (key, action) => groups.find((g) => g.key === key)?.items.filter((i) => i.action === action).map((i) => i.id) ?? [];
      const count = (key, action) => {
        done[key] ??= { deleted: 0, hidden: 0, kept: 0 };
        done[key][action === "delete" ? "deleted" : action === "hide" ? "hidden" : "kept"] += 1;
      };

      // Products: delete (variants, carts, wishlists, reviews cascade) or hide when ordered.
      for (const id of ids("products", "delete")) {
        count("products", await deleteOr(tx, (sp) => sp.delete(products).where(eq(products.id, id)), (t) => t.update(products).set({ isActive: false }).where(eq(products.id, id))));
      }
      for (const id of ids("products", "hide")) {
        await tx.update(products).set({ isActive: false }).where(eq(products.id, id));
        count("products", "hide");
      }
      for (const [key, table] of [["categories", categories], ["brands", brands]]) {
        for (const id of ids(key, "delete")) {
          await tx.delete(table).where(eq(table.id, id));
          count(key, "delete");
        }
        for (const _ of ids(key, "keep")) count(key, "keep");
      }
      const simple = [
        ["coupons", coupons, (t, id) => t.update(coupons).set({ isActive: false }).where(eq(coupons.id, id))],
        ["discounts", discounts, (t, id) => t.update(discounts).set({ isActive: false }).where(eq(discounts.id, id))],
        ["stores", stores, (t, id) => t.update(stores).set({ isActive: false }).where(eq(stores.id, id))],
        ["suppliers", suppliers, (t, id) => t.update(suppliers).set({ status: "inactive" }).where(eq(suppliers.id, id))],
      ];
      for (const [key, table, deactivate] of simple) {
        for (const id of ids(key, "delete")) {
          count(key, await deleteOr(tx, (sp) => sp.delete(table).where(eq(table.id, id)), (t) => deactivate(t, id)));
        }
      }
      // The demo admin has a published password: delete it, or lock it if it has orders.
      const lockUser = (t, id) => t.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, id));
      for (const id of ids("users", "delete")) count("users", await deleteOr(tx, (sp) => sp.delete(users).where(eq(users.id, id)), (t) => lockUser(t, id)));
      for (const id of ids("users", "hide")) {
        await lockUser(tx, id);
        count("users", "hide");
      }
      for (const _ of ids("users", "keep")) count("users", "keep");

      // Forget records whose rows are gone.
      await tx.execute(sql`
        delete from ${seedRecords} s
        where (s.table_name = 'products' and not exists (select 1 from ${products} p where p.id = s.record_id))
           or (s.table_name = 'categories' and not exists (select 1 from ${categories} c where c.id = s.record_id))
           or (s.table_name = 'brands' and not exists (select 1 from ${brands} b where b.id = s.record_id))`);
      return done;
    });

    // Photos go once no product (including hidden ordered ones) shows them.
    const [{ inUse }] = await db
      .select({ inUse: sql`count(*)::int` })
      .from(products)
      .where(sql`${products.imageUrl}::text like ${`%"${DEMO_IMAGE_PREFIX}%`}`);
    let imagesDeleted = 0;
    if (!inUse) {
      for (const file of DEMO_IMAGES) {
        try {
          await deleteFile(BUCKETS.PRODUCTS, `${DEMO_IMAGE_PREFIX}${file}`);
          imagesDeleted += 1;
        } catch {
          // Already gone.
        }
      }
    }
    return { ...result, images: { deleted: imagesDeleted } };
  },
};
