"use client";
import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { PanelSkeleton } from "@/components/admin/ui/PanelSkeleton";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";

const ROLES = ["user", "admin", "moderator"];

const ROLE_BADGE = {
  admin: "bg-red-100 text-red-700",
  moderator: "bg-yellow-100 text-yellow-700",
  user: "bg-blue-100 text-blue-700",
};

function validateUserForm(form, isEdit) {
  const errors = {};
  if (!form.name.trim()) errors.name = "กรุณากรอกชื่อ";
  if (!form.email.trim()) errors.email = "กรุณากรอกอีเมล";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = "รูปแบบอีเมลไม่ถูกต้อง";
  if (!isEdit) {
    if (!form.password) errors.password = "กรุณากรอกรหัสผ่าน";
    else if (form.password.length < 8) errors.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัว";
  }
  if (!form.role) errors.role = "กรุณาเลือกบทบาท";
  return errors;
}

export function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [showForm, setShowForm] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState("user");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(null);
    const params = { page, limit, ...(search ? { search } : {}) };
    adminAPI
      .getUsers(params)
      .then((data) => {
        setUsers(data.users || []);
        setPagination(data.pagination || { total: 0, pages: 1 });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch users");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [page, limit, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const openCreate = () => {
    setForm({ name: "", email: "", password: "", role: "user" });
    setFormErrors({});
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setFormErrors((errs) => ({ ...errs, [e.target.name]: undefined }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = validateUserForm(form, false);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setSubmitting(true);
    try {
      await adminAPI.createUser(form);
      toast.success("สร้างผู้ใช้สำเร็จ");
      setShowForm(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setNewRole(user.role || "user");
    setShowRoleModal(true);
  };

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await adminAPI.updateUserRole(selectedUser.id, { role: newRole });
      toast.success("เปลี่ยน Role สำเร็จ");
      setShowRoleModal(false);
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
        <h2 className="text-2xl font-bold text-gray-800">จัดการผู้ใช้งาน</h2>
        <div className="flex gap-2 flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="ค้นหาชื่อ / อีเมล"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button
              type="submit"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm transition"
            >
              ค้นหา
            </button>
          </form>
          <button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            + เพิ่มผู้ใช้
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4 text-sm text-gray-500">
        ทั้งหมด {pagination.total ?? 0} ผู้ใช้
      </div>

      {/* Create User Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold mb-4">เพิ่มผู้ใช้งานใหม่</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  ชื่อ <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 ${formErrors.name ? "border-red-400" : "border-gray-300"}`}
                  placeholder="ชื่อผู้ใช้"
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  อีเมล <span className="text-red-500">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleFormChange}
                  className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 ${formErrors.email ? "border-red-400" : "border-gray-300"}`}
                  placeholder="email@example.com"
                />
                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  รหัสผ่าน <span className="text-red-500">*</span>
                </label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleFormChange}
                  className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 ${formErrors.password ? "border-red-400" : "border-gray-300"}`}
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                />
                {formErrors.password && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  บทบาท <span className="text-red-500">*</span>
                </label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleFormChange}
                  className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 ${formErrors.role ? "border-red-400" : "border-gray-300"}`}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {formErrors.role && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.role}</p>
                )}
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
                  {submitting ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => setShowRoleModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold mb-2">เปลี่ยน Role ผู้ใช้</h3>
            <p className="text-sm text-gray-500 mb-4">
              ผู้ใช้: <span className="font-semibold text-gray-700">{selectedUser.name}</span> ({selectedUser.email})
            </p>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRoleModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRoleChange}
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-60"
              >
                {submitting ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <PanelSkeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : users.length === 0 ? (
        <EmptyState
          title="ไม่พบผู้ใช้งาน"
          description="เพิ่มผู้ใช้คนแรก หรือปรับคำค้นหา"
          actionLabel="เพิ่มผู้ใช้"
          onAction={openCreate}
        />
      ) : (
        <div className="overflow-x-auto max-h-[70vh] rounded-xl shadow border border-border">
          <table className="min-w-full bg-surface text-sm">
            <thead className="sticky top-0 z-10 bg-surface-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-fg-muted">ชื่อ</th>
                <th className="px-4 py-3 text-left font-semibold text-fg-muted">อีเมล</th>
                <th className="px-4 py-3 text-center font-semibold text-fg-muted">Role</th>
                <th className="px-4 py-3 text-center font-semibold text-fg-muted">สถานะ</th>
                <th className="px-4 py-3 text-left font-semibold text-fg-muted">วันที่สมัคร</th>
                <th className="px-4 py-3 text-center font-semibold text-fg-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {user.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[user.role] || "bg-gray-100 text-gray-600"}`}
                      >
                        {user.role || "user"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                      >
                        {user.isActive ? "ใช้งาน" : "ปิดบัญชี"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("th-TH")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => openRoleModal(user)}
                          className="text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-2 py-1 rounded transition"
                        >
                          เปลี่ยน Role
                        </button>
                        <button
                          onClick={async () => {
                            const next = !user.isActive;
                            if (
                              !confirm(
                                `${next ? "ปลดล็อก" : "ระงับ"}บัญชี ${user.email}?`
                              )
                            )
                              return;
                            try {
                              await adminAPI.setUserActive(user.id, {
                                isActive: next,
                              });
                              toast.success(next ? "ปลดล็อกแล้ว" : "ระงับบัญชีแล้ว");
                              loadData();
                            } catch (err) {
                              toast.error(err.message || "ดำเนินการไม่สำเร็จ");
                            }
                          }}
                          className={`text-xs px-2 py-1 rounded transition ${
                            user.isActive
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {user.isActive ? "ระงับ" : "ปลดล็อก"}
                        </button>
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
        >
          ← ก่อนหน้า
        </button>
        <span className="text-sm text-gray-500">
          หน้า {page} / {pagination.pages || 1}
        </span>
        <button
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition"
          onClick={() => setPage((p) => Math.min(pagination.pages || 1, p + 1))}
          disabled={page >= (pagination.pages || 1)}
        >
          ถัดไป →
        </button>
      </div>
    </div>
  );
}
