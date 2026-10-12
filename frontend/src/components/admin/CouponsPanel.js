"use client";
import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { PanelSkeleton } from "@/components/admin/ui/PanelSkeleton";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";

const COUPON_TYPE_LABELS = {
  percentage: "ลด %",
  fixed_amount: "ลดเงิน (บาท)",
};

const initialForm = {
  code: "",
  type: "percentage",
  value: "",
  minPurchase: "",
  maxDiscount: "",
  startDate: "",
  endDate: "",
};

function validateCouponForm(form) {
  const errors = {};
  if (!form.code.trim()) errors.code = "กรุณากรอกรหัสคูปอง";
  else if (!/^[A-Z0-9_-]{3,20}$/.test(form.code.trim()))
    errors.code = "รหัสต้องเป็นตัวพิมพ์ใหญ่/ตัวเลข 3-20 ตัว";
  if (!form.value || isNaN(Number(form.value)) || Number(form.value) <= 0)
    errors.value = "กรุณากรอกมูลค่าที่ถูกต้อง";
  if (form.type === "percentage" && Number(form.value) > 100)
    errors.value = "ส่วนลด % ต้องไม่เกิน 100";
  if (form.minPurchase && isNaN(Number(form.minPurchase)))
    errors.minPurchase = "ต้องเป็นตัวเลข";
  if (form.maxDiscount && isNaN(Number(form.maxDiscount)))
    errors.maxDiscount = "ต้องเป็นตัวเลข";
  if (!form.startDate) errors.startDate = "กรุณาเลือกวันเริ่มต้น";
  if (!form.endDate) errors.endDate = "กรุณาเลือกวันสิ้นสุด";
  if (form.startDate && form.endDate && form.endDate <= form.startDate)
    errors.endDate = "วันสิ้นสุดต้องหลังวันเริ่มต้น";
  return errors;
}

