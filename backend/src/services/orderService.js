import { db } from "../config/db.js";
import {
  orders,
  orderItems,
  orderStatusHistory,
  products,
  productVariants,
  carts,
  cartItems,
  addresses,
  paymentMethods,
  coupons,
  shippingMethods,
  paymentTransactions,
  shipments,
} from "../models/schema.js";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { cartService } from "./cartService.js";
import { generateOrderNumber } from "../utils/orderUtils.js";
import { omiseService } from "./omiseService.js";
import { shippingService } from "./shippingService.js";
import { paymentService } from "./paymentService.js";
import { getFileUrl, BUCKETS } from "../config/minio.js";

// Utility: normalize payment code
function normalizePaymentCode(code) {
  if (!code) return "";
  const c = code.toLowerCase();
  if (["credit", "credit_card", "card"].includes(c)) return "card";
  if (["promptpay", "prompt_pay"].includes(c)) return "promptpay";
  if (["omise"].includes(c)) return "omise";
  return c;
}

// Utility: generate presigned image URLs for product
async function withPresignedImageUrl(product) {
  if (!product || !product.imageUrl) return product;
  if (Array.isArray(product.imageUrl)) {
    product.imageUrl = await Promise.all(
      product.imageUrl.map(async (img) =>
        img ? await getFileUrl(BUCKETS.PRODUCTS, img) : null
      )
    );
  } else if (typeof product.imageUrl === "string") {
    product.imageUrl = await getFileUrl(BUCKETS.PRODUCTS, product.imageUrl);
  }
  return product;
}

