import { db } from "../config/db.js";
import {
  users,
  userRoles,
  products,
  productVariants,
  productAttributes,
  orders,
  orderStatusHistory,
} from "../models/schema.js";
import { eq, and, like, or, desc, sql } from "drizzle-orm";

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
        totalRevenue: sql`sum(total_amount)`,
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
        revenue: sql`sum(total_amount)`,
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
};
