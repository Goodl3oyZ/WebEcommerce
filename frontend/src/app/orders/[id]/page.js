"use client";
import { createCardToken } from "@/lib/omise";
import { cardErrorMessage, formatCardNumber, formatCvc, formatExpiry, validateCard } from "@/lib/cardInput";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { orderAPI } from "@/lib/api/orders";
import { toast } from "react-hot-toast";
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Loader2,
  CreditCard,
  MapPin,
  Calendar,
  AlertCircle,
  Store,
} from "lucide-react";
import { paymentsAPI } from "@/lib/api/payment";
import useCartStore from "@/store/cartStore";
import Image from "next/image";
import ProductImage from "@/components/ui/ProductImage";
import ShipmentProgress, { ReviewItemLink } from "@/components/shop/ShipmentProgress";
import { ORDER_STATUS_TH, carrierName, trackingUrl } from "@/lib/shipping";

const ORDER_STATUS = {
  PENDING: "รอการชำระเงิน",
  PAID: "ชำระเงินแล้ว",
  PROCESSING: "กำลังเตรียมสินค้า",
  SHIPPED: "จัดส่งแล้ว",
  DELIVERED: "ได้รับสินค้าแล้ว",
  CANCELLED: "ยกเลิกแล้ว",
};

const TRACKING_STATUS = {
  PENDING: "รอการจัดส่ง",
  PICKED_UP: "พนักงานรับพัสดุแล้ว",
  IN_TRANSIT: "กำลังขนส่ง",
  OUT_FOR_DELIVERY: "กำลังจัดส่ง",
  DELIVERED: "จัดส่งสำเร็จ",
  FAILED: "จัดส่งไม่สำเร็จ",
};

const PAYMENT_STATUS = {
  pending: "รอการชำระเงิน",
  processing: "กำลังยืนยันการชำระเงิน",
  completed: "ชำระเงินแล้ว",
  failed: "ชำระเงินไม่สำเร็จ",
  refunded: "คืนเงินแล้ว",
};

function getOrderProgressStatus(order, tracking) {
  if (order.paymentStatus === "pending") {
    return {
      label: "รอการชำระเงิน",
      color: "bg-surface-muted text-fg",
      icon: AlertCircle,
    };
  }
  if (order.paymentStatus === "failed") {
    return {
      label: "ชำระเงินไม่สำเร็จ",
      color: "bg-red-100 text-red-700",
      icon: XCircle,
    };
  }
  if (order.status === "cancelled") {
    return {
      label: "ยกเลิกแล้ว",
      color: "bg-red-100 text-red-700",
      icon: XCircle,
    };
  }
  if (order.paymentStatus === "completed" || order.paymentStatus === "paid") {
    if (
      tracking &&
      tracking.status &&
      tracking.status.toUpperCase() !== "PENDING"
    ) {
      const TRACKING_STATUS = {
        PICKED_UP: {
          label: "พนักงานรับพัสดุแล้ว",
          color: "bg-blue-100 text-fg",
          icon: Truck,
        },
        IN_TRANSIT: {
          label: "กำลังขนส่ง",
          color: "bg-yellow-100 text-yellow-700",
          icon: Loader2,
        },
        OUT_FOR_DELIVERY: {
          label: "กำลังจัดส่ง",
          color: "bg-yellow-100 text-yellow-700",
          icon: Truck,
        },
        DELIVERED: {
          label: "จัดส่งสำเร็จ",
          color: "bg-green-100 text-green-700",
          icon: CheckCircle,
        },
        FAILED: {
          label: "จัดส่งไม่สำเร็จ",
          color: "bg-red-100 text-red-700",
          icon: XCircle,
        },
      };
      return (
        TRACKING_STATUS[tracking.status?.toUpperCase()] || {
          label: tracking.status,
          color: "bg-surface-muted text-fg",
          icon: Truck,
        }
      );
    }
    // ถ้า tracking ไม่มี หรือยังเป็น PENDING
    return {
      label: "ชำระเงินแล้ว",
      color: "bg-green-100 text-green-700",
      icon: CheckCircle,
    };
  }
  // fallback
  return {
    label: "สถานะไม่ทราบ",
    color: "bg-surface-muted text-fg",
    icon: AlertCircle,
  };
}

