import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminAPI } from "@/lib/api";
import { ResponsiveTable } from "@/components/admin/ui/ResponsiveTable";
import { PanelSkeleton } from "@/components/admin/ui/PanelSkeleton";
import ErrorState from "@/components/ErrorState";
import { CARRIERS, ORDER_STATUS_TH, carrierName, trackingUrl } from "@/lib/shipping";

const STATUS_OPTIONS = [
  "all",
  "to_ship",
  "pending",
  "paid",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "refund_requested",
  "cancelled",
  "refunded",
];

// Mirrors backend/src/utils/orderStatus.js. "refunded" is reached by refunding
// the payment (Refund button), never by setting the status directly.
const NEXT_STATUS = {
  pending: ["processing", "cancelled"],
  paid: ["processing"],
  confirmed: ["processing", "cancelled"],
  processing: ["cancelled"],
  shipped: ["delivered"],
  delivered: [],
  refund_requested: ["delivered"],
  cancelled: [],
  refunded: [],
};

const REFUNDABLE_ORDER = ["paid", "confirmed", "processing", "delivered", "refund_requested"];
const CAN_PREPARE = ["paid", "confirmed"];
const CAN_SHIP = ["paid", "confirmed", "processing"];
const statusLabel = (s) => (s === "all" ? "ทุกสถานะ" : s === "to_ship" ? "รอจัดส่ง" : ORDER_STATUS_TH[s] ?? s);

