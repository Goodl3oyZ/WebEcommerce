"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { orderAPI } from "@/lib/api/orders";
import {
  Package,
  AlertCircle,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function Orders() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toast, setToast] = useState({ show: false, type: "", message: "" });

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
        setToast({
          show: true,
          type: "error",
          message: err.message || "เกิดข้อผิดพลาด",
        });
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchOrders();
  }, [user, currentPage]);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const getStatusBadge = (status) => {
    const map = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
      processing: { color: "bg-blue-100 text-blue-800", icon: ShoppingBag },
      shipped: { color: "bg-purple-100 text-purple-800", icon: Package },
      delivered: { color: "bg-green-100 text-green-800", icon: Package },
      cancelled: { color: "bg-red-100 text-red-800", icon: AlertCircle },
      refunded: { color: "bg-surface-muted text-fg", icon: AlertCircle },
    };
    const key = status?.toLowerCase();
    const badge = map[key] || map["pending"];
    const Icon = badge.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}
      >
        <Icon className="w-4 h-4" />
        {status}
      </span>
    );
  };

  // เพิ่มฟังก์ชันยกเลิกออเดอร์
  const handleCancelOrder = async (orderId) => {
    if (!confirm("ยืนยันการยกเลิกออเดอร์นี้?")) return;
    try {
      await orderAPI.cancelOrder(orderId, "user_cancel");
      setToast({ show: true, type: "success", message: "ยกเลิกออเดอร์สำเร็จ" });
      // รีเฟรชรายการ
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o))
      );
    } catch (err) {
      setToast({
        show: true,
        type: "error",
        message: err.message || "ยกเลิกไม่สำเร็จ",
      });
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
      <div className="flex flex-col items-center justify-center min-h-screen text-red-500">
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
    <div className="max-w-4xl mx-auto p-8 animate-fade-in">
      {/* Toast notification */}
      {toast.show && (
        <div
          className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg text-white text-base font-medium transition-all animate-fade-in-down ${
            toast.type === "error" ? "bg-red-500" : "bg-green-500"
          }`}
        >
          {toast.message}
        </div>
      )}
      <div className="flex items-center gap-3 mb-8 animate-fade-in-down">
        <Package className="w-8 h-8 text-fg-muted animate-bounce" />
        <div>
          <h1 className="text-3xl font-extrabold text-fg">
            คำสั่งซื้อของฉัน
          </h1>
          <p className="text-fg-muted text-sm">
            ดูประวัติการสั่งซื้อและสถานะล่าสุด
          </p>
        </div>
      </div>
      <div className="space-y-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-surface rounded-xl shadow p-6 border border-border"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
              <div className="font-bold text-lg text-fg">
                #{order.orderNumber || order.id}
              </div>
              <div className="text-fg-muted text-sm">
                {new Date(order.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 items-center mb-2">
              <span className="text-sm">
                สถานะ: <span className="font-semibold">{order.status}</span>
              </span>
              <span className="text-sm">
                ชำระเงิน:{" "}
                <span className="font-semibold">{order.paymentStatus}</span>
              </span>
              {order.trackingNumber && (
                <span className="text-sm">
                  เลขพัสดุ:{" "}
                  <span className="font-semibold">{order.trackingNumber}</span>
                </span>
              )}
              {order.estimatedDelivery && (
                <span className="text-sm">
                  ประมาณวันถึง:{" "}
                  <span className="font-semibold">
                    {new Date(order.estimatedDelivery).toLocaleDateString()}
                  </span>
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <Link
                href={`/orders/${order.id}`}
                className="bg-fg text-canvas px-4 py-2 rounded font-bold"
              >
                ดูรายละเอียด
              </Link>
              {/* TODO: ถ้ามี trackingNumber ให้ลิงก์ไป track shipment */}
              {order.trackingNumber && (
                <a
                  href={`https://track.thailandpost.co.th/?trackNumber=${order.trackingNumber}`}
                  target="_blank"
                  rel="noopener"
                  className="bg-fg text-canvas px-4 py-2 rounded font-bold"
                >
                  ติดตามพัสดุ
                </a>
              )}
              {/* TODO: ถ้าสถานะอนุญาตให้ยกเลิก/ขอคืนเงิน ให้แสดงปุ่ม */}
              {order.status === "pending" && (
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded font-bold"
                  onClick={() => handleCancelOrder(order.id)}
                >
                  ยกเลิกออเดอร์
                </button>
              )}
              {order.status === "delivered" && (
                <button className="bg-yellow-500 text-white px-4 py-2 rounded font-bold">
                  ขอคืนเงิน
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Pagination */}
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
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
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