export const orderService = {
  async getOrders(userId, { page, limit, status }, txOrDb = db) {
    const offset = (page - 1) * limit;

    const whereConditions = [eq(orders.userId, userId)];
    if (status) {
      whereConditions.push(eq(orders.status, status));
    }

    const orderList = await txOrDb.query.orders.findMany({
      where: and(...whereConditions),
      with: {
        items: {
          with: {
            product: {
              with: {
                brand: true,
                category: true,
              },
            },
            variant: true,
          },
        },
        shippingAddress: true,
        billingAddress: true,
        paymentMethod: true,
      },
      limit,
      offset,
      orderBy: [desc(orders.createdAt)],
    });

    // Generate presigned URLs for product images in order items
    await Promise.all(
      orderList.map(async (order) => {
        if (order.items && order.items.length > 0) {
          await Promise.all(
            order.items.map(async (item) => {
              item.product = await withPresignedImageUrl(item.product);
            })
          );
        }
      })
    );

    const total = await txOrDb
      .select({ count: sql`count(*)` })
      .from(orders)
      .where(and(...whereConditions));

    return {
      orders: orderList,
      totalPages: Math.ceil(total[0].count / limit),
      currentPage: page,
      totalItems: total[0].count,
    };
  },

  async getOrderById(userId, orderId, txOrDb = db) {
    const order = await txOrDb.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
      with: {
        items: {
          with: {
            product: {
              with: {
                brand: true,
                category: true,
              },
            },
            variant: true,
          },
        },
        shippingAddress: true,
        billingAddress: true,
        paymentMethod: true,
      },
    });

    if (!order) {
      throw new ApiError("Order not found", 404);
    }

    // Generate presigned URLs for product images in order items
    if (order.items && order.items.length > 0) {
      await Promise.all(
        order.items.map(async (item) => {
          item.product = await withPresignedImageUrl(item.product);
        })
      );
    }

    return order;
  },

  async createOrder(userId, orderData) {
    const {
      shippingAddressId,
      billingAddressId,
      shippingMethodId,
      paymentMethodId,
      notes,
      items,
    } = orderData;

    try {
      // Start transaction
      return await db.transaction(async (tx) => {
        // 1. Validate addresses
        const [shippingAddress, billingAddress] = await Promise.all([
          tx.query.addresses.findFirst({
            where: and(
              eq(addresses.id, shippingAddressId),
              eq(addresses.userId, userId)
            ),
          }),
          tx.query.addresses.findFirst({
            where: and(
              eq(addresses.id, billingAddressId),
              eq(addresses.userId, userId)
            ),
          }),
        ]);

        if (!shippingAddress || !billingAddress) {
          throw new ApiError("Invalid shipping or billing address", 400);
        }

        // 2. Validate shipping method
        const shippingMethod = await tx.query.shippingMethods.findFirst({
          where: eq(shippingMethods.id, shippingMethodId),
        });

        if (!shippingMethod || !shippingMethod.isActive) {
          throw new ApiError("Invalid shipping method", 400);
        }

        // 3. Validate payment method
        const paymentMethod = await tx.query.paymentMethods.findFirst({
          where: eq(paymentMethods.id, paymentMethodId),
        });

        if (!paymentMethod || !paymentMethod.isActive) {
          throw new ApiError("Invalid payment method", 400);
        }

        // 4. ตรวจสอบและตัด stock แบบ atomic
        let subtotal = 0;
        const orderItemsData = [];
        for (const item of items) {
          const product = await tx.query.products.findFirst({
            where: eq(products.id, item.productId),
          });
          if (!product) {
            throw new ApiError(`Product not found: ${item.productId}`, 404);
          }
          let price = product.price;
          let stock = product.stock;
          let variant = null;
          if (item.variantId) {
            variant = await tx.query.productVariants.findFirst({
              where: and(
                eq(productVariants.id, item.variantId),
                eq(productVariants.productId, item.productId)
              ),
            });
            if (!variant) {
              throw new ApiError(`Variant not found: ${item.variantId}`, 404);
            }
            price = variant.price || product.price;
            stock = variant.stock;
          }
          if (item.quantity > stock) {
            throw new ApiError(
              `Insufficient stock for product: ${product.name}`,
              400
            );
          }
          // ตัด stock แบบ atomic
          if (item.variantId) {
            const updated = await tx
              .update(productVariants)
              .set({ stock: stock - item.quantity })
              .where(
                and(
                  eq(productVariants.id, item.variantId),
                  eq(productVariants.stock, stock)
                )
              )
              .returning();
            if (!updated.length) {
              throw new ApiError(
                `Stock changed, please try again: ${product.name}`,
                409
              );
            }
          } else {
            const updated = await tx
              .update(products)
              .set({ stock: stock - item.quantity })
              .where(
                and(eq(products.id, item.productId), eq(products.stock, stock))
              )
              .returning();
            if (!updated.length) {
              throw new ApiError(
                `Stock changed, please try again: ${product.name}`,
                409
              );
            }
          }
          const itemSubtotal = price * item.quantity;
          subtotal += itemSubtotal;
          orderItemsData.push({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price,
            subtotal: itemSubtotal,
          });
        }

        // 5. คำนวณค่าจัดส่งจริงด้วย shippingService
        let shippingCost = orderData.shippingCost;
        if (shippingCost == null) {
          // เรียก shippingService.calculateShippingCost
          const shippingCosts = await shippingService.calculateShippingCost(
            shippingAddressId,
            items
          );
          // เลือก shipping method ที่ตรงกับ shippingMethodId
          const selected = shippingCosts.find(
            (m) => m.methodId === shippingMethodId
          );
          if (!selected) {
            throw new ApiError(
              "Shipping method not available for this address",
              400
            );
          }
          shippingCost = selected.cost;
        }
        const tax = subtotal * 0.07; // 7% VAT
        const total = subtotal + shippingCost + tax;

        // 6. Create order
        const [order] = await tx
          .insert(orders)
          .values({
            userId,
            orderNumber: generateOrderNumber(),
            status: "pending",
            paymentStatus: "pending",
            shippingStatus: "pending",
            subtotal,
            shippingCost,
            tax,
            total,
            shippingAddressId,
            billingAddressId,
            shippingMethodId,
            paymentMethodId,
            notes,
          })
          .returning();

        // 7. Create order items
        await tx.insert(orderItems).values(
          orderItemsData.map((item) => ({
            orderId: order.id,
            ...item,
          }))
        );

        // 8. Create order status history
        await tx.insert(orderStatusHistory).values({
          orderId: order.id,
          status: "pending",
          comment: "Order created",
          createdBy: userId,
        });

        // 9. Create shipment (เรียก shippingService แบบ production-grade ส่ง tx เข้าไป)
        let shipment;
        try {
          shipment = await shippingService.createShippingLabel(
            order.id,
            shippingMethodId,
            tx
          );
          await tx
            .update(orders)
            .set({
              trackingNumber: shipment.trackingNumber,
              carrier: shippingMethod.name,
              estimatedDelivery: shipment.estimatedDelivery,
              shippingStatus: "pending",
              updatedAt: new Date(),
            })
            .where(eq(orders.id, order.id));
        } catch (err) {
          throw new ApiError("Failed to create shipment", 500);
        }

        // 10. Create payment transaction (ทุกกรณี, production-grade ส่ง tx เข้าไป)
        let paymentTx;
        try {
          paymentTx = await paymentService.createPayment(
            userId,
            order.id,
            paymentMethod.code,
            null,
            tx
          );
        } catch (err) {
          throw new ApiError("Failed to create payment transaction", 500);
        }

        // 11. รองรับ Omise ทุก code ที่เกี่ยวข้อง
        const normalizedCode = normalizePaymentCode(paymentMethod.code);
        console.log(
          "[OrderService] paymentMethod.code=",
          paymentMethod.code,
          "normalized=",
          normalizedCode,
          "token=",
          orderData.omiseToken,
          "source=",
          orderData.omiseSource
        );
        if (["omise", "card", "promptpay"].includes(normalizedCode)) {
          try {
            const chargeParams = {
              amount: Math.round(total * 100),
              currency: "thb",
              description: `Order ${order.orderNumber}`,
              metadata: {
                orderId: order.id,
                userId: userId,
              },
            };
            if (normalizedCode === "card") {
              if (!orderData.omiseToken) {
                throw new ApiError(
                  "Missing Omise card token for credit card payment",
                  400
                );
              }
              chargeParams.card = orderData.omiseToken;
            }
            if (normalizedCode === "promptpay") {
              if (!orderData.omiseSource) {
                throw new ApiError(
                  "Missing Omise source for promptpay payment",
                  400
                );
              }
              chargeParams.source = orderData.omiseSource;
            }
            console.log(
              "[OrderService] Calling omiseService.createCharge",
              chargeParams
            );
            const charge = await omiseService.createCharge(chargeParams);
            await paymentService.updatePayment(paymentTx.id, {
              transactionId: charge.id,
              paymentDetails: charge,
              status: charge.status === "successful" ? "completed" : "pending",
            });
            await tx
              .update(orders)
              .set({
                paymentStatus:
                  charge.status === "successful" ? "completed" : "pending",
                updatedAt: new Date(),
                ...(charge.status === "successful"
                  ? { paidAt: new Date() }
                  : {}),
              })
              .where(eq(orders.id, order.id));
          } catch (err) {
            await paymentService.updatePayment(paymentTx.id, {
              status: "failed",
            });
            await tx
              .update(orders)
              .set({
                paymentStatus: "failed",
                updatedAt: new Date(),
              })
              .where(eq(orders.id, order.id));
            throw new ApiError("Omise payment failed", 400);
          }
        } else {
          console.log(
            "[OrderService] Payment method code not supported for Omise charge:",
            paymentMethod.code,
            "token=",
            orderData.omiseToken,
            "source=",
            orderData.omiseSource
          );
        }

        // Return complete order with items (ใช้ tx)
        return await this.getOrderById(userId, order.id, tx);
      });
    } catch (err) {
      throw err;
    }
  },

  async cancelOrder(userId, orderId, reason, txOrDb = db) {
    const order = await this.getOrderById(userId, orderId, txOrDb);

    if (order.status !== "pending") {
      throw new ApiError("Order cannot be cancelled", 400);
    }

    const [updatedOrder] = await txOrDb
      .update(orders)
      .set({
        status: "cancelled",
        cancellationReason: reason,
        cancelledAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .returning();

    return updatedOrder;
  },

  async refundOrder(
    userId,
    orderId,
    { reason, refundAmount, refundItems },
    txOrDb = db
  ) {
    const order = await this.getOrderById(userId, orderId, txOrDb);

    if (order.status !== "delivered") {
      throw new ApiError("Order cannot be refunded", 400);
    }

    // Verify refund amount
    if (refundAmount > order.total) {
      throw new ApiError("Refund amount exceeds order total", 400);
    }

    // Verify refund items
    if (refundItems) {
      for (const item of refundItems) {
        const orderItem = order.items.find((i) => i.id === item.itemId);
        if (!orderItem) {
          throw new ApiError(`Invalid order item: ${item.itemId}`, 400);
        }
        if (item.quantity > orderItem.quantity) {
          throw new ApiError(
            `Refund quantity exceeds order quantity for item: ${item.itemId}`,
            400
          );
        }
      }
    }

    const [updatedOrder] = await txOrDb
      .update(orders)
      .set({
        status: "refunded",
        refundReason: reason,
        refundAmount,
        refundedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .returning();

    return updatedOrder;
  },

  async getAllOrders({ page, limit, status, search }, txOrDb = db) {
    const offset = (page - 1) * limit;

    const whereConditions = [];
    if (status) {
      whereConditions.push(eq(orders.status, status));
    }
    if (search) {
      whereConditions.push(
        sql`${orders.id}::text ILIKE ${`%${search}%`} OR ${
          orders.userId
        }::text ILIKE ${`%${search}%`}`
      );
    }

    const orderList = await txOrDb.query.orders.findMany({
      where: whereConditions.length ? and(...whereConditions) : undefined,
      with: {
        items: {
          with: {
            product: {
              with: {
                brand: true,
                category: true,
              },
            },
            variant: true,
          },
        },
        shippingAddress: true,
        billingAddress: true,
        paymentMethod: true,
      },
      limit,
      offset,
      orderBy: [desc(orders.createdAt)],
    });

    const total = await txOrDb
      .select({ count: sql`count(*)` })
      .from(orders)
      .where(whereConditions.length ? and(...whereConditions) : undefined);

    return {
      items: orderList,
      pagination: {
        total: total[0].count,
        page,
        limit,
        pages: Math.ceil(total[0].count / limit),
      },
    };
  },

  async getOrderStats({ startDate, endDate }, txOrDb = db) {
    const whereConditions = [];
    if (startDate) {
      whereConditions.push(gte(orders.createdAt, new Date(startDate)));
    }
    if (endDate) {
      whereConditions.push(lte(orders.createdAt, new Date(endDate)));
    }

    const stats = await txOrDb
      .select({
        total: sql`count(*)`,
        totalAmount: sql`sum(${orders.total})`,
        pending: sql`count(*) filter (where ${orders.status} = 'pending')`,
        processing: sql`count(*) filter (where ${orders.status} = 'processing')`,
        shipped: sql`count(*) filter (where ${orders.status} = 'shipped')`,
        delivered: sql`count(*) filter (where ${orders.status} = 'delivered')`,
        cancelled: sql`count(*) filter (where ${orders.status} = 'cancelled')`,
        refunded: sql`count(*) filter (where ${orders.status} = 'refunded')`,
      })
      .from(orders)
      .where(whereConditions.length ? and(...whereConditions) : undefined);

    return stats[0];
  },

  async getOrderTracking(userId, orderId, txOrDb = db) {
    const shipment = await txOrDb.query.shipments.findFirst({
      where: and(eq(shipments.orderId, orderId)),
    });
    if (!shipment) {
      throw new ApiError("ไม่พบข้อมูลการจัดส่งสำหรับออเดอร์นี้", 404);
    }
    return shipment;
  },

  // เพิ่มฟังก์ชัน updateOrderStatus สำหรับ webhook/payment
  async updateOrderStatus(orderId, { status, notes }) {
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "paid",
      "refunded",
    ];
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status");
    }
    const [updatedOrder] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    if (!updatedOrder) {
      throw new Error("Order not found");
    }
    // Add status history
    await db.insert(orderStatusHistory).values({
      orderId,
      status,
      comment: notes || `Status updated to ${status}`,
      createdBy: null,
    });
    return updatedOrder;
  },
};
