"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { orderAPI } from "@/lib/api/orders";
import { Package, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { ORDER_STATUS_TH, carrierName, trackingUrl } from "@/lib/shipping";

const STATUS_TONE = {
  pending: "bg-warning-soft text-warning",
  paid: "bg-success-soft text-success",
  confirmed: "bg-success-soft text-success",
  processing: "bg-info-soft text-info",
  shipped: "bg-info-soft text-info",
  delivered: "bg-success-soft text-success",
  refund_requested: "bg-warning-soft text-warning",
  cancelled: "bg-surface-muted text-fg-muted",
  refunded: "bg-surface-muted text-fg-muted",
};

const PAYMENT_STATUS_TH = {
  pending: "ยังไม่ชำระ",
  processing: "กำลังยืนยันการชำระเงิน",
  completed: "ชำระแล้ว",
  failed: "ชำระไม่สำเร็จ",
  refunded: "คืนเงินแล้ว",
  partially_refunded: "คืนเงินบางส่วน",
};

const button = "rounded-lg px-4 py-2 text-sm font-semibold transition-colors";

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        if (!user || !user.id) {
          setError("กรุณาเข้าสู่ระบบเพื่อดูคำสั่งซื้อของคุณ");
          return;
        }
        const response = await orderAPI.getOrders({
          page: currentPage,
          limit: 10,
        });
        const ordersArr = response.data?.orders || response.orders || [];
        setOrders(ordersArr);
        setTotalPages(response.data?.totalPages || response.totalPages || 1);
      } catch (err) {
        setError(err.message || "ไม่สามารถดึงข้อมูลคำสั่งซื้อได้");
        toast.error(err.message || "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchOrders();
  }, [user, currentPage]);

  // Only unpaid orders can be cancelled; paid ones go through a refund request.
  const handleCancelOrder = async (orderId) => {
    if (!confirm("ยืนยันการยกเลิกออเดอร์นี้?")) return;
    try {
      await orderAPI.cancelOrder(orderId, "user_cancel");
      toast.success("ยกเลิกออเดอร์สำเร็จ");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o))
      );
    } catch (err) {
      toast.error(err.message || "ยกเลิกไม่สำเร็จ");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin h-10 w-10 text-fg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-danger">
        <p>{error}</p>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-fg-subtle">
        <p>ยังไม่มีประวัติคำสั่งซื้อ</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:p-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <Package className="w-8 h-8 text-fg-muted" />
        <div>
          <h1 className="text-3xl font-extrabold text-fg">คำสั่งซื้อของฉัน</h1>
          <p className="text-fg-muted text-sm">ดูประวัติการสั่งซื้อและสถานะล่าสุด</p>
        </div>
      </div>
      <div className="space-y-6">
        {orders.map((order) => {
          const canCancel =
            order.status === "pending" && !["processing", "completed"].includes(order.paymentStatus);
          const canRefund = order.status === "delivered" && order.paymentStatus === "completed";
          return (
            <div key={order.id} className="bg-surface rounded-xl shadow p-6 border border-border">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                <div className="font-bold text-lg text-fg break-all">#{order.orderNumber || order.id}</div>
                <div className="text-fg-muted text-sm">
                  {new Date(order.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 items-center mb-3 text-sm text-fg">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    STATUS_TONE[order.status] ?? "bg-surface-muted text-fg"
                  }`}
                >
                  {ORDER_STATUS_TH[order.status] ?? order.status}
                </span>
                <span>
                  ชำระเงิน:{" "}
                  <span className="font-semibold">{PAYMENT_STATUS_TH[order.paymentStatus] ?? order.paymentStatus}</span>
                </span>
                <span>
                  ยอดรวม: <span className="font-semibold">฿{Number(order.total).toLocaleString()}</span>
                </span>
                {order.pickup?.store && (
                  <span>
                    รับที่สาขา: <span className="font-semibold">{order.pickup.store.name}</span>
                    {order.status === "processing" && order.pickup.status === "ready" && (
                      <span className="ml-2 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">พร้อมให้รับ</span>
                    )}
                  </span>
                )}
                {order.trackingNumber && (
                  <span>
                    เลขพัสดุ: <span className="font-mono font-semibold">{order.trackingNumber}</span>
                    {order.carrier && ` (${carrierName(order.carrier)})`}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/orders/${order.id}`} className={`${button} bg-fg text-canvas hover:bg-fg/85`}>
                  ดูรายละเอียด
                </Link>
                {order.trackingNumber && (
                  <a
                    href={trackingUrl(order.carrier, order.trackingNumber)}
                    target="_blank"
                    rel="noreferrer"
                    className={`${button} border border-border text-fg hover:bg-fg/5`}
                  >
                    ติดตามพัสดุ
                  </a>
                )}
                {canCancel && (
                  <button
                    className={`${button} border border-danger/40 text-danger hover:bg-danger/10`}
                    onClick={() => handleCancelOrder(order.id)}
                  >
                    ยกเลิกออเดอร์
                  </button>
                )}
                {canRefund && (
                  <Link
                    href={`/orders/${order.id}?refund=1`}
                    className={`${button} border border-border text-fg hover:bg-fg/5`}
                  >
                    ขอคืนเงิน
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-4 py-2 border rounded-lg bg-surface shadow-sm disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
          </button>
          <span className="px-4 py-2 text-fg font-medium">
            หน้า {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-4 py-2 border rounded-lg bg-surface shadow-sm disabled:opacity-50"
          >
            ถัดไป <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
