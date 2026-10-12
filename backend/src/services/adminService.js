import { db } from "../config/db.js";
import { orders, users, products, productVariants, orderItems, coupons } from "../models/schema.js";
import { and, eq, gte, lte, desc, sql, inArray, isNotNull } from "drizzle-orm";

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
        .where(gte(orders.createdAt, thirtyDaysAgo))
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
      db.select({ count: sql`count(*)::int` }).from(orders).where(gte(orders.createdAt, startOfDay)),
    ]);

    // Real alerts (these used to be hard-coded messages).
    const notifications = [];
    if (lowStock.length) notifications.push({ type: "low_stock", message: `${lowStock.length} variant(s) are running low on stock` });
    if (outOfStock.length) notifications.push({ type: "out_of_stock", message: `${outOfStock.length} variant(s) are out of stock` });
    if (newOrdersToday.count) notifications.push({ type: "new_order", message: `${newOrdersToday.count} new order(s) today` });

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
};
