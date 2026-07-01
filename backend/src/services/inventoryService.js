import { db } from "../config/db.js";
import { storeInventory, products, productVariants } from "../models/schema.js";
import { eq, and, lte, desc, asc } from "drizzle-orm";
import { AppError } from "../utils/appError.js";

const LOW_STOCK_THRESHOLD = 5;

const itemRelations = {
  store: true,
  product: { with: { category: true } },
  variant: true,
};

const getAllInventoryItems = async () => {
  return db.query.storeInventory.findMany({
    with: itemRelations,
    orderBy: [desc(storeInventory.updatedAt)],
  });
};

const getInventoryItemById = async (itemId) => {
  const item = await db.query.storeInventory.findFirst({
    where: eq(storeInventory.id, itemId),
    with: itemRelations,
  });

  if (!item) {
    throw new AppError("Inventory item not found", 404);
  }

  return item;
};

const createInventoryItem = async (itemData) => {
  const storeId = itemData.storeId || itemData.location;
  const productId = String(itemData.productId);

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  let variantId = itemData.variantId;
  if (variantId) {
    const variant = await db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.id, variantId),
        eq(productVariants.productId, productId)
      ),
    });
    if (!variant) {
      throw new AppError("Product variant not found", 404);
    }
  } else {
    const firstVariant = await db.query.productVariants.findFirst({
      where: eq(productVariants.productId, productId),
    });
    if (!firstVariant) {
      throw new AppError("Product has no variants; variantId is required", 400);
    }
    variantId = firstVariant.id;
  }

  const existingItem = await db.query.storeInventory.findFirst({
    where: and(
      eq(storeInventory.productId, productId),
      eq(storeInventory.variantId, variantId),
      eq(storeInventory.storeId, storeId)
    ),
  });

  if (existingItem) {
    throw new AppError("Inventory item already exists for this store", 400);
  }

  const [created] = await db
    .insert(storeInventory)
    .values({
      storeId,
      productId,
      variantId,
      quantity: itemData.quantity ?? 0,
    })
    .returning();

  return getInventoryItemById(created.id);
};

const updateInventoryItem = async (itemId, updateData) => {
  await getInventoryItemById(itemId);

  const patch = {};
  if (updateData.quantity !== undefined) patch.quantity = updateData.quantity;
  if (updateData.storeId || updateData.location) {
    patch.storeId = updateData.storeId || updateData.location;
  }

  await db
    .update(storeInventory)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(storeInventory.id, itemId));

  return getInventoryItemById(itemId);
};

const adjustInventory = async (itemId, adjustmentData) => {
  const item = await getInventoryItemById(itemId);
  const delta = Number(adjustmentData.quantity ?? 0);
  const nextQty = Math.max(0, item.quantity + delta);

  await db
    .update(storeInventory)
    .set({ quantity: nextQty, updatedAt: new Date() })
    .where(eq(storeInventory.id, itemId));

  return getInventoryItemById(itemId);
};

const transferInventory = async (sourceId, destinationStoreId, quantity) => {
  const sourceItem = await getInventoryItemById(sourceId);
  const qty = Number(quantity);

  if (sourceItem.quantity < qty) {
    throw new AppError("Insufficient inventory quantity", 400);
  }

  let destinationItem = await db.query.storeInventory.findFirst({
    where: and(
      eq(storeInventory.productId, sourceItem.productId),
      eq(storeInventory.variantId, sourceItem.variantId),
      eq(storeInventory.storeId, destinationStoreId)
    ),
  });

  if (!destinationItem) {
    const [created] = await db
      .insert(storeInventory)
      .values({
        storeId: destinationStoreId,
        productId: sourceItem.productId,
        variantId: sourceItem.variantId,
        quantity: 0,
      })
      .returning();
    destinationItem = created;
  }

  await db
    .update(storeInventory)
    .set({
      quantity: sourceItem.quantity - qty,
      updatedAt: new Date(),
    })
    .where(eq(storeInventory.id, sourceId));

  await db
    .update(storeInventory)
    .set({
      quantity: destinationItem.quantity + qty,
      updatedAt: new Date(),
    })
    .where(eq(storeInventory.id, destinationItem.id));

  return getInventoryItemById(destinationItem.id);
};

const getInventoryByLocation = async (storeId) => {
  return db.query.storeInventory.findMany({
    where: eq(storeInventory.storeId, storeId),
    with: itemRelations,
    orderBy: [desc(storeInventory.updatedAt)],
  });
};

const getInventoryByProduct = async (productId) => {
  return db.query.storeInventory.findMany({
    where: eq(storeInventory.productId, productId),
    with: itemRelations,
    orderBy: [desc(storeInventory.updatedAt)],
  });
};

const getLowStockItems = async (threshold = LOW_STOCK_THRESHOLD) => {
  return db.query.storeInventory.findMany({
    where: lte(storeInventory.quantity, threshold),
    with: itemRelations,
    orderBy: [asc(storeInventory.quantity)],
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
