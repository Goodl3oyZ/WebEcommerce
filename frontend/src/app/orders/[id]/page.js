"use client";

import { useState, useEffect } from "react";
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
  completed: "ชำระเงินแล้ว",
  failed: "ชำระเงินไม่สำเร็จ",
  refunded: "คืนเงินแล้ว",
};

function getOrderProgressStatus(order, tracking) {
  if (order.paymentStatus === "pending") {
    return {
      label: "รอการชำระเงิน",
      color: "bg-gray-100 text-gray-700",
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
          color: "bg-blue-100 text-blue-700",
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
          color: "bg-gray-100 text-gray-700",
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
    color: "bg-gray-100 text-gray-700",
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
      <img
        src={item.product.imageUrl?.[0] || "/placeholder.png"}
        alt={item.product.name}
        className="w-20 h-20 object-cover rounded border shadow-sm"
      />
      <div className="flex-1">
        <div className="font-medium text-gray-900">{item.product.name}</div>
        <div className="text-xs text-gray-500 mb-1">
          {item.variant?.size}{" "}
          {item.variant?.color && `| ${item.variant.color}`}
        </div>
        <div className="text-sm text-gray-700">
          จำนวน: <span className="font-semibold">{item.quantity}</span>
        </div>
      </div>
      <div className="text-right min-w-[80px]">
        <div className="text-indigo-700 font-bold text-base">
          ฿{item.price.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function OrderSummary({ order }) {
  return (
    <div className="bg-gray-50 rounded-xl p-5 mt-4 border">
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
        <span className="text-indigo-800">
          ฿{Number(order.total).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function ShippingInfo({ order, tracking }) {
  return (
    <div className="bg-white rounded-xl shadow p-5 border flex flex-col gap-2">
      <div className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <Truck className="w-5 h-5 text-indigo-400" /> ข้อมูลการจัดส่ง
      </div>
      <div className="text-sm text-gray-700">
        <MapPin className="w-4 h-4 inline-block mr-1 text-indigo-300" />
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
      <div className="text-sm text-gray-700">
        เบอร์โทร: {order.shippingAddress?.phoneNumber || "-"}
      </div>
      {tracking && (
        <>
          <div className="text-sm text-gray-700">
            เลขพัสดุ: {tracking.trackingNumber}
          </div>
          <div className="text-sm text-gray-700 flex items-center gap-1">
            สถานะ:{" "}
            <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-semibold">
              {TRACKING_STATUS[tracking.status?.toUpperCase()] ||
                tracking.status}
            </span>
          </div>
          {tracking.estimatedDelivery && (
            <div className="text-sm text-gray-700">
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
    <div className="bg-white rounded-xl shadow p-5 border flex flex-col gap-2">
      <div className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-indigo-400" /> ข้อมูลการชำระเงิน
      </div>
      <div className="text-sm text-gray-700">
        วิธีชำระเงิน: {order.paymentMethod && order.paymentMethod.name}
      </div>
      <div className="text-sm text-gray-700 flex items-center gap-1">
        สถานะ:{" "}
        <span
          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
            order.paymentStatus === "completed"
              ? "bg-green-100 text-green-700"
              : order.paymentStatus === "failed"
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {PAYMENT_STATUS[order.paymentStatus] || order.paymentStatus}
        </span>
      </div>
      <div className="text-sm text-gray-700">
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
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md relative">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl font-bold"
          onClick={onClose}
          aria-label="ปิด"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-6 text-center text-gray-800">
          เลือกวิธีชำระเงิน
        </h2>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="mb-6 w-full border rounded-lg p-3 focus:ring-2 focus:ring-indigo-400"
        >
          <option value="credit_card">บัตรเครดิต/เดบิต</option>
          <option value="promptpay">PromptPay</option>
        </select>
        {paymentMethod === "credit_card" && (
          <div className="space-y-3 mb-6">
            <input
              className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-indigo-400"
              placeholder="ชื่อบนบัตร"
              value={cardInfo.name}
              onChange={(e) =>
                setCardInfo({ ...cardInfo, name: e.target.value })
              }
            />
            <input
              className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-indigo-400"
              placeholder="หมายเลขบัตร"
              value={cardInfo.number}
              onChange={(e) =>
                setCardInfo({ ...cardInfo, number: e.target.value })
              }
              maxLength={16}
            />
            <div className="flex gap-2">
              <input
                className="w-1/2 border rounded-lg p-3 focus:ring-2 focus:ring-indigo-400"
                placeholder="MM/YY"
                value={cardInfo.exp}
                onChange={(e) =>
                  setCardInfo({ ...cardInfo, exp: e.target.value })
                }
                maxLength={5}
              />
              <input
                className="w-1/2 border rounded-lg p-3 focus:ring-2 focus:ring-indigo-400"
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
          <div className="mb-6 text-center text-gray-600">
            <p>เมื่อกดยืนยัน จะสร้าง QR PromptPay สำหรับชำระเงิน</p>
          </div>
        )}
        <div className="flex gap-3 mt-4">
          <button
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg font-bold shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={onPay}
            disabled={isPaying}
          >
            {isPaying ? "กำลังชำระเงิน..." : "ยืนยันชำระเงิน"}
          </button>
          <button
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-3 rounded-lg font-semibold shadow transition-all"
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
  const [cardInfo, setCardInfo] = useState({
    name: "",
    number: "",
    exp: "",
    cvc: "",
  });

  useEffect(() => {
    loadOrderDetails();
  }, [id]);
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const loadOrderDetails = async () => {
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
  };

  const handlePay = async () => {
    setIsPaying(true);
    try {
      let paymentDetails = {};
      if (paymentMethod === "credit_card") {
        const [mm, yy] = cardInfo.exp.split("/");
        const tokenRes = await paymentsAPI.createToken({
          name: cardInfo.name,
          number: cardInfo.number,
          expiration_month: mm,
          expiration_year: yy.length === 2 ? "20" + yy : yy,
          security_code: cardInfo.cvc,
        });
        paymentDetails = { cardToken: tokenRes.id };
      }
      await paymentsAPI.createPayment({
        orderId: order.id,
        method: paymentMethod,
        amount: order.total,
        paymentDetails,
      });
      toast.success("ชำระเงินสำเร็จ!");
      setShowPaymentModal(false);
      router.push("/orders");
    } catch (err) {
      toast.error("ชำระเงินไม่สำเร็จ");
    } finally {
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-white animate-fade-in">
        <Loader2 className="w-14 h-14 text-indigo-500 animate-spin mb-6" />
        <div className="w-40 h-6 bg-gray-200 rounded mb-2 animate-pulse" />
        <div className="w-24 h-4 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-white animate-fade-in-up">
        <XCircle className="w-14 h-14 text-red-400 mb-6 animate-bounce" />
        <div className="text-xl text-gray-600 font-semibold">
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
      <div className="bg-white rounded-xl shadow p-6 border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-8 h-8 text-indigo-500" />
            <span className="text-xl md:text-2xl font-extrabold text-gray-900">
              คำสั่งซื้อ #{order.orderNumber || order.id}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            สร้างเมื่อ: {new Date(order.createdAt).toLocaleString()}
          </div>
          {order.notes && (
            <div className="text-xs text-gray-400 mt-1">
              หมายเหตุ: {order.notes}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <OrderStatusBadge status={order} tracking={tracking} />
          {order.paidAt && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="w-4 h-4" /> ชำระเงินเมื่อ:{" "}
              {new Date(order.paidAt).toLocaleString()}
            </div>
          )}
        </div>
      </div>
      {/* Order Items */}
      <div className="bg-white rounded-xl shadow p-6 border">
        <div className="flex items-center gap-2 mb-4 text-lg font-bold text-gray-800">
          <Package className="w-5 h-5 text-indigo-500" /> สินค้าในคำสั่งซื้อ
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
