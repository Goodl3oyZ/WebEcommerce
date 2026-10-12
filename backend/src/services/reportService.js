import { db } from "../config/db.js";
import {
  orders,
  products,
  storeInventory,
} from "../models/schema.js";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { supplierService } from "./supplierService.js";

import { redis } from "../config/redis.js";

async function getCachedReport(cacheKey, fetchFn, ttlSeconds = 300) {
  try {
    if (redis?.isOpen) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
  } catch (err) {
    console.warn("Redis cache read error:", err.message);
  }

  const result = await fetchFn();

  try {
    if (redis?.isOpen) {
      await redis.setEx(cacheKey, ttlSeconds, JSON.stringify(result));
    }
  } catch (err) {
    console.warn("Redis cache write error:", err.message);
  }

  return result;
}

// Generate sales report with Redis cache
const generateSalesReport = async ({ startDate, endDate, groupBy }) => {
  const cacheKey = `report:sales:${startDate || "all"}:${endDate || "all"}:${groupBy || "none"}`;
  return getCachedReport(cacheKey, async () => {
    const whereConditions = [eq(orders.status, "COMPLETED")];

    if (startDate && endDate) {
      whereConditions.push(
        gte(orders.createdAt, new Date(startDate)),
        lte(orders.createdAt, new Date(endDate))
      );
    }

    const ordersData = await db.query.orders.findMany({
      where: and(...whereConditions),
      with: {
        items: {
          with: {
            product: {
              with: {
                category: true,
              },
            },
            variant: true,
          },
        },
      },
    });

    let report;
    switch (groupBy) {
      case "daily":
        report = groupSalesByDaily(ordersData);
        break;
      case "monthly":
        report = groupSalesByMonthly(ordersData);
        break;
      case "product":
        report = groupSalesByProduct(ordersData);
        break;
      case "category":
        report = groupSalesByCategory(ordersData);
        break;
      default:
        report = {
          totalSales: calculateTotalSales(ordersData),
          totalOrders: ordersData.length,
          averageOrderValue: calculateAverageOrderValue(ordersData),
          orders: ordersData,
        };
    }

    return report;
  });
};

// Generate inventory report
const generateInventoryReport = async ({ location, category, lowStock }) => {
  const whereConditions = [];

  if (location) {
    whereConditions.push(eq(storeInventory.storeId, location));
  }

  const items = await db.query.storeInventory.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    with: {
      store: true,
      product: { with: { category: true } },
      variant: true,
    },
    orderBy: [storeInventory.quantity],
  });

  let filtered = items;
  if (category) {
    filtered = filtered.filter(
      (item) => String(item.product?.categoryId) === String(category)
    );
  }
  if (lowStock) {
    filtered = filtered.filter((item) => item.quantity <= 5);
  }

  return {
    totalItems: filtered.length,
    totalValue: calculateInventoryValue(filtered),
    lowStockItems: filtered.filter((item) => item.quantity <= 5).length,
    items: filtered,
  };
};

// Generate customer report
const generateCustomerReport = async ({ startDate, endDate, groupBy }) => {
  const whereConditions = [];

  if (startDate && endDate) {
    whereConditions.push(
      gte(orders.createdAt, new Date(startDate)),
      lte(orders.createdAt, new Date(endDate))
    );
  }

  const ordersData = await db.query.orders.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    with: {
      user: true,
      items: {
        with: {
          product: true,
        },
      },
    },
  });

  let report;
  switch (groupBy) {
    case "customer":
      report = groupByCustomer(ordersData);
      break;
    case "loyalty":
      report = groupByLoyalty(ordersData);
      break;
    default:
      report = {
        totalCustomers: new Set(ordersData.map((order) => order.userId)).size,
        totalOrders: ordersData.length,
        averageOrderValue: calculateAverageOrderValue(ordersData),
        orders: ordersData,
      };
  }

  return report;
};

// Generate supplier report
const generateSupplierReport = async () => {
  const allSuppliers = await supplierService.getAllSuppliers();
  const supplierProductsData = [];

  for (const supplier of allSuppliers) {
    const products = await supplierService.getSupplierProducts(supplier.id);
    products.forEach((p) => {
      supplierProductsData.push({ ...p, supplier });
    });
  }

  return {
    totalSuppliers: allSuppliers.length,
    totalProducts: supplierProductsData.length,
    averageLeadTime: calculateAverageLeadTime(supplierProductsData),
    supplierProducts: supplierProductsData,
  };
};

// Helper functions for sales report
const calculateTotalSales = (orders) => {
  return orders.reduce(
    (total, order) =>
      total +
      order.items.reduce(
        (itemTotal, item) => itemTotal + item.price * item.quantity,
        0
      ),
    0
  );
};

const calculateAverageOrderValue = (orders) => {
  if (orders.length === 0) return 0;
  return calculateTotalSales(orders) / orders.length;
};

