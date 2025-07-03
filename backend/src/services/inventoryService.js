import { db } from "../config/db.js";
import {
  inventoryItems,
  products,
  productVariants,
  inventoryAdjustments,
  inventoryTransfers,
} from "../models/schema.js";
import { eq, and, lte, gte, desc, asc } from "drizzle-orm";
import { AppError } from "../utils/appError.js";

// Get all inventory items
const getAllInventoryItems = async () => {
  return await db.query.inventoryItems.findMany({
    with: {
      product: {
        with: {
          category: true,
          images: true,
        },
      },
      variant: true,
    },
    orderBy: [desc(inventoryItems.updatedAt)],
  });
};

// Get inventory item by ID
const getInventoryItemById = async (itemId) => {
  const item = await db.query.inventoryItems.findFirst({
    where: eq(inventoryItems.id, itemId),
    with: {
      product: {
        with: {
          category: true,
          images: true,
        },
      },
      variant: true,
    },
  });

  if (!item) {
    throw new AppError("Inventory item not found", 404);
  }

  return item;
};

// Create new inventory item
const createInventoryItem = async (itemData) => {
  // Check if product exists
  const product = await db.query.products.findFirst({
    where: eq(products.id, itemData.productId),
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  // If variant is specified, check if it exists
  if (itemData.variantId) {
    const variant = await db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.id, itemData.variantId),
        eq(productVariants.productId, itemData.productId)
      ),
    });

    if (!variant) {
      throw new AppError("Product variant not found", 404);
    }
  }

  // Check if item already exists at location
  const existingItem = await db.query.inventoryItems.findFirst({
    where: and(
      eq(inventoryItems.productId, itemData.productId),
      eq(inventoryItems.variantId, itemData.variantId),
      eq(inventoryItems.location, itemData.location)
    ),
  });

  if (existingItem) {
    throw new AppError("Inventory item already exists at this location", 400);
  }

  // Create new inventory item
  return await db.query.inventoryItems.create({
    data: itemData,
  });
};

// Update inventory item
const updateInventoryItem = async (itemId, updateData) => {
  const item = await db.query.inventoryItems.findFirst({
    where: eq(inventoryItems.id, itemId),
  });

  if (!item) {
    throw new AppError("Inventory item not found", 404);
  }

  return await db.query.inventoryItems.update({
    where: eq(inventoryItems.id, itemId),
    data: updateData,
  });
};

// Adjust inventory quantity
const adjustInventory = async (itemId, adjustmentData) => {
  const item = await db.query.inventoryItems.findFirst({
    where: eq(inventoryItems.id, itemId),
  });

  if (!item) {
    throw new AppError("Inventory item not found", 404);
  }

  // Create adjustment record
  await db.query.inventoryAdjustments.create({
    data: {
      ...adjustmentData,
      inventoryItemId: itemId,
      previousQuantity: item.quantity,
    },
  });

  // Update inventory quantity
  return await db.query.inventoryItems.update({
    where: eq(inventoryItems.id, itemId),
    data: {
      quantity: item.quantity + adjustmentData.quantity,
    },
  });
};

// Transfer inventory between locations
const transferInventory = async (sourceId, destinationLocation, quantity) => {
  const sourceItem = await db.query.inventoryItems.findFirst({
    where: eq(inventoryItems.id, sourceId),
  });

  if (!sourceItem) {
    throw new AppError("Source inventory item not found", 404);
  }

  if (sourceItem.quantity < quantity) {
    throw new AppError("Insufficient inventory quantity", 400);
  }

  // Find or create destination item
  let destinationItem = await db.query.inventoryItems.findFirst({
    where: and(
      eq(inventoryItems.productId, sourceItem.productId),
      eq(inventoryItems.variantId, sourceItem.variantId),
      eq(inventoryItems.location, destinationLocation)
    ),
  });

  if (!destinationItem) {
    destinationItem = await db.query.inventoryItems.create({
      data: {
        productId: sourceItem.productId,
        variantId: sourceItem.variantId,
        location: destinationLocation,
        quantity: 0,
        minStockLevel: sourceItem.minStockLevel,
      },
    });
  }

  // Create transfer record
  await db.query.inventoryTransfers.create({
    data: {
      sourceId,
      destinationId: destinationItem.id,
      quantity,
      status: "COMPLETED",
    },
  });

  // Update source quantity
  await db.query.inventoryItems.update({
    where: eq(inventoryItems.id, sourceId),
    data: {
      quantity: sourceItem.quantity - quantity,
    },
  });

  // Update destination quantity
  return await db.query.inventoryItems.update({
    where: eq(inventoryItems.id, destinationItem.id),
    data: {
      quantity: destinationItem.quantity + quantity,
    },
  });
};

// Get inventory by location
const getInventoryByLocation = async (location) => {
  return await db.query.inventoryItems.findMany({
    where: eq(inventoryItems.location, location),
    with: {
      product: {
        with: {
          category: true,
          images: true,
        },
      },
      variant: true,
    },
    orderBy: [desc(inventoryItems.updatedAt)],
  });
};

// Get inventory by product
const getInventoryByProduct = async (productId) => {
  return await db.query.inventoryItems.findMany({
    where: eq(inventoryItems.productId, productId),
    with: {
      product: {
        with: {
          category: true,
          images: true,
        },
      },
      variant: true,
    },
    orderBy: [desc(inventoryItems.updatedAt)],
  });
};

// Get low stock items
const getLowStockItems = async () => {
  return await db.query.inventoryItems.findMany({
    where: lte(inventoryItems.quantity, inventoryItems.minStockLevel),
    with: {
      product: {
        with: {
          category: true,
          images: true,
        },
      },
      variant: true,
    },
    orderBy: [asc(inventoryItems.quantity)],
  });
};

export const inventoryService = {
  getAllInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  adjustInventory,
  transferInventory,
  getInventoryByLocation,
  getInventoryByProduct,
  getLowStockItems,
};
