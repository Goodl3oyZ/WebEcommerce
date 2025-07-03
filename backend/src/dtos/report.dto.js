import { z } from "zod";

// Report DTOs
export const reportDto = {
  // Generate sales report
  generateSalesReport: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    groupBy: z.enum(["day", "week", "month", "year"]).optional(),
    includeDetails: z.boolean().default(false),
    filters: z
      .object({
        productIds: z.array(z.number()).optional(),
        categoryIds: z.array(z.number()).optional(),
        paymentMethods: z.array(z.string()).optional(),
        orderStatus: z.array(z.string()).optional(),
      })
      .optional(),
  }),

  // Generate inventory report
  generateInventoryReport: z.object({
    includeLowStock: z.boolean().default(true),
    includeOutOfStock: z.boolean().default(true),
    includeOverstock: z.boolean().default(false),
    groupBy: z.enum(["category", "location", "supplier"]).optional(),
    filters: z
      .object({
        categoryIds: z.array(z.number()).optional(),
        locationIds: z.array(z.number()).optional(),
        supplierIds: z.array(z.number()).optional(),
      })
      .optional(),
  }),

  // Generate customer report
  generateCustomerReport: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    groupBy: z.enum(["day", "week", "month", "year"]).optional(),
    includeDetails: z.boolean().default(false),
    filters: z
      .object({
        customerGroups: z.array(z.string()).optional(),
        orderStatus: z.array(z.string()).optional(),
        minOrderValue: z.number().optional(),
        maxOrderValue: z.number().optional(),
      })
      .optional(),
  }),

  // Generate supplier report
  generateSupplierReport: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    groupBy: z.enum(["day", "week", "month", "year"]).optional(),
    includeDetails: z.boolean().default(false),
    filters: z
      .object({
        supplierIds: z.array(z.number()).optional(),
        productIds: z.array(z.number()).optional(),
        orderStatus: z.array(z.string()).optional(),
      })
      .optional(),
  }),
};

// Response DTOs
export const reportResponseDto = {
  // Sales report
  sales: z.object({
    summary: z.object({
      totalSales: z.number(),
      totalOrders: z.number(),
      averageOrderValue: z.number(),
      totalProducts: z.number(),
      totalCustomers: z.number(),
    }),
    timeSeries: z.array(
      z.object({
        period: z.string(),
        sales: z.number(),
        orders: z.number(),
        averageOrderValue: z.number(),
      })
    ),
    details: z
      .array(
        z.object({
          orderId: z.number(),
          date: z.string().datetime(),
          customer: z.string(),
          products: z.array(
            z.object({
              productId: z.number(),
              name: z.string(),
              quantity: z.number(),
              price: z.number(),
              total: z.number(),
            })
          ),
          subtotal: z.number(),
          tax: z.number(),
          shipping: z.number(),
          total: z.number(),
          paymentMethod: z.string(),
          status: z.string(),
        })
      )
      .optional(),
  }),

  // Inventory report
  inventory: z.object({
    summary: z.object({
      totalProducts: z.number(),
      totalValue: z.number(),
      lowStockItems: z.number(),
      outOfStockItems: z.number(),
      overstockItems: z.number(),
    }),
    categories: z.array(
      z.object({
        categoryId: z.number(),
        name: z.string(),
        totalProducts: z.number(),
        totalValue: z.number(),
        lowStockItems: z.number(),
        outOfStockItems: z.number(),
      })
    ),
    details: z.array(
      z.object({
        productId: z.number(),
        name: z.string(),
        sku: z.string(),
        category: z.string(),
        location: z.string(),
        quantity: z.number(),
        reorderPoint: z.number(),
        value: z.number(),
        status: z.string(),
      })
    ),
  }),

  // Customer report
  customer: z.object({
    summary: z.object({
      totalCustomers: z.number(),
      newCustomers: z.number(),
      activeCustomers: z.number(),
      totalOrders: z.number(),
      totalRevenue: z.number(),
      averageOrderValue: z.number(),
    }),
    timeSeries: z.array(
      z.object({
        period: z.string(),
        newCustomers: z.number(),
        activeCustomers: z.number(),
        orders: z.number(),
        revenue: z.number(),
      })
    ),
    details: z
      .array(
        z.object({
          customerId: z.number(),
          name: z.string(),
          email: z.string(),
          group: z.string(),
          totalOrders: z.number(),
          totalSpent: z.number(),
          averageOrderValue: z.number(),
          lastOrderDate: z.string().datetime(),
        })
      )
      .optional(),
  }),

  // Supplier report
  supplier: z.object({
    summary: z.object({
      totalSuppliers: z.number(),
      totalOrders: z.number(),
      totalSpent: z.number(),
      averageOrderValue: z.number(),
    }),
    timeSeries: z.array(
      z.object({
        period: z.string(),
        orders: z.number(),
        spent: z.number(),
        averageOrderValue: z.number(),
      })
    ),
    details: z
      .array(
        z.object({
          supplierId: z.number(),
          name: z.string(),
          totalOrders: z.number(),
          totalSpent: z.number(),
          averageOrderValue: z.number(),
          products: z.array(
            z.object({
              productId: z.number(),
              name: z.string(),
              quantity: z.number(),
              cost: z.number(),
              total: z.number(),
            })
          ),
        })
      )
      .optional(),
  }),
};
