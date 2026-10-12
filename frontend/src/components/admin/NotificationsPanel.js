"use client";
import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { PanelSkeleton } from "@/components/admin/ui/PanelSkeleton";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";

const NOTIFICATION_TYPES = [
  { value: "order", label: "ออเดอร์" },
  { value: "payment", label: "การชำระเงิน" },
  { value: "shipping", label: "การจัดส่ง" },
  { value: "system", label: "ระบบ" },
  { value: "promotion", label: "โปรโมชัน" },
];

const PRIORITY_BADGE = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-600",
};

const PRIORITY_LABEL = {
  high: "สูง",
  medium: "ปานกลาง",
  low: "ต่ำ",
};

const TYPE_BADGE = {
  order: "bg-blue-100 text-blue-700",
  payment: "bg-green-100 text-green-700",
  shipping: "bg-purple-100 text-purple-700",
  system: "bg-gray-100 text-gray-700",
  promotion: "bg-orange-100 text-orange-700",
};

const initialForm = {
  type: "system",
  title: "",
  message: "",
  priority: "medium",
};

function validateNotifForm(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = "กรุณากรอกชื่อการแจ้งเตือน";
  if (!form.message.trim()) errors.message = "กรุณากรอกข้อความ";
  if (!form.type) errors.type = "กรุณาเลือกประเภท";
  return errors;
}

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(null);
    adminAPI
      .getNotifications()
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : data?.notifications || data?.data || [];
        setNotifications(list);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || "โหลดข้อมูลไม่สำเร็จ");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFormChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setFormErrors((errs) => ({ ...errs, [e.target.name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateNotifForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setSubmitting(true);
    try {
      await adminAPI.sendNotification({
        type: form.type,
        title: form.title.trim(),
        message: form.message.trim(),
        priority: form.priority,
      });
      toast.success("ส่งการแจ้งเตือนสำเร็จ");
      setShowForm(false);
      setForm(initialForm);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("ยืนยันการลบการแจ้งเตือนนี้?")) return;
    try {
      await adminAPI.deleteNotification(id);
      toast.success("ลบสำเร็จ");
      loadData();
    } catch (err) {
      toast.error("ลบไม่สำเร็จ");
    }
  };

  return (
    <div className="p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">จัดการการแจ้งเตือน</h2>
        <button
          onClick={() => { setForm(initialForm); setFormErrors({}); setShowForm(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          + ส่งการแจ้งเตือน
        </button>
      </div>

      {/* Create Notification Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
            >✕</button>
            <h3 className="text-lg font-bold mb-4">ส่งการแจ้งเตือนใหม่</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    ประเภท <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleFormChange}
                    className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 ${formErrors.type ? "border-red-400" : "border-gray-300"}`}
                  >
                    {NOTIFICATION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {formErrors.type && <p className="text-xs text-red-500 mt-1">{formErrors.type}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">ความสำคัญ</label>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="low">ต่ำ</option>
                    <option value="medium">ปานกลาง</option>
                    <option value="high">สูง</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  ชื่อ <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 ${formErrors.title ? "border-red-400" : "border-gray-300"}`}
                  placeholder="เช่น แจ้งเตือนโปรโมชันใหม่"
                />
                {formErrors.title && <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  ข้อความ <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleFormChange}
                  rows={3}
                  className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none ${formErrors.message ? "border-red-400" : "border-gray-300"}`}
                  placeholder="รายละเอียดการแจ้งเตือน..."
                />
                {formErrors.message && <p className="text-xs text-red-500 mt-1">{formErrors.message}</p>}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
                >ยกเลิก</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-60"
                >{submitting ? "กำลังส่ง..." : "ส่งการแจ้งเตือน"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <PanelSkeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="ยังไม่มีการแจ้งเตือน"
          description="ส่งการแจ้งเตือนแรกไปยังผู้ใช้ในระบบ"
          actionLabel="ส่งการแจ้งเตือน"
          onAction={() => {
            setForm(initialForm);
            setFormErrors({});
            setShowForm(true);
          }}
        />
      ) : (
        <div className="overflow-x-auto max-h-[70vh] rounded-xl shadow border border-border">
          <table className="min-w-full bg-surface text-sm">
            <thead className="sticky top-0 z-10 bg-surface-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">ชื่อ</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">ข้อความ</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">ประเภท</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">ความสำคัญ</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">วันที่</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-surface-muted transition">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate">{n.title}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[250px] truncate">{n.message}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[n.type] || "bg-gray-100 text-gray-600"}`}>
                        {NOTIFICATION_TYPES.find((t) => t.value === n.type)?.label || n.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_BADGE[n.priority] || "bg-gray-100 text-gray-600"}`}>
                        {PRIORITY_LABEL[n.priority] || n.priority || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString("th-TH") : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded transition"
                      >ลบ</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
