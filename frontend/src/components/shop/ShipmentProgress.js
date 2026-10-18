"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, PackageCheck, Star, Store } from "lucide-react";
import { toast } from "react-hot-toast";
import { orderAPI } from "@/lib/api/orders";
import { AUTO_DELIVER_DAYS, carrierName, trackingUrl } from "@/lib/shipping";

const STEPS = [
  { key: "paid", label: "ชำระแล้ว" },
  { key: "processing", label: "เตรียมสินค้า" },
  { key: "shipped", label: "จัดส่งแล้ว" },
  { key: "delivered", label: "ได้รับสินค้า" },
];
// How far along each order status is (index into STEPS).
const REACHED = { paid: 0, confirmed: 0, processing: 1, shipped: 2, delivered: 3, refund_requested: 3 };

// Click & collect: "ready" is the pickup's status, not the order's.
const PICKUP_STEPS = [
  { key: "paid", label: "ชำระแล้ว" },
  { key: "processing", label: "เตรียมสินค้า" },
  { key: "ready", label: "พร้อมให้รับ" },
  { key: "collected", label: "รับสินค้าแล้ว" },
];

function pickupReached(order) {
  if (order.status === "processing") return order.pickup?.status === "ready" ? 2 : 1;
  return REACHED[order.status];
}

/** The branch a pickup order is collected from, and what to do there. */
function PickupBranch({ order }) {
  const { store, status } = order.pickup ?? {};
  if (!store) return null;
  return (
    <div className="mt-6 rounded-lg bg-surface-muted px-4 py-3 text-sm">
      <p className="flex items-center gap-2 font-semibold text-fg">
        <Store className="h-4 w-4" aria-hidden /> รับที่ {store.name}
      </p>
      {(store.address || store.city) && (
        <p className="mt-1 text-fg-muted">{[store.address, store.city, store.postalCode].filter(Boolean).join(" ")}</p>
      )}
      {store.description && <p className="mt-1 text-fg-muted">{store.description}</p>}
      {store.phone && <p className="mt-1 text-fg-muted">โทร {store.phone}</p>}
      {order.status === "processing" && (
        <p className="mt-3 font-medium text-fg">
          {status === "ready"
            ? `สินค้าพร้อมแล้ว แสดงเลขคำสั่งซื้อ #${order.orderNumber} กับพนักงานเพื่อรับสินค้า`
            : "กำลังเตรียมสินค้า เราจะแจ้งเตือนเมื่อพร้อมให้รับ"}
        </p>
      )}
    </div>
  );
}

/**
 * Where a paid order is: a four-step timeline, the parcel's tracking link,
 * and the "received" button while it is on its way.
 */
export default function ShipmentProgress({ order, onChanged, reviewPoints = 20 }) {
  const [confirming, setConfirming] = useState(false);
  const isPickup = order.fulfillment === "pickup";
  const steps = isPickup ? PICKUP_STEPS : STEPS;
  const reached = isPickup ? pickupReached(order) : REACHED[order.status];
  if (reached === undefined) return null; // unpaid, cancelled or refunded

  const link = trackingUrl(order.carrier, order.trackingNumber);

  const confirmReceived = async () => {
    if (!window.confirm("ยืนยันว่าได้รับสินค้าครบแล้ว?")) return;
    setConfirming(true);
    try {
      await orderAPI.updateOrderStatus(order.id, "delivered");
      toast.success(`ขอบคุณครับ! รีวิวสินค้าด้านล่างรับ ${reviewPoints} แต้มต่อชิ้น`, { duration: 5000 });
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "ยืนยันไม่สำเร็จ");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <section aria-labelledby="progress-title" className="rounded-xl border bg-surface p-6 shadow">
      <h2 id="progress-title" className="sr-only">{isPickup ? "สถานะการรับสินค้า" : "สถานะการจัดส่ง"}</h2>
      <ol className="grid grid-cols-4 gap-2">
        {steps.map((step, i) => {
          const done = i <= reached;
          return (
            <li key={step.key} className="relative flex flex-col items-center text-center" aria-current={i === reached ? "step" : undefined}>
              {i > 0 && (
                <span className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${i <= reached ? "bg-fg" : "bg-border"}`} aria-hidden />
              )}
              <span
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  done ? "border-fg bg-fg text-canvas" : "border-border bg-surface text-fg-subtle"
                }`}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
              </span>
              <span className={`mt-2 text-xs sm:text-sm ${done ? "font-semibold text-fg" : "text-fg-subtle"}`}>{step.label}</span>
            </li>
          );
        })}
      </ol>

      {isPickup && <PickupBranch order={order} />}

      {order.trackingNumber && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-muted px-4 py-3 text-sm">
          <div>
            <p className="text-fg-muted">{carrierName(order.carrier) || "ขนส่ง"}</p>
            <p className="font-mono font-semibold tracking-wide text-fg">{order.trackingNumber}</p>
          </div>
          {link && (
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-fg underline underline-offset-4">
              ติดตามพัสดุ <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
        </div>
      )}

      {order.status === "shipped" && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-fg-muted">
            ได้รับของแล้วกดยืนยันได้เลย ถ้าไม่ได้กด ระบบจะยืนยันให้อัตโนมัติ {AUTO_DELIVER_DAYS} วันหลังจัดส่ง
          </p>
          <button
            type="button"
            onClick={confirmReceived}
            disabled={confirming}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-fg px-5 text-sm font-semibold text-canvas hover:bg-fg/85 disabled:opacity-60"
          >
            <PackageCheck className="h-4 w-4" aria-hidden />
            {confirming ? "กำลังบันทึก..." : "ได้รับสินค้าแล้ว"}
          </button>
        </div>
      )}

      {["delivered", "refund_requested"].includes(order.status) && (
        <p className="mt-5 flex items-center gap-2 text-sm text-fg-muted">
          <Star className="h-4 w-4 text-fg" aria-hidden /> รีวิวสินค้าแต่ละชิ้นด้านล่าง รับ {reviewPoints} แต้มต่อชิ้น
        </p>
      )}
    </section>
  );
}

/** "Write a review" link for an item of a received order. */
export function ReviewItemLink({ productId, reviewPoints = 20 }) {
  if (!productId) return null;
  return (
    <Link
      href={`/products/${productId}?review=1#reviews`}
      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-fg hover:bg-fg/5"
    >
      <Star className="h-3.5 w-3.5" aria-hidden /> เขียนรีวิว รับ {reviewPoints} แต้ม
    </Link>
  );
}