const BADGE_TONE = {
  delivered: "bg-success-soft text-success",
  shipped: "bg-info-soft text-info",
  processing: "bg-info-soft text-info",
  paid: "bg-success-soft text-success",
  confirmed: "bg-success-soft text-success",
  pending: "bg-warning-soft text-warning",
  cancelled: "bg-surface-muted text-fg-muted",
  refunded: "bg-surface-muted text-fg-muted",
  refund_requested: "bg-warning-soft text-warning",
};

/** The order's own status (the shipment record may not exist yet). */
function OrderStatusBadge({ status, tracking }) {
  const legacy = getOrderProgressStatus(status, tracking);
  const progress = {
    ...legacy,
    label: ORDER_STATUS_TH[status?.status] ?? legacy.label,
    color: BADGE_TONE[status?.status] ?? legacy.color,
  };
  const Icon = progress.icon;
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold shadow-sm ${progress.color}`}
    >
      {" "}
      <Icon className="w-4 h-4" /> {progress.label}{" "}
    </span>
  );
}

function OrderItem({ item, canReview }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b last:border-b-0">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
        <ProductImage imageUrl={item.product?.imageUrl} alt={item.product?.name} fill className="object-cover" sizes="80px" />
      </div>
      <div className="flex-1">
        <div className="font-medium text-fg">{item.product.name}</div>
        <div className="text-xs text-fg-muted mb-1">
          {item.variant?.size}{" "}
          {item.variant?.color && `| ${item.variant.color}`}
        </div>
        <div className="text-sm text-fg">
          จำนวน: <span className="font-semibold">{item.quantity}</span>
        </div>
        {canReview && <ReviewItemLink productId={item.productId ?? item.product?.id} />}
      </div>
      <div className="text-right min-w-[80px]">
        <div className="text-fg font-bold text-base">
          ฿{item.price.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function OrderSummary({ order }) {
  return (
    <div className="bg-surface-muted rounded-xl p-5 mt-4 border">
      <div className="flex justify-between text-sm mb-1">
        <span>ราคาสินค้า</span>
        <span>฿{Number(order.subtotal).toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-sm mb-1">
        <span>{order.fulfillment === "pickup" ? "รับที่สาขา" : "ค่าจัดส่ง"}</span>
        <span>{order.fulfillment === "pickup" ? "ฟรี" : `฿${Number(order.shippingCost).toLocaleString()}`}</span>
      </div>
      <div className="flex justify-between text-sm mb-1">
        <span>VAT 7%</span>
        <span>฿{Number(order.tax).toLocaleString()}</span>
      </div>
      {Number(order.discount ?? order.discountAmount ?? 0) > 0 && (
        <div className="flex justify-between text-sm mb-1">
          <span>ส่วนลด</span>
          <span className="text-danger">
            -฿{Number(order.discount ?? order.discountAmount).toLocaleString()}
          </span>
        </div>
      )}
      <hr className="my-2" />
      <div className="flex justify-between text-lg font-bold">
        <span>ยอดรวม</span>
        <span className="text-fg">
          ฿{Number(order.total).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function ShippingInfo({ order, tracking }) {
  return (
    <div className="bg-surface rounded-xl shadow p-5 border flex flex-col gap-2">
      <div className="font-semibold text-fg mb-1 flex items-center gap-2">
        <Truck className="w-5 h-5 text-fg-subtle" /> ข้อมูลการจัดส่ง
      </div>
      <div className="text-sm text-fg">
        <MapPin className="w-4 h-4 inline-block mr-1 text-fg-subtle" />
        {order.shippingAddress
          ? `${order.shippingAddress.fullName} | ${
              order.shippingAddress.addressLine1 || ""
            } ${order.shippingAddress.subdistrict || ""} ${
              order.shippingAddress.district || ""
            } ${order.shippingAddress.province || ""} ${
              order.shippingAddress.postalCode || ""
            }`
          : "-"}
      </div>
      <div className="text-sm text-fg">
        เบอร์โทร: {order.shippingAddress?.phoneNumber || "-"}
      </div>
      {order.trackingNumber && (
        <div className="text-sm text-fg">
          เลขพัสดุ:{" "}
          <a href={trackingUrl(order.carrier, order.trackingNumber)} target="_blank" rel="noreferrer" className="font-mono underline underline-offset-2">
            {order.trackingNumber}
          </a>{" "}
          ({carrierName(order.carrier) || "ขนส่ง"})
        </div>
      )}
      {tracking && !order.trackingNumber && tracking.trackingNumber && (
        <>
          <div className="text-sm text-fg">
            เลขพัสดุ: {tracking.trackingNumber}
          </div>
          <div className="text-sm text-fg flex items-center gap-1">
            สถานะ:{" "}
            <span className="inline-block px-2 py-1 rounded bg-surface-muted text-fg text-xs font-semibold">
              {TRACKING_STATUS[tracking.status?.toUpperCase()] ||
                tracking.status}
            </span>
          </div>
          {tracking.estimatedDelivery && (
            <div className="text-sm text-fg">
              ประมาณวันถึง:{" "}
              {new Date(tracking.estimatedDelivery).toLocaleDateString()}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const PICKUP_STATUS = { pending: "กำลังเตรียมสินค้า", ready: "พร้อมให้รับ", collected: "รับสินค้าแล้ว" };

function PickupInfo({ order }) {
  const store = order.pickup?.store;
  return (
    <div className="bg-surface rounded-xl shadow p-5 border flex flex-col gap-2">
      <div className="font-semibold text-fg mb-1 flex items-center gap-2">
        <Store className="w-5 h-5 text-fg-subtle" /> รับที่สาขา
      </div>
      <div className="text-sm text-fg font-medium">{store?.name ?? "-"}</div>
      {store && (store.address || store.city) && (
        <div className="text-sm text-fg">
          <MapPin className="w-4 h-4 inline-block mr-1 text-fg-subtle" />
          {[store.address, store.city, store.postalCode].filter(Boolean).join(" ")}
        </div>
      )}
      {store?.phone && <div className="text-sm text-fg">เบอร์โทร: {store.phone}</div>}
      <div className="text-sm text-fg">
        สถานะ: {PICKUP_STATUS[order.pickup?.status] ?? "-"}
        {order.pickup?.pickupDate && ` (${new Date(order.pickup.pickupDate).toLocaleString("th-TH")})`}
      </div>
    </div>
  );
}

function PaymentInfo({ order }) {
  return (
    <div className="bg-surface rounded-xl shadow p-5 border flex flex-col gap-2">
      <div className="font-semibold text-fg mb-1 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-fg-subtle" /> ข้อมูลการชำระเงิน
      </div>
      <div className="text-sm text-fg">
        วิธีชำระเงิน: {order.paymentMethod && order.paymentMethod.name}
      </div>
      <div className="text-sm text-fg flex items-center gap-1">
        สถานะ:{" "}
        <span
          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
            order.paymentStatus === "completed"
              ? "bg-green-100 text-green-700"
              : order.paymentStatus === "failed"
              ? "bg-red-100 text-red-700"
              : "bg-surface-muted text-fg"
          }`}
        >
          {PAYMENT_STATUS[order.paymentStatus] || order.paymentStatus}
        </span>
      </div>
      <div className="text-sm text-fg">
        ชำระเงินเมื่อ:{" "}
        {order.paidAt ? new Date(order.paidAt).toLocaleString() : "-"}
      </div>
    </div>
  );
}

