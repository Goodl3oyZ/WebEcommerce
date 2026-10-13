/**
 * Admin reports, computed in SQL. Money figures count paid orders only
 * (minus refunds). Shapes match frontend/src/components/admin/ReportsPanel.js.
 */
import { db } from "../config/db.js";
import {
  orders,
  orderItems,
  products,
  productVariants,
  categories,
  users,
  suppliers,
  supplierProducts,
  storeInventory,
} from "../models/schema.js";
import { and, eq, gte, lte, lt, desc, asc, sql, inArray, isNotNull } from "drizzle-orm";

const PAID = ["completed", "partially_refunded", "refunded"];
const LOW_STOCK = 5;
// Whitelisted: inlined into SQL so SELECT and GROUP BY are the same expression.
const BUCKETS = { day: "day", week: "week", month: "month", year: "year" };

/**
 * Reports read days in the shop's time zone (timestamps are stored in UTC), so
 * "1 Oct" means 1 Oct in Thailand and daily totals do not split at 07:00.
 */
const TZ = /^[A-Za-z_]+(\/[A-Za-z_]+)*$/.test(process.env.REPORT_TIMEZONE ?? "") ? process.env.REPORT_TIMEZONE : "Asia/Bangkok";
const local = (column) => sql`(${column} at time zone 'UTC' at time zone ${sql.raw(`'${TZ}'`)})`;
const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date (YYYY-MM-DD) in the shop's time zone. */
export const localToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

/**
 * Default range: the last 30 days including today. Plain dates are whole days
 * in the shop's time zone (endDate included). Without endDate there is no upper
 * bound: comparing against the API server's "now" would drop just-created rows
 * whenever the database clock is slightly ahead.
 */
export function dateRange({ startDate, endDate }) {
  let start = startDate;
  if (!start) {
    const base = new Date(`${endDate && PLAIN_DATE.test(endDate) ? endDate : localToday()}T00:00:00Z`);
    base.setUTCDate(base.getUTCDate() - 29);
    start = base.toISOString().slice(0, 10);
  }
  return { start, end: endDate ?? null, timeZone: TZ };
}

function inRange(column, { start, end }) {
  const lower = PLAIN_DATE.test(start) ? sql`${local(column)} >= ${start}::date` : gte(column, new Date(start));
  if (!end) return lower;
  const upper = PLAIN_DATE.test(end)
    ? sql`${local(column)} < ${end}::date + 1`
    : lt(column, new Date(end));
  return and(lower, upper);
}

const net = sql`coalesce(sum(${orders.total}) - coalesce(sum(${orders.refundAmount}), 0), 0)`;
const sumOf = (column) => sql`coalesce(sum(${column}), 0)`;

