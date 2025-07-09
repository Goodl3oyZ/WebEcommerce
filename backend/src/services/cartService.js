import { db } from "../config/db.js";
import {
  carts,
  cartItems,
  products,
  productVariants,
  orders,
  orderItems,
  addresses,
  paymentMethods,
  coupons,
} from "../models/schema.js";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { FileService } from "./fileService.js";
import { BUCKETS } from "../config/minio.js";

export const cartService = {
  async getCart(userId) {
    // Get cart
    const cart = await db.query.carts.findFirst({
      where: eq(carts.userId, userId),
    });

    if (!cart) {
      // Create new cart if none exists
      const [newCart] = await db.insert(carts).values({ userId }).returning();
      return { ...newCart, items: [], subtotal: 0 };
    }

    // Get cart items with product and variant info
    const items = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, cart.id),
      columns: {
        id: true,
        cartId: true,
        productId: true,
        variantId: true,
        quantity: true,
        price: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Get product and variant details for each item
    const itemsWithDetails = await Promise.all(
      items.map(async (item) => {
        const product = await db.query.products.findFirst({
          where: eq(products.id, item.productId),
          columns: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
          },
        });

        let variant = null;
        if (item.variantId) {
          variant = await db.query.productVariants.findFirst({
            where: eq(productVariants.id, item.variantId),
            columns: {
              id: true,
              color: true,
              size: true,
              sku: true,
              stock: true,
              imageUrl: true,
            },
          });
        }

        // Generate presigned URLs for product images
        let productImages = [];
        if (product && product.imageUrl) {
          if (Array.isArray(product.imageUrl)) {
            productImages = product.imageUrl.map((img) =>
              img ? FileService.getFileUrl(BUCKETS.PRODUCTS, img) : null
            );
          } else if (typeof product.imageUrl === "string") {
            productImages = [
              FileService.getFileUrl(BUCKETS.PRODUCTS, product.imageUrl),
            ];
          }
        }

        // Generate presigned URLs for variant images (if any)
        let variantImages = [];
        if (variant && variant.imageUrl) {
          if (Array.isArray(variant.imageUrl)) {
            variantImages = variant.imageUrl.map((img) =>
              img ? FileService.getFileUrl(BUCKETS.PRODUCTS, img) : null
            );
          } else if (typeof variant.imageUrl === "string") {
            variantImages = [
              FileService.getFileUrl(BUCKETS.PRODUCTS, variant.imageUrl),
            ];
          }
        }

        return {
          ...item,
          product: {
            ...product,
            imageUrl: productImages,
          },
          variant: variant
            ? {
                ...variant,
                images: variantImages,
              }
            : null,
        };
      })
    );

    // Calculate subtotal using stored prices
    const subtotal = itemsWithDetails.reduce((total, item) => {
      return total + Number(item.price) * item.quantity;
    }, 0);

    return {
      ...cart,
      items: itemsWithDetails,
      subtotal: Number(subtotal),
    };
  },

  async addItem(userId, { productId, variantId, quantity }) {
    // Get or create cart
    let cart = await db.query.carts.findFirst({
      where: eq(carts.userId, userId),
    });

    if (!cart) {
      [cart] = await db.insert(carts).values({ userId }).returning();
    }

    // Verify product exists
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      throw new ApiError("Product not found", 404);
    }

    // Get variant and price
    let price = product.price;
    if (variantId) {
      const variant = await db.query.productVariants.findFirst({
        where: and(
          eq(productVariants.id, variantId),
          eq(productVariants.productId, productId)
        ),
      });

      if (!variant) {
        throw new ApiError("Product variant not found", 404);
      }
      price = variant.price || product.price;
    }

    // Check if item already exists in cart
    const existingItem = await db.query.cartItems.findFirst({
      where: and(
        eq(cartItems.cartId, cart.id),
        eq(cartItems.productId, productId),
        variantId
          ? eq(cartItems.variantId, variantId)
          : sql`${cartItems.variantId} IS NULL`
      ),
    });

    if (existingItem) {
      // Update quantity if item exists
      await db
        .update(cartItems)
        .set({
          quantity: existingItem.quantity + quantity,
          price: price, // Update price in case it changed
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existingItem.id));
    } else {
      // Add new item
      await db.insert(cartItems).values({
        cartId: cart.id,
        productId,
        variantId,
        quantity,
        price,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Return updated cart
    return this.getCart(userId);
  },

  async updateItem(userId, itemId, quantity) {
    // Verify cart ownership
    const cart = await db.query.carts.findFirst({
      where: eq(carts.userId, userId),
    });

    if (!cart) {
      throw new ApiError("Cart not found", 404);
    }

    // Update item quantity
    const [updatedItem] = await db
      .update(cartItems)
      .set({ quantity })
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .returning();

    if (!updatedItem) {
      throw new ApiError("Cart item not found", 404);
    }

    // Return updated cart
    return this.getCart(userId);
  },

  async removeItem(userId, itemId) {
    // Verify cart ownership
    const cart = await db.query.carts.findFirst({
      where: eq(carts.userId, userId),
    });

    if (!cart) {
      throw new ApiError("Cart not found", 404);
    }

    // Remove item
    const [deletedItem] = await db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .returning();

    if (!deletedItem) {
      throw new ApiError("Cart item not found", 404);
    }

    // Return updated cart
    return this.getCart(userId);
  },

  async clearCart(userId) {
    // Verify cart ownership
    const cart = await db.query.carts.findFirst({
      where: eq(carts.userId, userId),
    });

    if (!cart) {
      throw new ApiError("Cart not found", 404);
    }

    // Remove all items
    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
  },

  async checkout(userId, checkoutData) {
    const cart = await this.getCart(userId);

    if (!cart.items.length) {
      throw new ApiError("Cart is empty", 400);
    }

    // Start transaction
    return await db.transaction(async (tx) => {
      // 1. Validate addresses
      const [shippingAddress, billingAddress] = await Promise.all([
        tx.query.addresses.findFirst({
          where: and(
            eq(addresses.id, checkoutData.shippingAddressId),
            eq(addresses.userId, userId)
          ),
        }),
        tx.query.addresses.findFirst({
          where: and(
            eq(addresses.id, checkoutData.billingAddressId),
            eq(addresses.userId, userId)
          ),
        }),
      ]);

      if (!shippingAddress || !billingAddress) {
        throw new ApiError("Invalid shipping or billing address", 400);
      }

      // 2. Validate payment method
      const paymentMethod = await tx.query.paymentMethods.findFirst({
        where: and(
          eq(paymentMethods.id, checkoutData.paymentMethodId),
          eq(paymentMethods.userId, userId)
        ),
      });

      if (!paymentMethod) {
        throw new ApiError("Invalid payment method", 400);
      }

      // 3. Calculate totals and validate stock
      let subtotal = 0;
      let discount = 0;

      // สำหรับการเก็บข้อมูล items ที่ถูกต้องหลังจากการ fetch เพื่อใช้ในการสร้าง orderItems
      const finalOrderItems = [];

      for (const item of cart.items) {
        // ดึง product เสมอเพื่อเอาข้อมูลชื่อและ base price (ถ้าไม่มี variant)
        const product = await tx.query.products.findFirst({
          where: eq(products.id, item.productId),
        });

        if (!product) {
          throw new ApiError(`Product ${item.productId} not found`, 404);
        }

        let currentPrice; // ราคาปัจจุบันของ item
        let currentStock; // สต็อกปัจจุบันของ item

        if (item.variantId) {
          // ถ้ามี variantId, ดึงข้อมูล variant มา
          const variant = await tx.query.productVariants.findFirst({
            where: eq(productVariants.id, item.variantId),
          });

          if (!variant) {
            throw new ApiError(
              `Product variant ${item.variantId} not found`,
              404
            );
          }

          currentPrice = Number(variant.price); // ต้องมั่นใจว่าเป็น Number เพราะ decimal อาจจะ return เป็น string
          currentStock = variant.stock;

          // อัปเดต stock ของ variant
          await tx
            .update(productVariants)
            .set({ stock: currentStock - item.quantity })
            .where(eq(productVariants.id, variant.id));
        } else {
          // ถ้าไม่มี variantId, ใช้ข้อมูลจาก product โดยตรง (สำหรับสินค้าที่ไม่มี variant)
          // **ข้อควรระวัง:** ถ้าตาราง products ไม่มี stock แล้ว โค้ดนี้จะใช้ไม่ได้
          // ดังนั้น สต็อกควรถูกจัดการที่ variant เท่านั้น
          // หรือถ้า product ไม่มี variant จะต้องมีสต็อกของตัวเองที่ product level (ซึ่งเราตกลงว่าไม่ควรมี)
          // ทางที่ดีที่สุดคือทุกสินค้าควรมี variant แม้จะมีแค่ 1 variant (เช่น 'default' color/size)

          // **สมมติฐานใหม่:** เมื่อเราลบ stock จาก `products` แล้ว
          // ทุก item ในตะกร้า **ต้องมี** `variantId` หากต้องการตรวจสอบ stock
          // ถ้าสินค้าไม่มี variant ในระบบของคุณ (เช่น เป็นสินค้าเดี่ยวๆ ไม่มีสี/ไซส์)
          // คุณควรสร้าง "variant default" สำหรับสินค้านั้นๆ ในตาราง productVariants
          // เพื่อให้ stock และ price อยู่ในที่เดียวกันเสมอ

          throw new ApiError(
            `Product ${product.name} (ID: ${product.id}) requires a variant to be purchased.`,
            400
          );
          // หรือถ้าคุณยืนยันว่าสินค้านั้นไม่มี variant จริงๆ และ stock ควรดึงจาก product:
          // currentPrice = Number(product.price);
          // currentStock = product.stock; // **จะ Error เพราะไม่มี column stock ใน products แล้ว**
        }

        // ตรวจสอบ stock
        if (currentStock < item.quantity) {
          throw new ApiError(
            `Insufficient stock for product ${product.name} (variant: ${
              item.variantId || "N/A"
            }) - Available: ${currentStock}, Requested: ${item.quantity}`,
            400
          );
        }

        // เพิ่มราคาสินค้าใน subtotal
        subtotal += currentPrice * item.quantity;

        // เก็บข้อมูลสำหรับสร้าง Order Item
        finalOrderItems.push({
          productId: item.productId, // ควรเก็บ productId ไว้ด้วยเพื่อความสมบูรณ์
          variantId: item.variantId,
          quantity: item.quantity,
          price: currentPrice, // ใช้ราคาที่ดึงมาจริง
        });
      }

      // 4. Apply coupon if provided
      if (checkoutData.couponCode) {
        const coupon = await tx.query.coupons.findFirst({
          where: and(
            eq(coupons.code, checkoutData.couponCode),
            eq(coupons.isActive, true),
            gte(coupons.validUntil, new Date())
          ),
        });

        if (coupon) {
          discount = (subtotal * coupon.discountPercentage) / 100;
        }
      }

      const total = subtotal - discount;

      // 5. Create order
      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          shippingAddressId: checkoutData.shippingAddressId,
          billingAddressId: checkoutData.billingAddressId,
          paymentMethodId: checkoutData.paymentMethodId,
          couponCode: checkoutData.couponCode,
          notes: checkoutData.notes,
          subtotal,
          discount,
          total,
          status: "pending",
        })
        .returning();

      // 6. Create order items
      const orderItemsData = finalOrderItems.map((item) => ({
        orderId: order.id,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price, // ใช้ราคาที่คำนวณไว้แล้ว
      }));

      await tx.insert(orderItems).values(orderItemsData);

      // 7. Clear cart
      await this.clearCart(userId);

      // 8. Return order details
      return {
        orderId: order.id,
        status: order.status,
        total: order.total,
        items: orderItemsData,
        shippingAddress,
        billingAddress,
        paymentMethod,
      };
    });
  },
  async mergeGuestCart(userId, items) {
    // Get or create cart
    let cart = await db.query.carts.findFirst({
      where: eq(carts.userId, userId),
    });

    if (!cart) {
      [cart] = await db.insert(carts).values({ userId }).returning();
    }

    // Process each item from guest cart
    for (const item of items) {
      const { productId, variantId, quantity, price } = item;

      // Verify product exists
      const product = await db.query.products.findFirst({
        where: eq(products.id, productId),
      });

      if (!product) {
        continue; // Skip invalid products
      }

      // Check if item already exists in cart
      const existingItem = await db.query.cartItems.findFirst({
        where: and(
          eq(cartItems.cartId, cart.id),
          eq(cartItems.productId, productId),
          variantId
            ? eq(cartItems.variantId, variantId)
            : sql`${cartItems.variantId} IS NULL`
        ),
      });

      if (existingItem) {
        // Update quantity if item exists
        await db
          .update(cartItems)
          .set({
            quantity: existingItem.quantity + quantity,
            price: price, // Use the price from guest cart
            updatedAt: new Date(),
          })
          .where(eq(cartItems.id, existingItem.id));
      } else {
        // Add new item
        await db.insert(cartItems).values({
          cartId: cart.id,
          productId,
          variantId,
          quantity,
          price,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Return updated cart
    return this.getCart(userId);
  },
};
