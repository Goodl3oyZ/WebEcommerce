"use client";
import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { PanelSkeleton } from "@/components/admin/ui/PanelSkeleton";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";

const ROLES = ["user", "admin", "moderator"];

const ROLE_BADGE = {
  admin: "bg-danger-soft text-danger",
  moderator: "bg-warning-soft text-warning",
  user: "bg-surface-muted text-fg",
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
        <h2 className="text-2xl font-bold text-fg">จัดการผู้ใช้งาน</h2>
        <div className="flex gap-2 flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fg"
              placeholder="ค้นหาชื่อ / อีเมล"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button
              type="submit"
              className="bg-surface-muted hover:bg-border text-fg px-3 py-2 rounded-lg text-sm transition"
            >
              ค้นหา
            </button>
          </form>
          <button
            onClick={openCreate}
            className="bg-fg hover:bg-fg text-canvas px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            + เพิ่มผู้ใช้
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4 text-sm text-fg-muted">
        ทั้งหมด {pagination.total ?? 0} ผู้ใช้
      </div>

      {/* Create User Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-fg-subtle hover:text-fg-muted text-xl"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold mb-4">เพิ่มผู้ใช้งานใหม่</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-fg">
                  ชื่อ <span className="text-danger">*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-fg ${formErrors.name ? "border-danger" : "border-border"}`}
                  placeholder="ชื่อผู้ใช้"
                />
                {formErrors.name && (
                  <p className="text-xs text-danger mt-1">{formErrors.name}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-fg">
                  อีเมล <span className="text-danger">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleFormChange}
                  className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-fg ${formErrors.email ? "border-danger" : "border-border"}`}
                  placeholder="email@example.com"
                />
                {formErrors.email && (
                  <p className="text-xs text-danger mt-1">{formErrors.email}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-fg">
                  รหัสผ่าน <span className="text-danger">*</span>
                </label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleFormChange}
                  className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-fg ${formErrors.password ? "border-danger" : "border-border"}`}
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                />
                {formErrors.password && (
                  <p className="text-xs text-danger mt-1">{formErrors.password}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-fg">
                  บทบาท <span className="text-danger">*</span>
                </label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleFormChange}
                  className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-fg ${formErrors.role ? "border-danger" : "border-border"}`}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {formErrors.role && (
                  <p className="text-xs text-danger mt-1">{formErrors.role}</p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-border text-fg px-4 py-2 rounded-lg hover:bg-surface-muted transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-fg hover:bg-fg text-canvas px-4 py-2 rounded-lg font-medium transition disabled:opacity-60"
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
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => setShowRoleModal(false)}
              className="absolute top-4 right-4 text-fg-subtle hover:text-fg-muted text-xl"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold mb-2">เปลี่ยน Role ผู้ใช้</h3>
            <p className="text-sm text-fg-muted mb-4">
              ผู้ใช้: <span className="font-semibold text-fg">{selectedUser.name}</span> ({selectedUser.email})
            </p>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-fg"
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
                className="flex-1 border border-border text-fg px-4 py-2 rounded-lg hover:bg-surface-muted transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRoleChange}
                disabled={submitting}
                className="flex-1 bg-fg hover:bg-fg text-canvas px-4 py-2 rounded-lg font-medium transition disabled:opacity-60"
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
                  <tr key={user.id} className="hover:bg-surface-muted transition">
                    <td className="px-4 py-3 font-medium text-fg">
                      {user.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{user.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[user.role] || "bg-surface-muted text-fg-muted"}`}
                      >
                        {user.role || "user"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${user.isActive ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}
                      >
                        {user.isActive ? "ใช้งาน" : "ปิดบัญชี"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-fg-muted text-xs">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("th-TH")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => openRoleModal(user)}
                          className="text-xs bg-warning-soft text-warning hover:bg-warning-soft px-2 py-1 rounded transition"
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
                              ? "bg-danger-soft text-danger"
                              : "bg-success-soft text-success"
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
          className="px-4 py-2 border border-border rounded-lg text-sm disabled:opacity-40 hover:bg-surface-muted transition"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          ← ก่อนหน้า
        </button>
        <span className="text-sm text-fg-muted">
          หน้า {page} / {pagination.pages || 1}
        </span>
        <button
          className="px-4 py-2 border border-border rounded-lg text-sm disabled:opacity-40 hover:bg-surface-muted transition"
          onClick={() => setPage((p) => Math.min(pagination.pages || 1, p + 1))}
          disabled={page >= (pagination.pages || 1)}
        >
          ถัดไป →
        </button>
      </div>
    </div>
  );
}
