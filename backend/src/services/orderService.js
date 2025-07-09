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
    product.imageUrl = product.imageUrl.map((img) =>
      img ? getFileUrl(BUCKETS.PRODUCTS, img) : null
    );
  } else if (typeof product.imageUrl === "string") {
    product.imageUrl = getFileUrl(BUCKETS.PRODUCTS, product.imageUrl);
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

  // ตรวจสอบให้แน่ใจว่าได้ import สิ่งเหล่านี้แล้ว
  // import { db } from './db';
  // import { addresses, paymentMethods, products, productVariants, orders, orderItems, coupons, shippingMethods, orderStatusHistory } from './schema'; // เพิ่ม shippingMethods, orderStatusHistory
  // import { eq, and, gte } from 'drizzle-orm';
  // import { ApiError } from './apiError';
  // import { generateOrderNumber } from '../utils/orderUtils'; // สมมติว่ามี util นี้
  // import { shippingService } from '../services/shippingService'; // สมมติว่ามี service นี้
  // import { paymentService } from '../services/paymentService'; // สมมติว่ามี service นี้
  // import { omiseService } from '../services/omiseService'; // สมมติว่ามี service นี้
  // import { normalizePaymentCode } from '../utils/paymentUtils'; // สมมติว่ามี util นี้

  async createOrder(userId, orderData) {
    const {
      shippingAddressId,
      billingAddressId,
      shippingMethodId,
      paymentMethodId,
      notes,
      items, // orderData.items ควรมี { productId, variantId, quantity }
    } = orderData;

    // ตรวจสอบว่ามีรายการสินค้าในออร์เดอร์หรือไม่
    if (!items || items.length === 0) {
      throw new ApiError("Order must contain at least one item", 400);
    }

    try {
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

        // ดึงข้อมูล product และ variant ทั้งหมดในครั้งเดียวเพื่อประสิทธิภาพที่ดีขึ้น
        // แต่ยังคงตรวจสอบ stock และอัปเดตแยกกันในลูปเพื่อ atomicity
        const productAndVariantData = await Promise.all(
          items.map(async (item) => {
            const product = await tx.query.products.findFirst({
              where: eq(products.id, item.productId),
            });
            if (!product) {
              throw new ApiError(`Product not found: ${item.productId}`, 404);
            }

            let variant = null;
            if (item.variantId) {
              variant = await tx.query.productVariants.findFirst({
                where: and(
                  eq(productVariants.id, item.variantId),
                  eq(productVariants.productId, item.productId)
                ),
              });
              if (!variant) {
                throw new ApiError(
                  `Variant not found: ${item.variantId} for product ${product.name}`,
                  404
                );
              }
            } else {
              // หากไม่มี variantId และเราได้ตกลงกันว่า stock อยู่ที่ variant เท่านั้น
              // กรณีนี้ควร throw error หรือบังคับให้สินค้ามี default variant
              throw new ApiError(
                `Product ${product.name} requires a variant to be purchased.`,
                400
              );
            }
            return { item, product, variant };
          })
        );

        for (const { item, product, variant } of productAndVariantData) {
          // ณ จุดนี้ variant จะต้องมีค่าเสมอจากการตรวจสอบข้างต้น
          const currentPrice = Number(variant.price); // ใช้ราคาจาก variant
          const currentStock = variant.stock; // ใช้ stock จาก variant

          if (item.quantity <= 0) {
            throw new ApiError("Item quantity must be positive.", 400);
          }

          if (item.quantity > currentStock) {
            throw new ApiError(
              `Insufficient stock for product ${product.name} (Variant: ${variant.color} ${variant.size}). Available: ${currentStock}, Requested: ${item.quantity}`,
              400
            );
          }

          // ตัด stock แบบ atomic (optimistic locking)
          const updated = await tx
            .update(productVariants)
            .set({ stock: currentStock - item.quantity })
            .where(
              and(
                eq(productVariants.id, variant.id),
                eq(productVariants.stock, currentStock) // ตรวจสอบ stock ก่อนอัปเดต
              )
            )
            .returning();

          if (!updated.length) {
            // ถ้า updated.length เป็น 0 แสดงว่า stock มีการเปลี่ยนแปลงไปแล้ว
            // เนื่องจากมีคนอื่นซื้อไป หรือมีการปรับสต็อก
            throw new ApiError(
              `Stock for product ${product.name} (Variant: ${variant.color} ${variant.size}) changed. Please try again.`,
              409
            );
          }

          const itemSubtotal = currentPrice * item.quantity;
          subtotal += itemSubtotal;

          orderItemsData.push({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: currentPrice, // ใช้ราคาที่ดึงมาจาก variant
            subtotal: itemSubtotal,
          });
        }

        // 5. คำนวณค่าจัดส่งจริงด้วย shippingService
        // ตรงนี้ยังคงใช้ shippingAddressId และ items เพื่อให้ shippingService คำนวณได้
        let shippingCost = orderData.shippingCost; // ถ้า Frontend ส่งมาให้ใช้ (อาจเป็นค่าที่คำนวณแล้ว)
        if (shippingCost == null) {
          const shippingCosts = await shippingService.calculateShippingCost(
            shippingAddressId,
            items // ส่งรายการสินค้า เพื่อให้ shippingService คำนวณน้ำหนัก/ขนาด
          );
          const selected = shippingCosts.find(
            (m) => m.methodId === shippingMethodId
          );
          if (!selected) {
            throw new ApiError(
              "Shipping method not available for this address or items",
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
            orderNumber: generateOrderNumber(), // ตรวจสอบให้แน่ใจว่า generateOrderNumber() พร้อมใช้งาน
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
            createdAt: new Date(), // เพิ่ม createdAt ถ้า schema ไม่ได้ defaultNow()
            updatedAt: new Date(), // เพิ่ม updatedAt
          })
          .returning();

        // 7. Create order items
        await tx.insert(orderItems).values(
          orderItemsData.map((item) => ({
            orderId: order.id,
            productId: item.productId, // ต้องใส่ productId ด้วยใน orderItems
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          }))
        );

        // 8. Create order status history
        await tx.insert(orderStatusHistory).values({
          orderId: order.id,
          status: "pending",
          comment: "Order created",
          createdBy: userId,
          createdAt: new Date(), // เพิ่ม createdAt
        });

        // 9. Create shipment (เรียก shippingService แบบ production-grade ส่ง tx เข้าไป)
        let shipment;
        try {
          // ควรส่งข้อมูลที่เพียงพอสำหรับ shippingService เช่น address, items details
          shipment = await shippingService.createShippingLabel(
            order.id, // Order ID
            shippingMethodId,
            shippingAddress, // ส่งข้อมูล address ให้ครบ
            orderItemsData, // ส่งข้อมูล items ให้ครบ
            tx // ส่ง transaction object
          );

          await tx
            .update(orders)
            .set({
              trackingNumber: shipment.trackingNumber,
              carrier: shippingMethod.name, // ใช้ชื่อจาก shippingMethod ที่ validate มาแล้ว
              estimatedDelivery: shipment.estimatedDelivery || null, // อาจจะไม่มี
              shippingStatus: "pending", // หรือสถานะที่ได้จาก shipment
              updatedAt: new Date(),
            })
            .where(eq(orders.id, order.id));
        } catch (err) {
          console.error("Error creating shipment:", err); // Log error
          throw new ApiError("Failed to create shipment", 500);
        }

        // 10. Create payment transaction (ทุกกรณี, production-grade ส่ง tx เข้าไป)
        let paymentTx;
        try {
          paymentTx = await paymentService.createPayment(
            userId,
            order.id,
            paymentMethod.code,
            total, // ส่งยอดรวมให้ paymentService
            tx
          );
        } catch (err) {
          console.error("Error creating payment transaction:", err); // Log error
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
              amount: Math.round(total * 100), // Omise ใช้หน่วยสตางค์
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

            // อัปเดต payment record
            await paymentService.updatePayment(
              paymentTx.id,
              {
                transactionId: charge.id,
                paymentDetails: charge, // เก็บข้อมูล charge ทั้งหมด
                status:
                  charge.status === "successful" ? "completed" : "pending",
                updatedAt: new Date(),
              },
              tx
            ); // ส่ง tx เข้าไปใน paymentService.updatePayment ด้วย

            // อัปเดตสถานะ payment ของ Order
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
            console.error("Omise payment error:", err); // Log error
            // อัปเดต payment record เป็น failed
            await paymentService.updatePayment(
              paymentTx.id,
              {
                status: "failed",
                updatedAt: new Date(),
              },
              tx
            ); // ส่ง tx เข้าไป

            // อัปเดตสถานะ payment ของ Order เป็น failed
            await tx
              .update(orders)
              .set({
                paymentStatus: "failed",
                updatedAt: new Date(),
              })
              .where(eq(orders.id, order.id));

            throw new ApiError("Omise payment failed", 400); // Throw error ให้ transaction roll back
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
          // สำหรับวิธีการชำระเงินที่ไม่ใช่ Omise (เช่น โอนเงิน)
          // สถานะการชำระเงินของ Order และ Payment Transaction ควรเป็น "pending" หรือ "waiting_for_payment"
          // และจะถูกอัปเดตเมื่อมีการยืนยันการชำระเงินภายหลัง
        }

        // Return complete order with items (ใช้ tx)
        return await this.getOrderById(userId, order.id, tx);
      });
    } catch (err) {
      console.error("Error creating order:", err); // Log error
      // ข้อผิดพลาดจาก transaction จะถูก re-throw ออกมา
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