export function CouponsPanel() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      adminAPI.getCouponStatistics().catch(() => null),
      adminAPI.getCoupons().catch(() => []),
    ])
      .then(([stats, couponsData]) => {
        setStatistics(stats);
        const list = Array.isArray(couponsData)
          ? couponsData
          : couponsData?.coupons || [];
        setCoupons(list);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch coupons");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingCoupon(null);
    setForm(initialForm);
    setFormErrors({});
    setShowForm(true);
  };

  const openEdit = (coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code || "",
      type: coupon.type || "percentage",
      value: coupon.value || "",
      minPurchase: coupon.minPurchase || "",
      maxDiscount: coupon.maxDiscount || "",
      startDate: coupon.startDate ? coupon.startDate.slice(0, 10) : "",
      endDate: coupon.endDate ? coupon.endDate.slice(0, 10) : "",
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setFormErrors((errs) => ({ ...errs, [e.target.name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateCouponForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        minPurchase: form.minPurchase ? Number(form.minPurchase) : null,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        startDate: form.startDate
          ? new Date(form.startDate).toISOString()
          : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      };
      if (editingCoupon) {
        await adminAPI.updateCoupon(editingCoupon.id, payload);
        toast.success("อัปเดตคูปองสำเร็จ");
      } else {
        await adminAPI.createCoupon(payload);
        toast.success("สร้างคูปองสำเร็จ");
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("ยืนยันการลบคูปองนี้?")) return;
    try {
      await adminAPI.deleteCoupon(id);
      toast.success("ลบคูปองสำเร็จ");
      loadData();
    } catch (err) {
      toast.error("ลบไม่สำเร็จ");
    }
  };

  const handleToggle = async (coupon) => {
    try {
      if (coupon.isActive) {
        await adminAPI.deactivateCoupon(coupon.id);
        toast.success("ปิดใช้งานคูปองแล้ว");
      } else {
        await adminAPI.activateCoupon(coupon.id);
        toast.success("เปิดใช้งานคูปองแล้ว");
      }
      loadData();
    } catch (err) {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">จัดการคูปองส่วนลด</h2>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          + เพิ่มคูปองใหม่
        </button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-blue-700">
              {statistics.totalCoupons ?? 0}
            </div>
            <div className="text-sm text-blue-600 mt-1">คูปองทั้งหมด</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-green-700">
              {statistics.activeCoupons ?? 0}
            </div>
            <div className="text-sm text-green-600 mt-1">คูปองที่ใช้งานอยู่</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-gray-700">
              {(statistics.totalCoupons ?? 0) - (statistics.activeCoupons ?? 0)}
            </div>
            <div className="text-sm text-gray-600 mt-1">คูปองที่ปิดอยู่</div>
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold mb-4">
              {editingCoupon ? "แก้ไขคูปอง" : "เพิ่มคูปองใหม่"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  รหัสคูปอง <span className="text-red-500">*</span>
                </label>
                <input
                  name="code"
                  value={form.code}
                  onChange={handleFormChange}
                  className={`w-full border rounded-lg px-3 py-2 mt-1 uppercase focus:outline-none focus:ring-2 focus:ring-blue-400 ${formErrors.code ? "border-red-400" : "border-gray-300"}`}
                  placeholder="เช่น WELCOME10"
                  disabled={!!editingCoupon}
                />
                {formErrors.code && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.code}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    ประเภทส่วนลด <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="percentage">ลด % (เปอร์เซ็นต์)</option>
                    <option value="fixed_amount">ลดเงิน (บาท)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    มูลค่า <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.value}
                    onChange={handleFormChange}
                    className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 ${formErrors.value ? "border-red-400" : "border-gray-300"}`}
                    placeholder={form.type === "percentage" ? "เช่น 10" : "เช่น 50"}
                  />
                  {formErrors.value && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.value}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    ยอดซื้อขั้นต่ำ (บาท)
                  </label>
                  <input
                    name="minPurchase"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minPurchase}
                    onChange={handleFormChange}
                    className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 ${formErrors.minPurchase ? "border-red-400" : "border-gray-300"}`}
                    placeholder="เช่น 100"
                  />
                  {formErrors.minPurchase && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.minPurchase}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    ส่วนลดสูงสุด (บาท)
                  </label>
                  <input
                    name="maxDiscount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.maxDiscount}
                    onChange={handleFormChange}
                    className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 ${formErrors.maxDiscount ? "border-red-400" : "border-gray-300"}`}
                    placeholder="ว่างหมายถึงไม่จำกัด"
                  />
                  {formErrors.maxDiscount && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.maxDiscount}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    วันเริ่มต้น <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={handleFormChange}
                    className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 ${formErrors.startDate ? "border-red-400" : "border-gray-300"}`}
                  />
                  {formErrors.startDate && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.startDate}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    วันสิ้นสุด <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={handleFormChange}
                    className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 ${formErrors.endDate ? "border-red-400" : "border-gray-300"}`}
                  />
                  {formErrors.endDate && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.endDate}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-60"
                >
                  {submitting ? "กำลังบันทึก..." : editingCoupon ? "บันทึกการแก้ไข" : "สร้างคูปอง"}
                </button>
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
      ) : coupons.length === 0 ? (
        <EmptyState
          title="ยังไม่มีคูปอง"
          description="สร้างคูปองแรกเพื่อใช้โปรโมชันกับลูกค้า"
          actionLabel="เพิ่มคูปองใหม่"
          onAction={openCreate}
        />
      ) : (
        <div className="overflow-x-auto max-h-[70vh] rounded-xl shadow border border-border">
          <table className="min-w-full bg-surface text-sm">
            <thead className="sticky top-0 z-10 bg-surface-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">รหัสคูปอง</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">ประเภท</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">มูลค่า</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">ซื้อขั้นต่ำ</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">ช่วงเวลา</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">สถานะ</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-surface-muted transition">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">
                      {coupon.code}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {COUPON_TYPE_LABELS[coupon.type] || coupon.type}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {coupon.type === "percentage"
                        ? `${Number(coupon.value).toFixed(0)}%`
                        : `฿${Number(coupon.value).toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {coupon.minPurchase ? `฿${Number(coupon.minPurchase).toFixed(0)}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {coupon.startDate
                        ? new Date(coupon.startDate).toLocaleDateString("th-TH")
                        : "-"}{" "}
                      →{" "}
                      {coupon.endDate
                        ? new Date(coupon.endDate).toLocaleDateString("th-TH")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${coupon.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                      >
                        {coupon.isActive ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(coupon)}
                          className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded transition"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleToggle(coupon)}
                          className={`text-xs px-2 py-1 rounded transition ${coupon.isActive ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
                        >
                          {coupon.isActive ? "ปิด" : "เปิด"}
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded transition"
                        >
                          ลบ
                        </button>
                      </div>
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