const cardInputClass = (error) =>
  `h-11 w-full rounded-lg border bg-surface px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-fg/10 ${
    error ? "border-danger focus:border-danger" : "border-border focus:border-fg"
  }`;

function CardField({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function PaymentModal({
  show,
  onClose,
  paymentMethod,
  setPaymentMethod,
  cardInfo,
  setCardInfo,
  cardErrors,
  isPaying,
  onPay,
}) {
  if (!show) return null;
  const field = (key, error) => ({
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `pay-${key}-error` : undefined,
    className: cardInputClass(error),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="pay-title" className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl sm:p-8">
        <button
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-xl text-fg-subtle hover:bg-fg/5 hover:text-fg"
          onClick={onClose}
          aria-label="ปิด"
        >
          ×
        </button>
        <h2 id="pay-title" className="mb-6 text-center text-xl font-bold text-fg">
          เลือกวิธีชำระเงิน
        </h2>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          aria-label="วิธีชำระเงิน"
          className={`${cardInputClass()} mb-5`}
        >
          <option value="credit_card">บัตรเครดิต/เดบิต</option>
          <option value="promptpay">PromptPay</option>
        </select>
        {paymentMethod === "credit_card" && (
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <CardField id="pay-number" label="หมายเลขบัตร" error={cardErrors.number}>
                <input
                  id="pay-number"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="0000 0000 0000 0000"
                  value={cardInfo.number}
                  onChange={(e) => setCardInfo((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
                  {...field("number", cardErrors.number)}
                />
              </CardField>
            </div>
            <div className="col-span-2">
              <CardField id="pay-name" label="ชื่อบนบัตร" error={cardErrors.name}>
                <input
                  id="pay-name"
                  autoComplete="cc-name"
                  placeholder="ชื่อ-นามสกุล (ภาษาอังกฤษ)"
                  value={cardInfo.name}
                  onChange={(e) => setCardInfo((c) => ({ ...c, name: e.target.value }))}
                  {...field("name", cardErrors.name)}
                />
              </CardField>
            </div>
            <CardField id="pay-expiry" label="วันหมดอายุ" error={cardErrors.expiry}>
              <input
                id="pay-expiry"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="ดด/ปป"
                value={cardInfo.exp}
                onChange={(e) => {
                  const value = e.target.value;
                  setCardInfo((c) => ({ ...c, exp: formatExpiry(value, c.exp) }));
                }}
                {...field("expiry", cardErrors.expiry)}
              />
            </CardField>
            <CardField id="pay-cvc" label="CVC" error={cardErrors.cvc}>
              <input
                id="pay-cvc"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                value={cardInfo.cvc}
                onChange={(e) => setCardInfo((c) => ({ ...c, cvc: formatCvc(e.target.value) }))}
                {...field("cvc", cardErrors.cvc)}
              />
            </CardField>
            {cardErrors.form && (
              <p role="alert" className="col-span-2 rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
                {cardErrors.form}
              </p>
            )}
          </div>
        )}
        {paymentMethod === "promptpay" && (
          <div className="mb-6 text-center text-fg-muted">
            <p>เมื่อกดยืนยัน จะสร้าง QR PromptPay สำหรับชำระเงิน</p>
          </div>
        )}
        <div className="mt-4 flex gap-3">
          <button
            className="flex-1 rounded-full bg-fg px-4 py-3 font-semibold text-canvas transition-colors hover:bg-fg/85 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onPay}
            disabled={isPaying}
          >
            {isPaying ? "กำลังชำระเงิน..." : "ยืนยันชำระเงิน"}
          </button>
          <button
            className="flex-1 rounded-full border border-border px-4 py-3 font-semibold text-fg transition-colors hover:bg-fg/5"
            onClick={onClose}
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}

const REFUND_REASONS = ["สินค้าชำรุดหรือเสียหาย", "ได้รับสินค้าไม่ตรงกับที่สั่ง", "ได้รับสินค้าไม่ครบ", "สินค้าไม่ตรงตามคำอธิบาย"];

/** Ask the shop for a refund of a delivered order. No money moves until an admin approves. */
function RefundModal({ order, onClose, onSent }) {
  const [choice, setChoice] = useState(REFUND_REASONS[0]);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const other = choice === "other";

  const submit = async (e) => {
    e.preventDefault();
    const reason = other ? details.trim() : [choice, details.trim()].filter(Boolean).join(": ");
    if (!reason) {
      setError("กรุณาบอกเหตุผลที่ขอคืนเงิน");
      return;
    }
    setSending(true);
    try {
      await orderAPI.refundOrder(order.id, { reason });
      toast.success("ส่งคำขอคืนเงินแล้ว ร้านจะตรวจสอบและแจ้งผลให้ทราบ");
      onSent();
    } catch (err) {
      setError(err.message || "ส่งคำขอไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-title"
        className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-xl text-fg-subtle hover:bg-fg/5 hover:text-fg"
          onClick={onClose}
          aria-label="ปิด"
        >
          ×
        </button>
        <h2 id="refund-title" className="mb-1 text-xl font-bold text-fg">
          ขอคืนเงิน
        </h2>
        <p className="mb-5 text-sm text-fg-muted">
          คำสั่งซื้อ #{order.orderNumber || order.id} ยอด ฿{Number(order.total).toLocaleString()}
        </p>
        <fieldset className="mb-4 space-y-2">
          <legend className="mb-2 text-sm font-medium text-fg">เหตุผล</legend>
          {[...REFUND_REASONS, "other"].map((value) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-fg">
              <input type="radio" name="refund-reason" value={value} checked={choice === value} onChange={() => setChoice(value)} />
              {value === "other" ? "อื่น ๆ" : value}
            </label>
          ))}
        </fieldset>
        <label htmlFor="refund-details" className="mb-1 block text-sm font-medium text-fg">
          รายละเอียด{other ? "" : " (ถ้ามี)"}
        </label>
        <textarea
          id="refund-details"
          rows={3}
          maxLength={800}
          value={details}
          onChange={(e) => {
            setDetails(e.target.value);
            setError("");
          }}
          placeholder="เช่น กล่องบุบ สินค้าแตก หรือได้สีผิด"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-fg focus:outline-none focus:ring-2 focus:ring-fg/10"
        />
        {error && (
          <p role="alert" className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <p className="mt-3 text-xs text-fg-muted">
          ร้านจะตรวจสอบคำขอก่อนคืนเงิน ถ้าอนุมัติ เงินจะคืนเข้าช่องทางที่ชำระไว้ หากต้องส่งรูปหรือส่งสินค้าคืน ทีมงานจะติดต่อทางแชท
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            disabled={sending}
            className="flex-1 rounded-full bg-fg px-4 py-3 font-semibold text-canvas transition-colors hover:bg-fg/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "กำลังส่ง..." : "ส่งคำขอ"}
          </button>
          <button
            type="button"
            className="flex-1 rounded-full border border-border px-4 py-3 font-semibold text-fg transition-colors hover:bg-fg/5"
            onClick={onClose}
          >
            ยกเลิก
          </button>
        </div>
      </form>
    </div>
  );
}

export default function OrderDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [isPaying, setIsPaying] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const addToCart = useCartStore((state) => state.addItem);
  const [cardErrors, setCardErrors] = useState({});
  const [cardInfo, setCardInfo] = useState({
    name: "",
    number: "",
    exp: "",
    cvc: "",
  });

  const loadOrderDetails = useCallback(async () => {
    try {
      // Tracking is optional: there is no shipment before the order ships.
      const [orderResponse, trackingResponse] = await Promise.all([
        orderAPI.getOrder(id),
        orderAPI.getOrderTracking(id).catch(() => null),
      ]);
      setOrder(orderResponse.data);
      setTracking(trackingResponse?.data ?? null);
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrderDetails();
  }, [loadOrderDetails]);

  // The orders list links here with ?refund=1 to open the refund form.
  useEffect(() => {
    if (order?.status !== "delivered") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("refund") !== "1") return;
    window.history.replaceState(null, "", window.location.pathname);
    setShowRefund(true);
  }, [order?.status]);

  // Back from the bank's 3-D Secure page: ask for the result now instead of
  // waiting for the webhook.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "return") return;
    window.history.replaceState(null, "", window.location.pathname);
    (async () => {
      try {
        const payments = await paymentsAPI.getOrderPayments(id);
        const latest = Array.isArray(payments) ? payments[0] : null;
        if (!latest) return;
        const status = await paymentsAPI.getPaymentStatus(latest.id);
        if (status?.status === "completed") toast.success("ชำระเงินสำเร็จ ขอบคุณที่สั่งซื้อ");
        else if (status?.status === "failed") toast.error("ธนาคารไม่อนุมัติการชำระเงิน ลองใหม่หรือใช้บัตรอื่น");
        else toast("กำลังรอผลจากธนาคาร สถานะจะอัปเดตอัตโนมัติ");
      } catch {
        // The webhook and the payment worker still settle it.
      } finally {
        loadOrderDetails();
      }
    })();
  }, [id, loadOrderDetails]);

  const handlePay = async () => {
    const card = { name: cardInfo.name, number: cardInfo.number, expiry: cardInfo.exp, cvc: cardInfo.cvc };
    if (paymentMethod === "credit_card") {
      const errors = validateCard(card);
      setCardErrors(errors);
      if (Object.keys(errors).length) return;
    }
    setIsPaying(true);
    try {
      const body = { orderId: order.id, method: paymentMethod };
      if (paymentMethod === "credit_card") {
        // Tokenized in the browser: the card number never reaches our server.
        try {
          body.cardToken = await createCardToken(card);
        } catch (e) {
          setCardErrors({ form: cardErrorMessage(e.message) });
          return;
        }
      }
      const result = await paymentsAPI.createPayment(body);
      const { payment, charge } = result?.data || {};
      if (charge?.authorizeUri) {
        // 3-D Secure: the bank's page returns here with ?payment=return.
        window.location.assign(charge.authorizeUri);
        return;
      }
      if (payment?.status === "completed") {
        toast.success("ชำระเงินสำเร็จ!");
        setShowPaymentModal(false);
        router.push("/orders");
      } else if (charge?.qrCodeUrl) {
        window.open(charge.qrCodeUrl, "_blank", "noopener");
        toast.success("สแกน QR เพื่อชำระเงิน สถานะจะอัปเดตเมื่อชำระแล้ว");
        setShowPaymentModal(false);
        loadOrderDetails();
      } else {
        toast("รอการยืนยันการชำระเงิน");
        setShowPaymentModal(false);
        loadOrderDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "ชำระเงินไม่สำเร็จ");
    } finally {
      setIsPaying(false);
    }
  };

  // Cancelled orders cannot be paid; put the same items back in the cart instead.
  const handleReorder = async () => {
    setIsReordering(true);
    const problems = [];
    for (const item of order.items) {
      try {
        await addToCart({
          id: item.productId ?? item.product?.id,
          name: item.product?.name,
          price: item.price,
          imageUrl: item.product?.imageUrl?.[0] || "/images/placeholder.svg",
          quantity: item.quantity,
          variantId: item.variantId ?? item.variant?.id,
          variant: item.variant,
          variantName: item.variant ? [item.variant.color, item.variant.size].filter(Boolean).join(" - ") : null,
        });
      } catch (err) {
        // e.g. not enough stock (the cart may already hold some) or no longer sold
        problems.push(`${item.product?.name ?? "สินค้า"}: ${err.message}`);
      }
    }
    setIsReordering(false);
    if (problems.length === order.items.length) {
      toast.error(["เพิ่มสินค้าลงตะกร้าไม่ได้", ...problems].join("\n"), { duration: 6000 });
      return;
    }
    if (problems.length > 0) toast(["เพิ่มลงตะกร้าแล้ว ยกเว้น:", ...problems].join("\n"), { duration: 6000 });
    else toast.success("เพิ่มสินค้าลงตะกร้าแล้ว");
    router.push("/cart");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-canvas to-surface animate-fade-in">
        <Loader2 className="w-14 h-14 text-fg-muted animate-spin mb-6" />
        <div className="w-40 h-6 bg-border rounded mb-2 animate-pulse" />
        <div className="w-24 h-4 bg-surface-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-surface animate-fade-in-up">
        <XCircle className="w-14 h-14 text-red-400 mb-6 animate-bounce" />
        <div className="text-xl text-fg-muted font-semibold">
          ไม่พบคำสั่งซื้อ
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-2 py-10 animate-fade-in space-y-8">
      {/* Header */}
      <div className="bg-surface rounded-xl shadow p-6 border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-8 h-8 text-fg-muted" />
            <span className="text-xl md:text-2xl font-extrabold text-fg">
              คำสั่งซื้อ #{order.orderNumber || order.id}
            </span>
          </div>
          <div className="text-xs text-fg-muted">
            สร้างเมื่อ: {new Date(order.createdAt).toLocaleString()}
          </div>
          {order.notes && (
            <div className="text-xs text-fg-subtle mt-1">
              หมายเหตุ: {order.notes}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <OrderStatusBadge status={order} tracking={tracking} />
          {order.paidAt && (
            <div className="flex items-center gap-1 text-xs text-fg-muted">
              <Calendar className="w-4 h-4" /> ชำระเงินเมื่อ:{" "}
              {new Date(order.paidAt).toLocaleString()}
            </div>
          )}
        </div>
      </div>
      <ShipmentProgress order={order} onChanged={loadOrderDetails} />
      {/* Pay again / order again */}
      {order.status === "pending" && order.paymentStatus === "processing" && (
        <div className="rounded-xl border border-info/30 bg-info-soft p-4 text-sm text-info" role="status">
          กำลังยืนยันผลการชำระเงินกับธนาคาร ไม่ต้องชำระซ้ำ ระบบจะอัปเดตสถานะให้อัตโนมัติ
        </div>
      )}
      {order.status === "pending" &&
        !["completed", "refunded", "partially_refunded", "processing"].includes(order.paymentStatus) && (
          <div className="bg-warning-soft border border-warning/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-warning">
              {order.paymentStatus === "failed"
                ? "การชำระเงินไม่สำเร็จ ลองชำระอีกครั้งได้"
                : "คำสั่งซื้อนี้ยังไม่ได้ชำระเงิน"}
              {order.paymentDeadline && (
                <span className="mt-0.5 block text-xs">
                  ชำระภายใน {new Date(order.paymentDeadline).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })} น.
                  มิฉะนั้นคำสั่งซื้อจะถูกยกเลิกอัตโนมัติ
                </span>
              )}
            </div>
            <button
              className="bg-fg hover:bg-fg/85 text-canvas px-5 py-2 rounded-lg font-semibold shadow"
              onClick={() => setShowPaymentModal(true)}
            >
              ชำระเงิน
            </button>
          </div>
        )}
      {order.status === "cancelled" && (
        <div className="bg-surface-muted border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-fg">
            คำสั่งซื้อนี้ถูกยกเลิกแล้ว ชำระเงินไม่ได้ สั่งซื้อสินค้าชุดเดิมใหม่ได้
          </div>
          <button
            className="bg-fg hover:bg-fg/85 text-canvas px-5 py-2 rounded-lg font-semibold shadow disabled:opacity-60"
            onClick={handleReorder}
            disabled={isReordering}
          >
            {isReordering ? "กำลังเพิ่มลงตะกร้า..." : "สั่งซื้ออีกครั้ง"}
          </button>
        </div>
      )}
      {order.status === "delivered" && order.paymentStatus === "completed" && (
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-fg">มีปัญหากับสินค้า? ขอคืนเงินได้ ร้านจะตรวจสอบและแจ้งผลให้ทราบ</div>
          <button
            className="border border-border hover:bg-fg/5 text-fg px-5 py-2 rounded-lg font-semibold"
            onClick={() => setShowRefund(true)}
          >
            ขอคืนเงิน
          </button>
        </div>
      )}
      {order.status === "refund_requested" && (
        <div className="rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm text-warning" role="status">
          <div className="font-semibold">ส่งคำขอคืนเงินแล้ว รอร้านตรวจสอบ</div>
          {order.refundReason && <div className="mt-1">เหตุผล: {order.refundReason}</div>}
        </div>
      )}
      {/* Order Items */}
      <div className="bg-surface rounded-xl shadow p-6 border">
        <div className="flex items-center gap-2 mb-4 text-lg font-bold text-fg">
          <Package className="w-5 h-5 text-fg-muted" /> สินค้าในคำสั่งซื้อ
        </div>
        {order.items.map((item) => (
          <OrderItem key={item.id} item={item} canReview={["delivered", "refund_requested"].includes(order.status)} />
        ))}
        {/* Order Summary under items */}
        <OrderSummary order={order} />
      </div>
      {/* Shipping & Payment Info */}
      <div className="grid md:grid-cols-2 gap-6">
        {order.fulfillment === "pickup" ? <PickupInfo order={order} /> : <ShippingInfo order={order} tracking={tracking} />}
        <PaymentInfo order={order} />
      </div>
      {showRefund && (
        <RefundModal
          order={order}
          onClose={() => setShowRefund(false)}
          onSent={() => {
            setShowRefund(false);
            loadOrderDetails();
          }}
        />
      )}
      {/* Payment Modal */}
      <PaymentModal
        show={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        cardInfo={cardInfo}
        setCardInfo={setCardInfo}
        cardErrors={cardErrors}
        isPaying={isPaying}
        onPay={handlePay}
      />
    </div>
  );
}