/** Carrier + tracking number; shipping moves the order to "shipped" and tells the customer. */
function ShipDialog({ order, onClose, onShipped }) {
  const [carrier, setCarrier] = useState(order.carrier && CARRIERS.some((c) => c.id === order.carrier) ? order.carrier : "thailandpost");
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!tracking.trim()) return toast.error("กรอกเลขพัสดุ");
    setSaving(true);
    try {
      await adminAPI.updateShippingInfo(order.id, { carrier, trackingNumber: tracking.trim(), status: "shipped" });
      toast.success(`จัดส่งออเดอร์ ${order.orderNumber} แล้ว ลูกค้าได้รับแจ้งเตือน`);
      onShipped();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="ship-title" className="w-full max-w-md rounded-2xl bg-surface p-6">
        <h3 id="ship-title" className="text-lg font-bold">จัดส่งออเดอร์ {order.orderNumber}</h3>
        <p className="mt-1 text-sm text-fg-muted">ลูกค้าจะได้รับแจ้งเตือนพร้อมลิงก์ติดตามพัสดุ</p>
        <label htmlFor="ship-carrier" className="mt-5 block text-sm font-medium">ขนส่ง</label>
        <select id="ship-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm">
          {CARRIERS.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <label htmlFor="ship-tracking" className="mt-4 block text-sm font-medium">เลขพัสดุ</label>
        <input id="ship-tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} maxLength={100} autoFocus className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm uppercase tracking-wide" />
        <div className="mt-6 flex gap-2">
          <button type="button" className="flex-1 rounded-xl border border-border py-2.5" onClick={onClose}>ยกเลิก</button>
          <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-fg py-2.5 font-semibold text-canvas disabled:opacity-60">
            {saving ? "กำลังบันทึก..." : "ยืนยันจัดส่ง"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function OrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [status, setStatus] = useState("all");
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [selected, setSelected] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shipping, setShipping] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const params = {
      page,
      limit,
      ...(status !== "all" ? { status } : {}),
    };
    adminAPI
      .getAllOrders(params)
      .then((data) => {
        setOrders(data.orders || data.items || []);
        setPagination(data.pagination || data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch orders");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, [page, limit, status]);

  const changeStatus = async (order, newStatus) => {
    if (!newStatus) return;
    if (!confirm(`เปลี่ยนสถานะออเดอร์ ${order.orderNumber} เป็น "${statusLabel(newStatus)}"?`)) {
      return;
    }
    setSubmitting(true);
    try {
      await adminAPI.updateOrderStatus(order.id, newStatus);
      toast.success("อัปเดตสถานะแล้ว");
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.message || "เปลี่ยนสถานะไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  // Refund the order's online payment (money goes back through Omise).
  const refundOrder = async (order) => {
    const reason = prompt(`เหตุผลการคืนเงินออเดอร์ ${order.orderNumber}`, order.refundReason || "");
    if (!reason) return;
    setSubmitting(true);
    try {
      const payments = await adminAPI.getOrderPayments(order.id);
      const payment = payments.find((p) => ["completed", "partially_refunded"].includes(p.status));
      if (!payment) {
        toast.error("ไม่พบการชำระเงินที่คืนเงินได้สำหรับออเดอร์นี้");
        return;
      }
      await adminAPI.refundPayment(payment.id, { reason });
      toast.success("คืนเงินแล้ว");
      load();
    } catch (err) {
      toast.error(err.message || "คืนเงินไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: "orderNumber", header: "Order #", searchValue: (o) => o.orderNumber },
    {
      key: "user",
      header: "ลูกค้า",
      render: (o) => o.user?.name || o.userId,
      searchValue: (o) => o.user?.name || o.userId,
    },
    {
      key: "status",
      header: "สถานะ",
      render: (o) => (
        <span>
          {statusLabel(o.status)}
          {o.trackingNumber && (
            <a href={trackingUrl(o.carrier, o.trackingNumber)} target="_blank" rel="noreferrer" className="block text-xs text-fg-subtle underline underline-offset-2">
              {carrierName(o.carrier)} {o.trackingNumber}
            </a>
          )}
        </span>
      ),
      searchValue: (o) => `${statusLabel(o.status)} ${o.trackingNumber ?? ""}`,
    },
    {
      key: "total",
      header: "ยอดรวม",
      render: (o) => o.totalAmount || o.total,
      searchValue: (o) => o.totalAmount || o.total,
    },
    {
      key: "createdAt",
      header: "วันที่",
      render: (o) => new Date(o.createdAt).toLocaleString("th-TH"),
    },
    {
      key: "actions",
      header: "จัดการ",
      render: (order) => {
        const options = NEXT_STATUS[order.status] || [];
        return (
          <div className="flex flex-wrap justify-end gap-2 md:justify-start">
            {CAN_PREPARE.includes(order.status) && (
              <button type="button" className="font-semibold text-fg hover:underline" disabled={submitting} onClick={() => changeStatus(order, "processing")}>
                เริ่มเตรียมสินค้า
              </button>
            )}
            {CAN_SHIP.includes(order.status) && (
              <button type="button" className="font-semibold text-fg hover:underline" onClick={() => setShipping(order)}>
                จัดส่ง
              </button>
            )}
            <button
              type="button"
              className="text-info hover:underline"
              onClick={() => {
                setSelected(order);
                setNextStatus(options[0] || "");
              }}
            >
              ดู/เปลี่ยนสถานะ
            </button>
            {REFUNDABLE_ORDER.includes(order.status) &&
              order.paymentStatus === "completed" && (
              <button
                type="button"
                className="text-warning hover:underline"
                disabled={submitting}
                onClick={() => refundOrder(order)}
              >
                Refund
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-fg">จัดการออเดอร์</h2>
        <select
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <PanelSkeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <ResponsiveTable
          columns={columns}
          data={orders}
          emptyTitle="ยังไม่มีออเดอร์"
          emptyDescription="เมื่อลูกค้าสั่งซื้อ ออเดอร์จะแสดงที่นี่"
          searchPlaceholder="ค้นหาเลขออเดอร์หรือชื่อลูกค้า"
        />
      )}
      <div className="mt-4 flex items-center justify-between">
        <button
          className="rounded-xl border border-border px-3 py-2 text-sm disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          ก่อนหน้า
        </button>
        <span className="text-sm text-fg-muted">
          หน้า {page} / {pagination.pages || 1}
        </span>
        <button
          className="rounded-xl border border-border px-3 py-2 text-sm disabled:opacity-50"
          onClick={() =>
            setPage((p) => Math.min(pagination.pages || 1, p + 1))
          }
          disabled={page >= (pagination.pages || 1)}
        >
          ถัดไป
        </button>
      </div>

      {shipping && (
        <ShipDialog
          order={shipping}
          onClose={() => setShipping(null)}
          onShipped={() => {
            setShipping(null);
            load();
          }}
        />
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6">
            <h3 className="mb-2 text-lg font-bold">ออเดอร์ {selected.orderNumber}</h3>
            <p className="mb-4 text-sm text-fg-muted">
              สถานะปัจจุบัน: {statusLabel(selected.status)}
            </p>
            {(NEXT_STATUS[selected.status] || []).length === 0 ? (
              <p className="text-sm text-fg-muted">ไม่สามารถเปลี่ยนสถานะต่อได้</p>
            ) : (
              <select
                className="mb-4 w-full rounded-xl border border-border px-3 py-2"
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
              >
                {(NEXT_STATUS[selected.status] || []).map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-border py-2"
                onClick={() => setSelected(null)}
              >
                ปิด
              </button>
              {(NEXT_STATUS[selected.status] || []).length > 0 && (
                <button
                  type="button"
                  disabled={submitting || !nextStatus}
                  className="flex-1 rounded-xl bg-fg py-2 text-canvas disabled:opacity-60"
                  onClick={() => changeStatus(selected, nextStatus)}
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
