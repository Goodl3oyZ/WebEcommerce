import { db } from "../config/db.js";
import {
  users,
  userRoles,
  products,
  productVariants,
  productAttributes,
  orders,
  orderStatusHistory,
  orderItems,
  coupons,
  discounts,
} from "../models/schema.js";
import { eq, and, like, or, desc, sql, isNotNull } from "drizzle-orm";

export const adminService = {
  // User Management
  async getAllUsers({ page = 1, limit = 10, search }) {
    const offset = (page - 1) * limit;

    const whereConditions = [];
    if (search) {
      whereConditions.push(
        or(like(users.name, `%${search}%`), like(users.email, `%${search}%`))
      );
    }

    const userList = await db.query.users.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        roles: true,
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const total = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    return {
      users: userList,
      pagination: {
        total: total[0].count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total[0].count / limit),
      },
    };
  },

  async getUserById(id) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        roles: true,
        orders: true,
        loyaltyProgram: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  },

  async updateUser(id, updates) {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  },

  async deleteUser(id) {
    const result = await db.delete(users).where(eq(users.id, id));
    if (result.rowCount === 0) {
      throw new Error("User not found");
    }
  },

  async updateUserRole(id, role) {
    const validRoles = ["user", "admin", "moderator"];
    if (!validRoles.includes(role)) {
      throw new Error("Invalid role");
    }

    const [updatedRole] = await db
      .update(userRoles)
      .set({ role })
      .where(eq(userRoles.userId, id))
      .returning();

    if (!updatedRole) {
      throw new Error("User not found");
    }

    return updatedRole;
  },

  // Product Management
  async createProduct(productData) {
    const {
      name,
      description,
      price,
      categoryId,
      brandId,
      variants,
      attributes,
    } = productData;

    const result = await db.transaction(async (tx) => {
      // Create product
      const [product] = await tx
        .insert(products)
        .values({
          name,
          description,
          price,
          categoryId,
          brandId,
        })
        .returning();

      // Create variants
      if (variants && variants.length > 0) {
        await tx.insert(productVariants).values(
          variants.map((variant) => ({
            ...variant,
            productId: product.id,
          }))
        );
      }

      // Create attributes
      if (attributes) {
        await tx.insert(productAttributes).values({
          ...attributes,
          productId: product.id,
        });
      }

      return product;
    });

    return result;
  },

  async updateProduct(id, updates) {
    const [updatedProduct] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();

    if (!updatedProduct) {
      throw new Error("Product not found");
    }

    return updatedProduct;
  },

  async deleteProduct(id) {
    const result = await db.delete(products).where(eq(products.id, id));
    if (result.rowCount === 0) {
      throw new Error("Product not found");
    }
  },

  // Order Management
  async getAllOrders({ page = 1, limit = 10, status }) {
    const offset = (page - 1) * limit;

    const whereConditions = [];
    if (status) whereConditions.push(eq(orders.status, status));

    const orderList = await db.query.orders.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          with: {
            variant: {
              with: {
                product: true,
              },
            },
          },
        },
        shippingAddress: true,
        payment: true,
        statusHistory: {
          orderBy: (history, { desc }) => [desc(history.createdAt)],
        },
      },
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const total = await db
      .select({ count: sql`count(*)` })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    return {
      orders: orderList,
      pagination: {
        total: total[0].count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total[0].count / limit),
      },
    };
  },

  async updateOrderStatus(id, status, comment) {
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status");
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();

    if (!updatedOrder) {
      throw new Error("Order not found");
    }

    // Add status history
    await db.insert(orderStatusHistory).values({
      orderId: id,
      status,
      comment: comment || `Status updated to ${status}`,
    });

    return updatedOrder;
  },

  // Analytics
  async getOrderStatistics(startDate, endDate) {
    const whereConditions = [];
    if (startDate)
      whereConditions.push(orders.createdAt >= new Date(startDate));
    if (endDate) whereConditions.push(orders.createdAt <= new Date(endDate));

    // Get total orders and revenue
    const totals = await db
      .select({
        totalOrders: sql`count(*)`,
        totalRevenue: sql`sum(total)`, // แก้จาก total_amount เป็น total
      })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    // Get orders by status
    const statusCounts = await db
      .select({
        status: orders.status,
        count: sql`count(*)`,
      })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(orders.status);

    // Get daily orders
    const dailyOrders = await db
      .select({
        date: sql`date(created_at)`,
        count: sql`count(*)`,
        revenue: sql`sum(total)`, // แก้จาก total_amount เป็น total
      })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(sql`date(created_at)`)
      .orderBy(sql`date(created_at)`);

    return {
      totals: totals[0],
      statusCounts,
      dailyOrders,
    };
  },

  // Dashboard Summary
  async getDashboardData() {
    // 1. Sales Summary
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Gross Revenue & Orders
    const [salesToday] = await db
      .select({
        total: sql`COALESCE(SUM(total),0)`,
        count: sql`COUNT(*)`,
      })
      .from(orders)
      .where(and(orders.createdAt >= startOfDay));
    const [salesWeek] = await db
      .select({
        total: sql`COALESCE(SUM(total),0)`,
        count: sql`COUNT(*)`,
      })
      .from(orders)
      .where(and(orders.createdAt >= startOfWeek));
    const [salesMonth] = await db
      .select({
        total: sql`COALESCE(SUM(total),0)`,
        count: sql`COUNT(*)`,
      })
      .from(orders)
      .where(and(orders.createdAt >= startOfMonth));
    const [grossRevenue] = await db
      .select({
        total: sql`COALESCE(SUM(total),0)`,
      })
      .from(orders);

    // Order Status Count
    const statusCounts = await db
      .select({ status: orders.status, count: sql`COUNT(*)` })
      .from(orders)
      .groupBy(orders.status);

    // 2. Customers
    const [totalCustomers] = await db
      .select({ count: sql`COUNT(*)` })
      .from(users);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const [newCustomers7d] = await db
      .select({ count: sql`COUNT(*)` })
      .from(users)
      .where(and(users.createdAt >= sevenDaysAgo));
    const [newCustomersMonth] = await db
      .select({ count: sql`COUNT(*)` })
      .from(users)
      .where(and(users.createdAt >= startOfMonth));
    const topSpenders = await db
      .select({
        userId: orders.userId,
        totalSpent: sql`SUM(total)`,
      })
      .from(orders)
      .where(and(isNotNull(orders.userId)))
      .groupBy(orders.userId)
      .orderBy(sql`SUM(total)`)
      .limit(5);

    // 3. Inventory
    const [totalProducts] = await db
      .select({ count: sql`COUNT(*)` })
      .from(products);
    // Low stock: stock > 0 && stock <= 5
    const lowStockProducts = await db.query.productVariants.findMany({
      where: and(sql`stock > 0`, sql`stock <= 5`),
      with: { product: true },
      limit: 10,
    });
    // Out of stock: stock == 0
    const outOfStockProducts = await db.query.productVariants.findMany({
      where: sql`stock = 0`,
      with: { product: true },
      limit: 10,
    });
    // Top selling products (by quantity)
    const topSellingProducts = await db
      .select({
        productId: orderItems.productId,
        totalSold: sql`SUM(quantity)`,
      })
      .from(orderItems)
      .where(sql`product_id IS NOT NULL`)
      .groupBy(orderItems.productId)
      .orderBy(sql`SUM(quantity)`)
      .limit(5);

    // 4. Orders by status
    // (already in statusCounts)

    // 5. Analytics (ข้อมูลจริงเท่าที่ schema มี)
    // 1) Sales/Orders per day (30 วันล่าสุด)
    const salesChart = await db
      .select({
        date: sql`date(orders.created_at)`,
        total: sql`COALESCE(SUM(total),0)`,
      })
      .from(orders)
      .where(sql`orders.created_at >= NOW() - INTERVAL '30 days'`)
      .groupBy(sql`date(orders.created_at)`)
      .orderBy(sql`date(orders.created_at)`);
    // (ไม่ใส่ mock data, ไม่ fallback เป็นข้อมูลปลอม)
    const ordersChart = await db
      .select({
        date: sql`date(orders.created_at)`,
        count: sql`COUNT(*)`,
      })
      .from(orders)
      .where(sql`orders.created_at >= NOW() - INTERVAL '30 days'`)
      .groupBy(sql`date(orders.created_at)`)
      .orderBy(sql`date(orders.created_at)`);
    // 2) Customer new/old per month (6 เดือน)
    const customerMonthly = await db
      .select({
        month: sql`to_char(users.created_at, 'YYYY-MM')`,
        newCount: sql`COUNT(*)`,
      })
      .from(users)
      .where(sql`users.created_at >= NOW() - INTERVAL '6 months'`)
      .groupBy(sql`to_char(users.created_at, 'YYYY-MM')`)
      .orderBy(sql`to_char(users.created_at, 'YYYY-MM')`);
    // 3) Top 5 products (join name)
    const topProducts = await db
      .select({
        productId: orderItems.productId,
        totalSold: sql`SUM(quantity)`,
        name: products.name,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(sql`order_items.product_id IS NOT NULL`)
      .groupBy(orderItems.productId, products.name)
      .orderBy(sql`SUM(quantity)`)
      .limit(5);
    // 4) Stock movement (top 5 สินค้าขายดี 7 วันล่าสุด)
    const stockMovement = await db
      .select({
        productId: orderItems.productId,
        name: products.name,
        sold: sql`SUM(quantity)`,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(
        and(
          sql`order_items.product_id IS NOT NULL`,
          sql`order_items.created_at >= NOW() - INTERVAL '7 days'`
        )
      )
      .groupBy(orderItems.productId, products.name)
      .orderBy(sql`SUM(quantity)`)
      .limit(5);
    // 5) Promotions (จาก coupons และ discounts)
    const now = new Date();
    const activeCoupons = await db.query.coupons.findMany({
      where: and(sql`is_active = true`, sql`end_date >= ${now}`),
      limit: 5,
    });
    const activeDiscounts = await db.query.discounts.findMany({
      where: and(sql`is_active = true`, sql`end_date >= ${now}`),
      limit: 5,
    });
    const promotions = [
      ...activeCoupons.map((c) => ({
        title: c.code,
        date: c.endDate,
        desc: c.type + " " + c.value,
      })),
      ...activeDiscounts.map((d) => ({
        title: d.name,
        date: d.endDate,
        desc: d.discountType + " " + d.value,
      })),
    ];

    // 8. Notifications (mock)
    const notifications = [
      { type: "low_stock", message: "มีสินค้าใกล้หมดสต็อก" },
      { type: "new_order", message: "มีออเดอร์ใหม่เข้ามา" },
    ];

    // กำหนดตัวแปรว่างสำหรับ products.latest และ recentActivities
    const latestProducts = [];
    const recentActivities = [];

    return {
      salesSummary: {
        today: salesToday,
        week: salesWeek,
        month: salesMonth,
        grossRevenue: grossRevenue.total,
        statusCounts,
      },
      customers: {
        total: totalCustomers.count,
        new7d: newCustomers7d.count,
        newMonth: newCustomersMonth.count,
        topSpenders,
      },
      inventory: {
        total: totalProducts.count,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
        topSelling: topSellingProducts,
      },
      analytics: {
        salesChart,
        ordersChart,
        customerMonthly,
        topProducts,
        stockMovement,
        promotions,
      },
      products: {
        latest: latestProducts,
        mostViewed: [],
      },
      recentActivities,
      notifications,
    };
  },
};
