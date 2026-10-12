import { db } from "../config/db.js";
import { orders, users, products, productVariants, orderItems, coupons } from "../models/schema.js";
import { and, eq, ne, gte, lte, desc, sql, inArray, isNotNull } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import * as seedData from "../seed/data.js";

const PAID = ["completed", "partially_refunded", "refunded"];
const LOW_STOCK = 5;

/** Revenue = paid orders minus refunds. */
const revenue = sql`coalesce(sum(${orders.total}) - coalesce(sum(${orders.refundAmount}), 0), 0)`;

async function salesSince(start) {
  const [row] = await db
    .select({ total: revenue, count: sql`count(*)::int` })
    .from(orders)
    .where(and(inArray(orders.paymentStatus, PAID), gte(orders.createdAt, start)));
  return { total: Number(row.total), count: row.count };
}

export const adminService = {
  /** Admin dashboard. All money figures count paid orders only. */
  async getDashboardData() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const paidSince = (start) => and(inArray(orders.paymentStatus, PAID), gte(orders.createdAt, start));

    const [
      today,
      week,
      month,
      [gross],
      statusCounts,
      [customers],
      topSpenders,
      [productCount],
      lowStock,
      outOfStock,
      topSelling,
      salesChart,
      ordersChart,
      customerMonthly,
      stockMovement,
      activeCoupons,
      [newOrdersToday],
    ] = await Promise.all([
      salesSince(startOfDay),
      salesSince(startOfWeek),
      salesSince(startOfMonth),
      db.select({ total: revenue }).from(orders).where(inArray(orders.paymentStatus, PAID)),
      db.select({ status: orders.status, count: sql`count(*)::int` }).from(orders).groupBy(orders.status),
      db
        .select({
          total: sql`count(*)::int`,
          new7d: sql`(count(*) filter (where ${users.createdAt} >= ${sevenDaysAgo}))::int`,
          newMonth: sql`(count(*) filter (where ${users.createdAt} >= ${startOfMonth}))::int`,
        })
        .from(users),
      db
        .select({ userId: orders.userId, name: users.name, email: users.email, totalSpent: sql`sum(${orders.total})` })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .where(and(isNotNull(orders.userId), inArray(orders.paymentStatus, PAID)))
        .groupBy(orders.userId, users.name, users.email)
        .orderBy(desc(sql`sum(${orders.total})`))
        .limit(5),
      db.select({ count: sql`count(*)::int` }).from(products).where(eq(products.isActive, true)),
      db.query.productVariants.findMany({
        where: and(sql`${productVariants.stock} > 0`, lte(productVariants.stock, LOW_STOCK)),
        with: { product: { columns: { id: true, name: true } } },
        orderBy: [productVariants.stock],
        limit: 10,
      }),
      db.query.productVariants.findMany({
        where: eq(productVariants.stock, 0),
        with: { product: { columns: { id: true, name: true } } },
        limit: 10,
      }),
      db
        .select({ productId: orderItems.productId, name: products.name, totalSold: sql`sum(${orderItems.quantity})::int` })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(inArray(orders.paymentStatus, PAID))
        .groupBy(orderItems.productId, products.name)
        .orderBy(desc(sql`sum(${orderItems.quantity})`))
        .limit(5),
      db
        .select({ date: sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`, total: revenue })
        .from(orders)
        .where(paidSince(thirtyDaysAgo))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
      db
        .select({ date: sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`, count: sql`count(*)::int` })
        .from(orders)
        // Cancelled orders are not real orders (e.g. abandoned PromptPay QR).
        .where(and(gte(orders.createdAt, thirtyDaysAgo), ne(orders.status, "cancelled")))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
      db
        .select({ month: sql`to_char(${users.createdAt}, 'YYYY-MM')`, newCount: sql`count(*)::int` })
        .from(users)
        .where(gte(users.createdAt, sixMonthsAgo))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
      db
        .select({ productId: orderItems.productId, name: products.name, sold: sql`sum(${orderItems.quantity})::int` })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(paidSince(sevenDaysAgo))
        .groupBy(orderItems.productId, products.name)
        .orderBy(desc(sql`sum(${orderItems.quantity})`))
        .limit(5),
      db.query.coupons.findMany({
        where: and(eq(coupons.isActive, true), lte(coupons.startDate, now), gte(coupons.endDate, now)),
        orderBy: [coupons.endDate],
        limit: 5,
      }),
      db
        .select({ count: sql`count(*)::int` })
        .from(orders)
        .where(and(gte(orders.createdAt, startOfDay), ne(orders.status, "cancelled"))),
    ]);

    // Real alerts (these used to be hard-coded messages).
    const notifications = [];
    if (lowStock.length) notifications.push({ type: "low_stock", message: `${lowStock.length} variant(s) are running low on stock` });
    if (outOfStock.length) notifications.push({ type: "out_of_stock", message: `${outOfStock.length} variant(s) are out of stock` });
    if (newOrdersToday.count) notifications.push({ type: "new_order", message: `${newOrdersToday.count} new order(s) today` });
    // Payments that need a person: refunds that kept failing, outcomes still unknown.
    const [[refundFailed], [unconfirmed]] = await Promise.all([
      db.execute(sql`select count(*)::int as n from payment_transactions where (payment_details->>'refundFailed') = 'true'`).then((r) => r.rows ?? r),
      db.select({ n: sql`count(*)::int` }).from(orders).where(and(eq(orders.status, "pending"), eq(orders.paymentStatus, "processing"))),
    ]);
    if (refundFailed?.n) notifications.push({ type: "refund_failed", message: `${refundFailed.n} automatic refund(s) failed: refund them in the Omise dashboard` });
    if (unconfirmed?.n) notifications.push({ type: "payment_unconfirmed", message: `${unconfirmed.n} order(s) waiting for payment confirmation from Omise` });

    return {
      salesSummary: { today, week, month, grossRevenue: Number(gross.total), statusCounts },
      customers: {
        total: customers.total,
        new7d: customers.new7d,
        newMonth: customers.newMonth,
        topSpenders: topSpenders.map((s) => ({ ...s, totalSpent: Number(s.totalSpent) })),
      },
      inventory: { total: productCount.count, lowStock, outOfStock, topSelling },
      analytics: {
        salesChart: salesChart.map((p) => ({ ...p, total: Number(p.total) })),
        ordersChart,
        customerMonthly,
        topProducts: topSelling,
        stockMovement,
        promotions: activeCoupons.map((c) => ({ title: c.code, date: c.endDate, desc: `${c.type} ${c.value}` })),
      },
      products: { latest: [], mostViewed: [] },
      recentActivities: [],
      notifications,
    };
  },

  /**
   * What each seed would delete (live counts) and create (the seed data
   * itself), and whether it can run: orders reference products, addresses
   * and shipping/payment methods, so those seeds fail while orders exist.
   */
  async getSeedPreview() {
    const tables = {
      users: "ผู้ใช้ (รวมแอดมินทุกคน)",
      user_roles: "สิทธิ์ผู้ใช้",
      addresses: "ที่อยู่ของผู้ใช้",
      carts: "ตะกร้าสินค้า",
      products: "สินค้า",
      product_variants: "ตัวเลือกสินค้า (SKU)",
      categories: "หมวดหมู่",
      brands: "แบรนด์",
      coupons: "คูปอง",
      discounts: "โปรโมชันส่วนลด",
      stores: "สาขา/คลังสินค้า",
      store_inventory: "สต็อกในสาขา",
      suppliers: "ซัพพลายเออร์",
      shipping_zones: "โซนจัดส่ง",
      shipping_methods: "วิธีจัดส่ง",
      payment_methods: "วิธีชำระเงิน",
      provinces: "จังหวัด",
      districts: "อำเภอ/เขต",
      subdistricts: "ตำบล/แขวง",
      orders: "ออเดอร์",
    };
    const counts = {};
    for (const table of Object.keys(tables)) {
      const res = await db.execute(sql.raw(`select count(*)::int as n from "${table}"`));
      counts[table] = (res.rows ?? res)[0].n;
    }
    const del = (names) => names.map((t) => ({ label: tables[t], count: counts[t] })).filter((d) => d.count > 0);
    const blockedByOrders =
      counts.orders > 0
        ? `มีออเดอร์ ${counts.orders} รายการที่อ้างอิงสินค้า ที่อยู่ และวิธีจัดส่ง/ชำระเงินอยู่ จึงลบข้อมูลเหล่านี้ไม่ได้ (seed จะล้มเหลว) ใช้ได้กับฐานข้อมูลใหม่หรือฐานข้อมูลทดสอบเท่านั้น`
        : null;

    const csvRows = (file) => {
      try {
        const text = fs.readFileSync(path.join(process.cwd(), "src/seed/csv", file), "utf8");
        // Data rows = non-empty lines minus the header.
        return Math.max(0, text.split(/\r?\n/).filter((l) => l.trim()).length - 1);
      } catch {
        return null;
      }
    };
    const { DEMO_ADMIN, DEMO_CATEGORIES, DEMO_BRANDS, DEMO_PRODUCTS, DEMO_COUPONS, DEMO_DISCOUNT, DEMO_STORE, DEMO_SUPPLIER } = seedData;
    const baht = (n) => `฿${Number(n).toLocaleString("th-TH")}`;

    const address = {
      deletes: del(["provinces", "districts", "subdistricts"]),
      creates: [
        { label: "จังหวัด", count: csvRows("provinces.csv") },
        { label: "อำเภอ/เขต", count: csvRows("districts.csv") },
        { label: "ตำบล/แขวง พร้อมรหัสไปรษณีย์", count: csvRows("sub_districts.csv") },
      ],
      notes: ["ที่อยู่ที่ลูกค้าบันทึกไว้ไม่ได้รับผลกระทบ (เก็บชื่อจังหวัด/อำเภอเป็นข้อความ)"],
      blocked: null,
    };
    const shipping = {
      deletes: del(["shipping_zones", "shipping_methods", "payment_methods"]),
      creates: [
        {
          label: "โซนและวิธีจัดส่ง",
          count: seedData.SHIPPING_ZONES.reduce((n, z) => n + z.methods.length, 0),
          items: seedData.SHIPPING_ZONES.flatMap((z) => z.methods.map((m) => `${z.name}: ${m.name} ${baht(m.price)}`)),
        },
        { label: "วิธีชำระเงิน", count: seedData.PAYMENT_METHODS.length, items: seedData.PAYMENT_METHODS.map((m) => m.name) },
      ],
      notes: [],
      blocked: blockedByOrders,
    };
    const main = {
      deletes: del(["users", "user_roles", "addresses", "carts", "products", "product_variants", "categories", "brands", "coupons", "discounts", "stores", "store_inventory", "suppliers"]),
      creates: [
        { label: "บัญชีแอดมิน", count: 1, items: [`${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`] },
        { label: "หมวดหมู่", count: DEMO_CATEGORIES.length, items: DEMO_CATEGORIES.map((c) => c.name) },
        { label: "แบรนด์", count: DEMO_BRANDS.length, items: DEMO_BRANDS.map((b) => b.name) },
        {
          label: "สินค้า",
          count: DEMO_PRODUCTS.length,
          items: DEMO_PRODUCTS.map(
            (p) => `${p.name} ${baht(p.price)} · ${p.variants.map((v) => `${v.color}/${v.size} ×${v.stock}`).join(", ")}`
          ),
        },
        {
          label: "คูปอง (อายุ " + seedData.COUPON_VALID_DAYS + " วัน)",
          count: DEMO_COUPONS.length,
          items: DEMO_COUPONS.map((c) =>
            `${c.code}: ${c.type === "percentage" ? `ลด ${c.value}%` : `ลด ${baht(c.value)}`}${c.minPurchase ? ` ขั้นต่ำ ${baht(c.minPurchase)}` : ""}`
          ),
        },
        { label: "โปรโมชัน", count: 1, items: [DEMO_DISCOUNT.name] },
        { label: "สาขา/คลัง และซัพพลายเออร์", count: 2, items: [DEMO_STORE.name, DEMO_SUPPLIER.name] },
      ],
      notes: ["ผู้ใช้ทุกคนจะถูกลบ รวมถึงบัญชีที่คุณใช้อยู่ตอนนี้ ต้องเข้าสู่ระบบใหม่ด้วยบัญชีแอดมินตัวอย่าง"],
      blocked: blockedByOrders,
    };
    const all = {
      deletes: [...main.deletes, ...shipping.deletes, ...address.deletes],
      creates: [...main.creates, ...shipping.creates, ...address.creates],
      notes: [...main.notes, ...address.notes],
      blocked: blockedByOrders,
    };
    return { address, shipping, main, all };
  },
};
