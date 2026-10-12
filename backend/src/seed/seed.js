// seed.js
import { db } from "../config/db.js";
import {
  brands,
  userRoles,
  categories,
  productVariants as product_variants,
  products,
  users,
  stores,
  storeInventory,
  suppliers,
  supplierProducts,
  coupons,
  discounts,
  productDiscounts,
} from "../models/schema.js";
import { hashPassword } from "../utils/hashPassword.js";
import {
  COUPON_VALID_DAYS,
  DEMO_ADMIN,
  DEMO_BRANDS,
  DEMO_CATEGORIES,
  DEMO_COUPONS,
  DEMO_DISCOUNT,
  DEMO_PRODUCTS,
  DEMO_STORE,
  DEMO_SUPPLIER,
  DISCOUNT_VALID_DAYS,
} from "./data.js";

async function seed() {
  try {
    console.log("Clearing existing data...");
    await db.delete(productDiscounts);
    await db.delete(discounts);
    await db.delete(coupons);
    await db.delete(supplierProducts);
    await db.delete(suppliers);
    await db.delete(storeInventory);
    await db.delete(stores);
    await db.delete(product_variants);
    await db.delete(products);
    await db.delete(categories);
    await db.delete(brands);
    await db.delete(userRoles);
    await db.delete(users);
    console.log("Existing data cleared!");

    const DAY = 24 * 60 * 60 * 1000;

    // Admin account (login: admin@example.com / admin123)
    const [adminUser] = await db
      .insert(users)
      .values([
        {
          name: DEMO_ADMIN.name,
          email: DEMO_ADMIN.email,
          password: await hashPassword(DEMO_ADMIN.password),
          isVerified: true,
          isActive: true,
        },
      ])
      .returning();
    await db.insert(userRoles).values([{ userId: adminUser.id, role: "admin" }]);

    const [store] = await db.insert(stores).values([DEMO_STORE]).returning();

    const categoryRows = await db
      .insert(categories)
      .values(DEMO_CATEGORIES.map(({ name, description }) => ({ name, description })))
      .returning();
    const categoryId = Object.fromEntries(DEMO_CATEGORIES.map((c, i) => [c.key, categoryRows[i].id]));

    const brandRows = await db
      .insert(brands)
      .values(DEMO_BRANDS.map(({ key: _key, ...b }) => ({ ...b, logo: null, isActive: true })))
      .returning();
    const brandId = Object.fromEntries(DEMO_BRANDS.map((b, i) => [b.key, brandRows[i].id]));

    const productRows = await db
      .insert(products)
      .values(
        DEMO_PRODUCTS.map((p) => ({
          name: p.name,
          description: p.description,
          price: p.price,
          imageUrl: [],
          categoryId: categoryId[p.category],
          brandId: brandId[p.brand],
        }))
      )
      .returning();
    const productId = Object.fromEntries(DEMO_PRODUCTS.map((p, i) => [p.key, productRows[i].id]));

    const variants = await db
      .insert(product_variants)
      .values(DEMO_PRODUCTS.flatMap((p) => p.variants.map((v) => ({ ...v, productId: productId[p.key] }))))
      .returning();

    // Store inventory matches the variant stock
    await db.insert(storeInventory).values(
      variants.map((v) => ({ storeId: store.id, productId: v.productId, variantId: v.id, quantity: v.stock }))
    );

    const { products: supplied, ...supplierFields } = DEMO_SUPPLIER;
    const [supplier] = await db.insert(suppliers).values([supplierFields]).returning();
    await db
      .insert(supplierProducts)
      .values(supplied.map(({ product, ...rest }) => ({ ...rest, supplierId: supplier.id, productId: productId[product] })));

    await db.insert(coupons).values(
      DEMO_COUPONS.map((c) => ({
        ...c,
        startDate: new Date(),
        endDate: new Date(Date.now() + COUPON_VALID_DAYS * DAY),
        isActive: true,
      }))
    );

    const { products: discounted, ...discountFields } = DEMO_DISCOUNT;
    const [discount] = await db
      .insert(discounts)
      .values([
        {
          ...discountFields,
          startDate: new Date(),
          endDate: new Date(Date.now() + DISCOUNT_VALID_DAYS * DAY),
          isActive: true,
        },
      ])
      .returning();
    await db.insert(productDiscounts).values(discounted.map((key) => ({ discountId: discount.id, productId: productId[key] })));

    console.log("Seed data inserted successfully!");
  } catch (error) {
    console.error("Error seeding data:", error);
    throw error;
  }
}

// Run the seed function
seed()
  .then(() => {
    console.log("Seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
