/**
 * Tells the customer when their order changes status: an in-app notification,
 * written in the same transaction as the status change, plus an email for the
 * changes that matter most.
 *
 * Delivery (socket push and email) happens after commit: pg_notify inside a
 * transaction is only sent when it commits, and notificationDelivery listens.
 */
import { sql } from "drizzle-orm";
import { notifications } from "../models/schema.js";
import { REVIEW_REWARD_POINTS } from "./loyaltyService.js";

export const NOTIFICATION_CHANNEL = "app_notifications";

const CANCEL_REASONS = {
  "Payment expired": "เลยเวลาชำระเงิน",
  "Payment deadline passed": "เลยเวลาชำระเงิน",
};

/**
 * What to tell the customer for each new status. `email` marks the ones also
 * sent by email. Statuses missing here (and changes the customer made
 * themselves) create nothing.
 */
const MESSAGES = {
  paid: { type: "payment", email: true, title: "ชำระเงินสำเร็จ", text: (n) => `เราได้รับชำระเงินสำหรับคำสั่งซื้อ #${n} แล้ว กำลังเตรียมสินค้าให้คุณ` },
  confirmed: { type: "order", title: "ยืนยันคำสั่งซื้อแล้ว", text: (n) => `คำสั่งซื้อ #${n} ได้รับการยืนยันแล้ว` },
  shipped: { type: "shipping", email: true, title: "จัดส่งสินค้าแล้ว", text: (n) => `คำสั่งซื้อ #${n} ออกจากคลังแล้ว ดูเลขพัสดุได้ในหน้าคำสั่งซื้อ` },
  delivered: {
    type: "shipping",
    title: "จัดส่งสำเร็จ",
    text: (n) => `คำสั่งซื้อ #${n} จัดส่งถึงปลายทางแล้ว รีวิวสินค้าในหน้าคำสั่งซื้อ รับ ${REVIEW_REWARD_POINTS} แต้มต่อชิ้น`,
  },
  cancelled: {
    type: "order",
    email: true,
    title: "คำสั่งซื้อถูกยกเลิก",
    text: (n, order) => {
      const reason = CANCEL_REASONS[order.cancellationReason] ?? order.cancellationReason;
      return `คำสั่งซื้อ #${n} ถูกยกเลิก${reason ? ` (${reason})` : ""}`;
    },
  },
  refunded: { type: "payment", email: true, title: "คืนเงินแล้ว", text: (n) => `เราคืนเงินสำหรับคำสั่งซื้อ #${n} แล้ว ยอดเงินจะกลับเข้าช่องทางที่ชำระภายในไม่กี่วันทำการ` },
};

const REFUND_REJECTED = {
  type: "payment",
  email: true,
  title: "คำขอคืนเงินไม่ได้รับอนุมัติ",
  text: (n) => `คำขอคืนเงินสำหรับคำสั่งซื้อ #${n} ไม่ได้รับอนุมัติ หากมีคำถามติดต่อเราผ่านแชทได้เลย`,
};

export function orderStatusMessage(fromStatus, order) {
  if (fromStatus === "refund_requested" && order.status === "delivered") return REFUND_REJECTED;
  return MESSAGES[order.status] ?? null;
}

/** Call inside the transaction that changed the status. */
export async function notifyOrderStatus(tx, fromStatus, order, actorId) {
  if (!order.userId || fromStatus === order.status) return null;
  if (actorId && actorId === order.userId) return null; // their own action
  const spec = orderStatusMessage(fromStatus, order);
  if (!spec) return null;

  const [created] = await tx
    .insert(notifications)
    .values({
      userId: order.userId,
      type: spec.type,
      title: spec.title,
      message: spec.text(order.orderNumber, order),
      isRead: false,
      metadata: {
        priority: spec.email ? "high" : "medium",
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        link: `/orders/${order.id}`,
      },
    })
    .returning({ id: notifications.id });

  await publishNotification(tx, { id: created.id, userId: order.userId, email: Boolean(spec.email) });
  return created;
}

/** Queue delivery; sent to listeners when the surrounding transaction commits. */
export async function publishNotification(txOrDb, event) {
  await txOrDb.execute(sql`select pg_notify(${NOTIFICATION_CHANNEL}, ${JSON.stringify(event)})`);
}
