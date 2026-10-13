import { randomUUID } from "node:crypto";

const unique = () => randomUUID().slice(0, 8);
const load = async () => ({
  db: (await import("../../config/db.js")).db,
  schema: await import("../../models/schema.js"),
});

/** Insert an order directly for `userId` with the given totals/status. */
export async function createOrder(userId, overrides = {}) {
  const { db, schema } = await load();
  const total = overrides.total ?? "1000.00";
  const [order] = await db
    .insert(schema.orders)
    .values({
      userId,
      orderNumber: `TEST-${randomUUID().slice(0, 12)}`,
      subtotal: total,
      shippingCost: "0.00",
      tax: "0.00",
      total,
      ...overrides,
    })
    .returning();
  return order;
}

/** An order by `userId` containing `product` (one unit), in `status`. */
export async function orderWithProduct(userId, { product, variant }, status = "delivered") {
  const { db, schema } = await load();
  const order = await createOrder(userId, { status, paymentStatus: "completed", total: product.price ?? "100.00" });
  await db.insert(schema.orderItems).values({
    orderId: order.id,
    productId: product.id,
    variantId: variant?.id ?? null,
    quantity: 1,
    price: "100.00",
    subtotal: "100.00",
  });
  return order;
}

/** A product with one variant. */
export async function createProduct({ price = "100.00", stock = 10, isActive = true, ...extra } = {}) {
  const { db, schema } = await load();
  const [product] = await db
    .insert(schema.products)
    .values({ name: `Product ${unique()}`, price, isActive, ...extra })
    .returning();
  const [variant] = await db
    .insert(schema.productVariants)
    .values({ productId: product.id, color: "Black", size: "M", sku: `SKU-${unique()}`, stock, price })
    .returning();
  return { product, variant };
}

/** A shipping zone with one active method. */
export async function createShipping({ price = "50.00" } = {}) {
  const { db, schema } = await load();
  const [zone] = await db
    .insert(schema.shippingZones)
    .values({ name: `Zone ${unique()}`, baseCost: price })
    .returning();
  const [method] = await db
    .insert(schema.shippingMethods)
    .values({ name: "Standard", code: `STD-${unique()}`, price, shippingZoneId: zone.id })
    .returning();
  return { zone, method };
}

export async function createAddress(userId, shippingZoneId) {
  const { db, schema } = await load();
  const [address] = await db
    .insert(schema.addresses)
    .values({
      userId,
      shippingZoneId,
      fullName: "Test Buyer",
      addressLine1: "1 Test Road",
      phoneNumber: "0812345678",
      country: "TH",
      province: "Bangkok",
      postalCode: "10110",
    })
    .returning();
  return address;
}

/** Payment methods are global and unique by code; reuse across tests. */
export async function getPaymentMethod(code) {
  const { db, schema } = await load();
  const { eq } = await import("drizzle-orm");
  const existing = await db.query.paymentMethods.findFirst({
    where: eq(schema.paymentMethods.code, code),
  });
  if (existing) return existing;
  const [created] = await db
    .insert(schema.paymentMethods)
    .values({ name: code, code, isActive: true })
    .onConflictDoNothing()
    .returning();
  return created ?? db.query.paymentMethods.findFirst({ where: eq(schema.paymentMethods.code, code) });
}

export async function createCoupon(overrides = {}) {
  const { db, schema } = await load();
  const day = 24 * 60 * 60 * 1000;
  const [coupon] = await db
    .insert(schema.coupons)
    .values({
      code: `SAVE${unique().toUpperCase()}`,
      type: "percentage",
      value: "10",
      startDate: new Date(Date.now() - day),
      endDate: new Date(Date.now() + day),
      isActive: true,
      ...overrides,
    })
    .returning();
  return coupon;
}

/** Everything a user needs to check out one product. */
export async function checkoutSetup(user, { price = "100.00", stock = 10, shippingPrice = "50.00", paymentCode = "card" } = {}) {
  const { product, variant } = await createProduct({ price, stock });
  const { method } = await createShipping({ price: shippingPrice });
  const address = await createAddress(user.id, method.shippingZoneId);
  const paymentMethod = await getPaymentMethod(paymentCode);
  return {
    product,
    variant,
    shippingMethod: method,
    address,
    paymentMethod,
    body: (overrides = {}) => ({
      shippingAddressId: address.id,
      shippingMethodId: method.id,
      paymentMethodId: paymentMethod.id,
      items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      ...(paymentCode === "card" && { omiseToken: "tokn_test" }),
      ...overrides,
    }),
  };
}

export async function getVariantStock(variantId) {
  const { db, schema } = await load();
  const { eq } = await import("drizzle-orm");
  const variant = await db.query.productVariants.findFirst({
    where: eq(schema.productVariants.id, variantId),
  });
  return variant.stock;
}

export async function createCategory(overrides = {}) {
  const { db, schema } = await load();
  const [category] = await db
    .insert(schema.categories)
    .values({ name: `Category ${unique()}`, ...overrides })
    .returning();
  return category;
}

export async function createBrand(overrides = {}) {
  const { db, schema } = await load();
  const [brand] = await db
    .insert(schema.brands)
    .values({ name: `Brand ${unique()}`, isActive: true, ...overrides })
    .returning();
  return brand;
}

/** Smallest valid PNG (1x1), for upload tests. */
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);
