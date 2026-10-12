"use client";
import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { PanelSkeleton } from "@/components/admin/ui/PanelSkeleton";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";

const STATUS_BADGE = {
  pending: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-600",
  refunded: "bg-blue-100 text-blue-700",
};

const STATUS_LABEL = {
  pending: "รอดำเนินการ",
  completed: "สำเร็จ",
  failed: "ล้มเหลว",
  refunded: "คืนเงินแล้ว",
};

const METHOD_LABEL = {
  credit_card: "บัตรเครดิต",
  promptpay: "พร้อมเพย์",
  bank_transfer: "โอนเงิน",
  cash_on_delivery: "เก็บเงินปลายทาง",
};

export function PaymentsPanel() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [newStatus, setNewStatus] = useState("completed");
  const [submitting, setSubmitting] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const loadData = () => {
    setLoading(true);
    setError(null);
    adminAPI
      .getAllTransactions({ page, limit: 10, status: filterStatus || undefined })
      .then((data) => {
        setPayments(data.transactions || []);
        setPagination(data.pagination || { total: 0, pages: 1 });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || "โหลดข้อมูลไม่สำเร็จ");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [page, filterStatus]);

  const openStatusModal = (payment) => {
    setSelectedPayment(payment);
    setNewStatus(payment.status || "completed");
    setShowRefundModal(false);
  };

  const handleUpdateStatus = async () => {
    if (!selectedPayment) return;
    setSubmitting(true);
    try {
      await adminAPI.updatePaymentStatus(selectedPayment.id, newStatus);
      toast.success("อัปเดตสถานะสำเร็จ");
      setSelectedPayment(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedPayment) return;
    if (!refundAmount || isNaN(Number(refundAmount)) || Number(refundAmount) <= 0) {
      toast.error("กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }
    setSubmitting(true);
    try {
      await adminAPI.refundPayment(selectedPayment.id, {
        amount: Number(refundAmount),
        reason: refundReason,
      });
      toast.success("คืนเงินสำเร็จ");
      setSelectedPayment(null);
      setShowRefundModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-2">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">จัดการการชำระเงิน</h2>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600">กรองสถานะ:</label>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">ทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="completed">สำเร็จ</option>
            <option value="failed">ล้มเหลว</option>
            <option value="refunded">คืนเงินแล้ว</option>
          </select>
        </div>
      </div>

      {/* Stats summary */}
      <div className="mb-4 text-sm text-gray-500">
        ทั้งหมด {pagination.total ?? 0} รายการ
      </div>

      {/* Update Status Modal */}
      {selectedPayment && !showRefundModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => setSelectedPayment(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
            >✕</button>
            <h3 className="text-lg font-bold mb-2">อัปเดตสถานะการชำระเงิน</h3>
            <p className="text-xs text-gray-500 mb-3 font-mono">ID: {selectedPayment.id?.slice(0, 8)}...</p>
            <p className="text-sm text-gray-600 mb-4">
              ยอด: <span className="font-bold text-gray-800">
                ฿{Number(selectedPayment.amount || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
              </span>
            </p>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="pending">รอดำเนินการ</option>
              <option value="completed">สำเร็จ</option>
              <option value="failed">ล้มเหลว</option>
              <option value="refunded">คืนเงินแล้ว</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPayment(null)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
              >ยกเลิก</button>
              <button
                onClick={handleUpdateStatus}
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-60"
              >{submitting ? "กำลังบันทึก..." : "บันทึก"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {selectedPayment && showRefundModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => { setSelectedPayment(null); setShowRefundModal(false); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
            >✕</button>
            <h3 className="text-lg font-bold mb-2">คืนเงิน</h3>
            <p className="text-sm text-gray-600 mb-4">
              ยอดเต็ม: <span className="font-bold">฿{Number(selectedPayment.amount || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">จำนวนเงินที่คืน (บาท) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="เช่น 100"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">เหตุผล</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 h-20 resize-none"
                  placeholder="เหตุผลในการคืนเงิน..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setSelectedPayment(null); setShowRefundModal(false); }}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
              >ยกเลิก</button>
              <button
                onClick={handleRefund}
                disabled={submitting}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-60"
              >{submitting ? "กำลังดำเนินการ..." : "คืนเงิน"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <PanelSkeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : payments.length === 0 ? (
        <EmptyState
          title="ไม่มีรายการชำระเงิน"
          description="เมื่อมีการชำระเงิน รายการจะแสดงที่นี่"
        />
      ) : (
        <div className="overflow-x-auto max-h-[70vh] rounded-xl shadow border border-border">
          <table className="min-w-full bg-surface text-sm">
            <thead className="sticky top-0 z-10 bg-surface-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Transaction ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Order ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">วิธีชำระ</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">ยอด (บาท)</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">สถานะ</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">วันที่</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-muted transition">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.orderId?.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-gray-600">{METHOD_LABEL[p.paymentMethod] || p.paymentMethod || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {Number(p.amount || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[p.status] || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[p.status] || p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString("th-TH") : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setSelectedPayment(p); setShowRefundModal(false); }}
                          className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded transition"
                        >อัปเดต</button>
                        {p.status === "completed" && (
                          <button
                            onClick={() => { setSelectedPayment(p); setRefundAmount(""); setRefundReason(""); setShowRefundModal(true); }}
                            className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 px-2 py-1 rounded transition"
                          >คืนเงิน</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <button
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >← ก่อนหน้า</button>
        <span className="text-sm text-gray-500">หน้า {page} / {pagination.pages || 1}</span>
        <button
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition"
          onClick={() => setPage((p) => Math.min(pagination.pages || 1, p + 1))}
          disabled={page >= (pagination.pages || 1)}
        >ถัดไป →</button>
      </div>
    </div>
  );
}