const groupSalesByDaily = (orders) => {
  const dailySales = {};
  orders.forEach((order) => {
    const date = order.createdAt.toISOString().split("T")[0];
    if (!dailySales[date]) {
      dailySales[date] = {
        total: 0,
        orders: 0,
      };
    }
    dailySales[date].total += calculateTotalSales([order]);
    dailySales[date].orders += 1;
  });
  return dailySales;
};

const groupSalesByMonthly = (orders) => {
  const monthlySales = {};
  orders.forEach((order) => {
    const month = order.createdAt.toISOString().slice(0, 7);
    if (!monthlySales[month]) {
      monthlySales[month] = {
        total: 0,
        orders: 0,
      };
    }
    monthlySales[month].total += calculateTotalSales([order]);
    monthlySales[month].orders += 1;
  });
  return monthlySales;
};

const groupSalesByProduct = (orders) => {
  const productSales = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      const productId = item.productId;
      if (!productSales[productId]) {
        productSales[productId] = {
          product: item.product,
          total: 0,
          quantity: 0,
        };
      }
      productSales[productId].total += item.price * item.quantity;
      productSales[productId].quantity += item.quantity;
    });
  });
  return productSales;
};

const groupSalesByCategory = (orders) => {
  const categorySales = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      const categoryId = item.product.categoryId;
      if (!categorySales[categoryId]) {
        categorySales[categoryId] = {
          category: item.product.category,
          total: 0,
          quantity: 0,
        };
      }
      categorySales[categoryId].total += item.price * item.quantity;
      categorySales[categoryId].quantity += item.quantity;
    });
  });
  return categorySales;
};

// Helper functions for inventory report
const calculateInventoryValue = (items) => {
  return items.reduce((total, item) => {
    const price = Number(item.product?.price ?? 0);
    return total + item.quantity * price;
  }, 0);
};

// Helper functions for customer report
const groupByCustomer = (orders) => {
  const customerStats = {};
  orders.forEach((order) => {
    const userId = order.userId;
    if (!customerStats[userId]) {
      customerStats[userId] = {
        user: order.user,
        totalSpent: 0,
        orders: 0,
        lastOrder: order.createdAt,
      };
    }
    customerStats[userId].totalSpent += calculateTotalSales([order]);
    customerStats[userId].orders += 1;
    if (order.createdAt > customerStats[userId].lastOrder) {
      customerStats[userId].lastOrder = order.createdAt;
    }
  });
  return customerStats;
};

const groupByLoyalty = (orders) => {
  const loyaltyStats = {
    new: 0,
    returning: 0,
    loyal: 0,
  };
  const customerOrders = {};
  orders.forEach((order) => {
    const userId = order.userId;
    if (!customerOrders[userId]) {
      customerOrders[userId] = 0;
    }
    customerOrders[userId]++;
  });
  Object.values(customerOrders).forEach((orderCount) => {
    if (orderCount === 1) loyaltyStats.new++;
    else if (orderCount <= 3) loyaltyStats.returning++;
    else loyaltyStats.loyal++;
  });
  return loyaltyStats;
};

// Helper functions for supplier report
const calculateAverageLeadTime = (supplierProducts) => {
  if (supplierProducts.length === 0) return 0;
  return (
    supplierProducts.reduce((total, sp) => total + (sp.leadTime || 0), 0) /
    supplierProducts.length
  );
};

const groupBySupplier = (supplierProducts) => {
  const supplierStats = {};
  supplierProducts.forEach((sp) => {
    const supplierId = sp.supplierId;
    if (!supplierStats[supplierId]) {
      supplierStats[supplierId] = {
        supplier: sp.supplier,
        products: 0,
        averageLeadTime: 0,
        totalLeadTime: 0,
      };
    }
    supplierStats[supplierId].products++;
    supplierStats[supplierId].totalLeadTime += sp.leadTime || 0;
    supplierStats[supplierId].averageLeadTime =
      supplierStats[supplierId].totalLeadTime /
      supplierStats[supplierId].products;
  });
  return supplierStats;
};

const groupByProduct = (supplierProducts) => {
  const productStats = {};
  supplierProducts.forEach((sp) => {
    const productId = sp.productId;
    if (!productStats[productId]) {
      productStats[productId] = {
        product: sp.product,
        suppliers: 0,
        averagePrice: 0,
        totalPrice: 0,
      };
    }
    productStats[productId].suppliers++;
    productStats[productId].totalPrice += sp.supplierPrice;
    productStats[productId].averagePrice =
      productStats[productId].totalPrice / productStats[productId].suppliers;
  });
  return productStats;
};

export const reportService = {
  generateSalesReport,
  generateInventoryReport,
  generateCustomerReport,
  generateSupplierReport,
};