export const reportService = {
  async generateSalesReport(query) {
    const range = dateRange(query);
    const bucket = BUCKETS[query.groupBy] ?? "day";
    const paid = and(inArray(orders.paymentStatus, PAID), inRange(orders.createdAt, range));
    const period = sql`to_char(date_trunc(${sql.raw(`'${bucket}'`)}, ${local(orders.createdAt)}), 'YYYY-MM-DD')`;

    const [[summary], series, statusBreakdown, topProducts, byCategory, [items]] = await Promise.all([
      db
        .select({
          totalRevenue: net,
          totalOrders: sql`count(*)::int`,
          grossSales: sumOf(orders.total),
          refunds: sumOf(orders.refundAmount),
          discounts: sumOf(orders.discount),
          shipping: sumOf(orders.shippingCost),
          tax: sumOf(orders.tax),
        })
        .from(orders)
        .where(paid),
      db
        .select({ date: period, count: sql`count(*)::int`, total: net })
        .from(orders)
        .where(paid)
        .groupBy(period)
        .orderBy(period),
      db
        .select({ status: orders.status, count: sql`count(*)::int` })
        .from(orders)
        .where(inRange(orders.createdAt, range))
        .groupBy(orders.status),
      db
        .select({
          productId: orderItems.productId,
          name: products.name,
          quantity: sql`sum(${orderItems.quantity})::int`,
          revenue: sql`sum(${orderItems.subtotal})`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(paid)
        .groupBy(orderItems.productId, products.name)
        .orderBy(desc(sql`sum(${orderItems.subtotal})`))
        .limit(10),
      db
        .select({ categoryId: categories.id, name: categories.name, revenue: sql`sum(${orderItems.subtotal})` })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .leftJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(paid)
        .groupBy(categories.id, categories.name)
        .orderBy(desc(sql`sum(${orderItems.subtotal})`)),
      db
        .select({ itemsSold: sql`coalesce(sum(${orderItems.quantity}), 0)::int` })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(paid),
    ]);

    const totalRevenue = Number(summary.totalRevenue);
    return {
      period: range,
      groupBy: bucket,
      totalRevenue,
      totalSales: totalRevenue,
      totalOrders: summary.totalOrders,
      averageOrderValue: summary.totalOrders ? Number((totalRevenue / summary.totalOrders).toFixed(2)) : 0,
      itemsSold: items.itemsSold,
      // Money breakdown of paid orders: gross (what customers paid, incl. VAT
      // and shipping, after discounts) minus refunds = totalRevenue.
      breakdown: {
        grossSales: Number(summary.grossSales),
        discounts: Number(summary.discounts),
        shipping: Number(summary.shipping),
        tax: Number(summary.tax),
        refunds: Number(summary.refunds),
      },
      dailySales: series.map((row) => ({ ...row, total: Number(row.total) })),
      statusBreakdown,
      topProducts: topProducts.map((p) => ({ ...p, revenue: Number(p.revenue) })),
      byCategory: byCategory.map((c) => ({ ...c, revenue: Number(c.revenue) })),
    };
  },

  /** Every order in the range (paid or not), by status, payment status and period. */
  async generateOrdersReport(query) {
    const range = dateRange(query);
    const bucket = BUCKETS[query.groupBy] ?? "day";
    const where = inRange(orders.createdAt, range);
    const period = sql`to_char(date_trunc(${sql.raw(`'${bucket}'`)}, ${local(orders.createdAt)}), 'YYYY-MM-DD')`;
    const [[summary], statusBreakdown, paymentBreakdown, series] = await Promise.all([
      db.select({ totalOrders: sql`count(*)::int` }).from(orders).where(where),
      db.select({ status: orders.status, count: sql`count(*)::int` }).from(orders).where(where).groupBy(orders.status),
      db
        .select({ paymentStatus: orders.paymentStatus, count: sql`count(*)::int` })
        .from(orders)
        .where(where)
        .groupBy(orders.paymentStatus),
      db
        .select({ date: period, count: sql`count(*)::int`, total: sql`coalesce(sum(${orders.total}), 0)` })
        .from(orders)
        .where(where)
        .groupBy(period)
        .orderBy(period),
    ]);
    const cancelled = statusBreakdown.find((s) => s.status === "cancelled")?.count ?? 0;
    return {
      period: range,
      totalOrders: summary.totalOrders,
      groupBy: bucket,
      cancellationRate: summary.totalOrders ? Number((cancelled / summary.totalOrders).toFixed(4)) : 0,
      statusBreakdown,
      paymentBreakdown,
      dailySales: series.map((row) => ({ ...row, total: Number(row.total) })),
    };
  },

  /** Online stock (variants), or one branch's stock with storeId. */
  async generateInventoryReport({ storeId, categoryId, threshold = LOW_STOCK }) {
    if (storeId) {
      const rows = await db.query.storeInventory.findMany({
        where: eq(storeInventory.storeId, storeId),
        with: { product: { columns: { id: true, name: true } }, variant: { columns: { sku: true, color: true, size: true } } },
        orderBy: [asc(storeInventory.quantity)],
      });
      const low = rows.filter((r) => r.quantity > 0 && r.quantity <= threshold);
      return {
        storeId,
        totalProducts: new Set(rows.map((r) => r.productId)).size,
        activeProducts: new Set(rows.filter((r) => r.quantity > 0).map((r) => r.productId)).size,
        lowStockCount: low.length,
        outOfStockCount: rows.filter((r) => r.quantity === 0).length,
        lowStockItems: low.map((r) => ({ product: r.product, ...r.variant, stock: r.quantity })),
      };
    }

    const productFilter = categoryId ? eq(products.categoryId, categoryId) : undefined;
    const [[counts], [variantCounts], lowStockItems, valueRow, outOfStockItems] = await Promise.all([
      db
        .select({
          totalProducts: sql`count(*)::int`,
          activeProducts: sql`(count(*) filter (where ${products.isActive} = true))::int`,
        })
        .from(products)
        .where(productFilter),
      db
        .select({
          lowStockCount: sql`(count(*) filter (where ${productVariants.stock} > 0 and ${productVariants.stock} <= ${threshold}))::int`,
          outOfStockCount: sql`(count(*) filter (where ${productVariants.stock} = 0))::int`,
          totalUnits: sql`coalesce(sum(${productVariants.stock}), 0)::int`,
        })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(and(eq(products.isActive, true), productFilter)),
      db
        .select({
          product: { id: products.id, name: products.name },
          sku: productVariants.sku,
          color: productVariants.color,
          size: productVariants.size,
          stock: productVariants.stock,
        })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(
          and(eq(products.isActive, true), productFilter, sql`${productVariants.stock} > 0`, lte(productVariants.stock, threshold))
        )
        .orderBy(asc(productVariants.stock))
        .limit(100),
      db
        .select({ value: sql`coalesce(sum(${productVariants.stock} * ${productVariants.price}), 0)` })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(and(eq(products.isActive, true), productFilter)),
      db
        .select({
          product: { id: products.id, name: products.name },
          sku: productVariants.sku,
          color: productVariants.color,
          size: productVariants.size,
          stock: productVariants.stock,
        })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(and(eq(products.isActive, true), productFilter, eq(productVariants.stock, 0)))
        .orderBy(asc(products.name))
        .limit(100),
    ]);
    return {
      ...counts,
      ...variantCounts,
      threshold,
      stockValue: Number(valueRow[0].value),
      lowStockItems,
      outOfStockItems,
    };
  },

  async generateCustomerReport(query) {
    const range = dateRange(query);
    const paid = and(inArray(orders.paymentStatus, PAID), isNotNull(orders.userId));
    const [[totals], [newCustomers], perCustomer, topCustomers] = await Promise.all([
      db.select({ totalCustomers: sql`count(*)::int` }).from(users),
      db.select({ count: sql`count(*)::int` }).from(users).where(inRange(users.createdAt, range)),
      // Customers who ordered in the range, and how many orders they have overall.
      db
        .select({
          userId: orders.userId,
          ordersInRange: sql`(count(*) filter (where ${inRange(orders.createdAt, range)}))::int`,
          ordersTotal: sql`count(*)::int`,
          spentInRange: sql`coalesce(sum(${orders.total}) filter (where ${inRange(orders.createdAt, range)}), 0)`,
        })
        .from(orders)
        .where(paid)
        .groupBy(orders.userId),
      db
        .select({
          userId: users.id,
          name: users.name,
          email: users.email,
          orderCount: sql`count(*)::int`,
          totalSpent: sql`sum(${orders.total})`,
        })
        .from(orders)
        .innerJoin(users, eq(orders.userId, users.id))
        .where(and(paid, inRange(orders.createdAt, range)))
        .groupBy(users.id, users.name, users.email)
        .orderBy(desc(sql`sum(${orders.total})`))
        .limit(10),
    ]);

    const active = perCustomer.filter((c) => c.ordersInRange > 0);
    const orderCount = active.reduce((sum, c) => sum + c.ordersInRange, 0);
    const spent = active.reduce((sum, c) => sum + Number(c.spentInRange), 0);
    return {
      period: range,
      totalCustomers: totals.totalCustomers,
      newCustomers: newCustomers.count,
      activeCustomers: active.length,
      returningCustomers: active.filter((c) => c.ordersTotal > 1).length,
      averageOrderValue: orderCount ? Number((spent / orderCount).toFixed(2)) : 0,
      topCustomers: topCustomers.map((c) => ({ ...c, totalSpent: Number(c.totalSpent) })),
    };
  },

  async generateSupplierReport({ status }) {
    const rows = await db
      .select({
        supplierId: suppliers.id,
        name: suppliers.name,
        status: suppliers.status,
        productCount: sql`count(${supplierProducts.id})::int`,
        averageCost: sql`coalesce(avg(${supplierProducts.cost}), 0)`,
        averageLeadTime: sql`coalesce(avg(${supplierProducts.leadTime}), 0)`,
      })
      .from(suppliers)
      .leftJoin(supplierProducts, eq(supplierProducts.supplierId, suppliers.id))
      .where(status ? eq(suppliers.status, status) : undefined)
      .groupBy(suppliers.id, suppliers.name, suppliers.status)
      .orderBy(desc(sql`count(${supplierProducts.id})`));
    return {
      totalSuppliers: rows.length,
      activeSuppliers: rows.filter((r) => r.status === "active").length,
      suppliers: rows.map((r) => ({
        ...r,
        averageCost: Number(Number(r.averageCost).toFixed(2)),
        averageLeadTime: Number(Number(r.averageLeadTime).toFixed(1)),
      })),
    };
  },
};
