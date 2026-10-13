"use client";
import { createCardToken } from "@/lib/omise";

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
} from "lucide-react";
import { paymentsAPI } from "@/lib/api/payment";
import useCartStore from "@/store/cartStore";
import Image from "next/image";
import ProductImage from "@/components/ui/ProductImage";

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

function OrderStatusBadge({ status, tracking }) {
  const progress = getOrderProgressStatus(status, tracking);
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

function OrderItem({ item }) {
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
        <span>ค่าจัดส่ง</span>
        <span>฿{Number(order.shippingCost).toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-sm mb-1">
        <span>VAT 7%</span>
        <span>฿{Number(order.tax).toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-sm mb-1">
        <span>ส่วนลด</span>
        <span className="text-red-600">
          -฿{Number(order.discount).toLocaleString()}
        </span>
      </div>
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
      {tracking && (
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

function PaymentModal({
  show,
  onClose,
  paymentMethod,
  setPaymentMethod,
  cardInfo,
  setCardInfo,
  isPaying,
  onPay,
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-surface p-8 rounded-2xl shadow-2xl w-full max-w-md relative">
        <button
          className="absolute top-3 right-3 text-fg-subtle hover:text-fg text-xl font-bold"
          onClick={onClose}
          aria-label="ปิด"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-6 text-center text-fg">
          เลือกวิธีชำระเงิน
        </h2>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="mb-6 w-full border rounded-lg p-3 focus:ring-2 focus:ring-fg"
        >
          <option value="credit_card">บัตรเครดิต/เดบิต</option>
          <option value="promptpay">PromptPay</option>
        </select>
        {paymentMethod === "credit_card" && (
          <div className="space-y-3 mb-6">
            <input
              className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-fg"
              placeholder="ชื่อบนบัตร"
              value={cardInfo.name}
              onChange={(e) =>
                setCardInfo({ ...cardInfo, name: e.target.value })
              }
            />
            <input
              className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-fg"
              placeholder="หมายเลขบัตร"
              value={cardInfo.number}
              onChange={(e) =>
                setCardInfo({ ...cardInfo, number: e.target.value })
              }
              maxLength={16}
            />
            <div className="flex gap-2">
              <input
                className="w-1/2 border rounded-lg p-3 focus:ring-2 focus:ring-fg"
                placeholder="MM/YY"
                value={cardInfo.exp}
                onChange={(e) =>
                  setCardInfo({ ...cardInfo, exp: e.target.value })
                }
                maxLength={5}
              />
              <input
                className="w-1/2 border rounded-lg p-3 focus:ring-2 focus:ring-fg"
                placeholder="CVC"
                value={cardInfo.cvc}
                onChange={(e) =>
                  setCardInfo({ ...cardInfo, cvc: e.target.value })
                }
                maxLength={4}
              />
            </div>
          </div>
        )}
        {paymentMethod === "promptpay" && (
          <div className="mb-6 text-center text-fg-muted">
            <p>เมื่อกดยืนยัน จะสร้าง QR PromptPay สำหรับชำระเงิน</p>
          </div>
        )}
        <div className="flex gap-3 mt-4">
          <button
            className="flex-1 bg-fg hover:bg-fg/85 text-canvas px-4 py-3 rounded-lg font-bold shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={onPay}
            disabled={isPaying}
          >
            {isPaying ? "กำลังชำระเงิน..." : "ยืนยันชำระเงิน"}
          </button>
          <button
            className="flex-1 bg-border hover:bg-border text-fg px-4 py-3 rounded-lg font-semibold shadow transition-all"
            onClick={onClose}
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [isPaying, setIsPaying] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const addToCart = useCartStore((state) => state.addItem);
  const [cardInfo, setCardInfo] = useState({
    name: "",
    number: "",
    exp: "",
    cvc: "",
  });

  const loadOrderDetails = useCallback(async () => {
    try {
      const [orderResponse, trackingResponse] = await Promise.all([
        orderAPI.getOrder(id),
        orderAPI.getOrderTracking(id),
      ]);
      setOrder(orderResponse.data);
      setTracking(trackingResponse.data);
    } catch (error) {
      setToastMsg("ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrderDetails();
  }, [loadOrderDetails]);

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
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handlePay = async () => {
    setIsPaying(true);
    try {
      const body = { orderId: order.id, method: paymentMethod };
      if (paymentMethod === "credit_card") {
        // Tokenized in the browser: the card number never reaches our server.
        body.cardToken = await createCardToken({
          name: cardInfo.name,
          number: cardInfo.number,
          expiry: cardInfo.exp,
          cvc: cardInfo.cvc,
        });
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
      {/* Toast notification */}
      {showToast && (
        <div className="fixed top-8 right-8 z-50 px-8 py-4 rounded-xl shadow-lg text-white text-base font-semibold bg-red-500 transition-all animate-fade-in-down">
          {toastMsg}
        </div>
      )}
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
      {/* Order Items */}
      <div className="bg-surface rounded-xl shadow p-6 border">
        <div className="flex items-center gap-2 mb-4 text-lg font-bold text-fg">
          <Package className="w-5 h-5 text-fg-muted" /> สินค้าในคำสั่งซื้อ
        </div>
        {order.items.map((item) => (
          <OrderItem key={item.id} item={item} />
        ))}
        {/* Order Summary under items */}
        <OrderSummary order={order} />
      </div>
      {/* Shipping & Payment Info */}
      <div className="grid md:grid-cols-2 gap-6">
        <ShippingInfo order={order} tracking={tracking} />
        <PaymentInfo order={order} />
      </div>
      {/* Payment Modal */}
      <PaymentModal
        show={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        cardInfo={cardInfo}
        setCardInfo={setCardInfo}
        isPaying={isPaying}
        onPay={handlePay}
      />
    </div>
  );
}
