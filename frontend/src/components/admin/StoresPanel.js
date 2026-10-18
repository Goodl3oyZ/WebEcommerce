"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { FaBoxes, FaEdit, FaPlusCircle, FaStore, FaTimesCircle } from "react-icons/fa";
import { adminAPI } from "@/lib/api/admin";
import { BranchStockDialog } from "@/components/admin/BranchStockDialog";

const EMPTY = { name: "", address: "", city: "", postalCode: "", phone: "", description: "", isActive: true };
const card = "rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6";
const input =
  "mt-1.5 block w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-fg focus:ring-fg";
const errorText = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

function Field({ id, label, children }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Branches customers can choose at checkout to collect their order (click & collect). */
export function StoresPanel() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [stockOf, setStockOf] = useState(null); // branch whose shelf is open

  const load = async () => {
    try {
      const res = await adminAPI.listStores();
      setStores(res?.items ?? []);
    } catch (err) {
      toast.error(`โหลดสาขาไม่สำเร็จ: ${errorText(err, "")}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("กรุณาใส่ชื่อสาขา");
    if (!form.address.trim()) return toast.error("กรุณาใส่ที่อยู่สาขา ลูกค้าต้องรู้ว่าจะไปรับที่ไหน");
    setSaving(true);
    const text = (value) => value.trim() || null;
    const payload = {
      name: form.name.trim(),
      address: text(form.address),
      city: text(form.city),
      postalCode: text(form.postalCode),
      phone: text(form.phone),
      description: text(form.description),
      isActive: form.isActive,
    };
    try {
      if (editingId) await adminAPI.updateStore(editingId, payload);
      else await adminAPI.createStore(payload);
      toast.success(editingId ? "บันทึกสาขาแล้ว" : "เพิ่มสาขาแล้ว");
      resetForm();
      load();
    } catch (err) {
      toast.error(errorText(err, "บันทึกไม่สำเร็จ"));
    } finally {
      setSaving(false);
    }
  };

  const edit = (s) => {
    setEditingId(s.id);
    setForm({
      name: s.name ?? "",
      address: s.address ?? "",
      city: s.city ?? "",
      postalCode: s.postalCode ?? "",
      phone: s.phone ?? "",
      description: s.description ?? "",
      isActive: s.isActive !== false,
    });
  };

  // Branches are closed, never deleted: past pickup orders still point at them.
  const toggle = async (s) => {
    const opening = s.isActive === false;
    if (!opening && !confirm(`ปิดสาขา "${s.name}"? ลูกค้าจะเลือกรับที่สาขานี้ไม่ได้ (ออเดอร์เดิมยังรับได้ตามปกติ)`)) return;
    try {
      await adminAPI.updateStore(s.id, { isActive: opening });
      toast.success(opening ? "เปิดสาขาแล้ว" : "ปิดสาขาแล้ว");
      load();
    } catch (err) {
      toast.error(errorText(err, "บันทึกไม่สำเร็จ"));
    }
  };

  const open = stores.filter((s) => s.isActive !== false).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <form className={`${card} space-y-5 self-start`} onSubmit={save} aria-labelledby="store-form-title">
        <h2 id="store-form-title" className="flex items-center gap-2 text-lg font-bold text-fg">
          <FaStore aria-hidden /> {editingId ? "แก้ไขสาขา" : "เพิ่มสาขา"}
        </h2>

        <Field id="store-name" label="ชื่อสาขา">
          <input id="store-name" className={input} value={form.name} maxLength={255} onChange={set("name")} placeholder="เช่น สาขาสยาม" />
        </Field>
        <Field id="store-address" label="ที่อยู่">
          <textarea id="store-address" rows={2} className={input} value={form.address} maxLength={500} onChange={set("address")} placeholder="เลขที่ อาคาร ถนน" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="store-city" label="จังหวัด">
            <input id="store-city" className={input} value={form.city} maxLength={100} onChange={set("city")} placeholder="กรุงเทพมหานคร" />
          </Field>
          <Field id="store-postal" label="รหัสไปรษณีย์">
            <input id="store-postal" inputMode="numeric" className={input} value={form.postalCode} maxLength={20} onChange={set("postalCode")} />
          </Field>
        </div>
        <Field id="store-phone" label="เบอร์โทร">
          <input id="store-phone" type="tel" className={input} value={form.phone} maxLength={20} onChange={set("phone")} placeholder="02-123-4567" />
        </Field>
        <Field id="store-desc" label="เวลาเปิด-ปิด และวิธีรับสินค้า">
          <textarea
            id="store-desc"
            rows={3}
            className={input}
            value={form.description}
            maxLength={2000}
            onChange={set("description")}
            placeholder="เช่น เปิดทุกวัน 10:00–20:00 รับสินค้าที่เคาน์เตอร์ชั้น 1"
          />
          <p className="mt-1 text-xs text-fg-muted">ลูกค้าเห็นข้อความนี้ตอนเลือกสาขาและในหน้าคำสั่งซื้อ</p>
        </Field>

        <label className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-fg">เปิดให้รับสินค้า</span>
            <span className="block text-xs text-fg-muted">ปิดไว้ ลูกค้าจะเลือกสาขานี้ตอนชำระเงินไม่ได้</span>
          </span>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="h-5 w-5"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-canvas hover:bg-fg/85 disabled:opacity-50"
          >
            {editingId ? <FaEdit aria-hidden /> : <FaPlusCircle aria-hidden />}
            {saving ? "กำลังบันทึก…" : editingId ? "บันทึก" : "เพิ่มสาขา"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-fg hover:bg-surface-muted"
            >
              <FaTimesCircle aria-hidden /> ยกเลิก
            </button>
          )}
        </div>
      </form>

      <section className={card} aria-labelledby="store-list-title">
        <h2 id="store-list-title" className="text-lg font-bold text-fg">
          สาขา ({stores.length})
        </h2>
        <p className="mb-4 mt-1 text-sm text-fg-muted">
          {open > 0
            ? `ลูกค้าเลือก "รับที่สาขา" ได้ ${open} สาขาตอนชำระเงิน`
            : "ยังไม่มีสาขาที่เปิดอยู่ หน้าชำระเงินจะมีแค่การจัดส่งถึงบ้าน"}
        </p>
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-muted" />
            ))}
          </div>
        ) : stores.length === 0 ? (
          <p className="py-10 text-center text-sm text-fg-muted">ยังไม่มีสาขา</p>
        ) : (
          <ul className="divide-y divide-border">
            {stores.map((s) => (
              <li key={s.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 py-3 ${editingId === s.id ? "bg-surface-muted/60" : ""}`}>
                <div className="min-w-0 flex-1 basis-56">
                  <p className="flex items-center gap-2 font-semibold text-fg">
                    <span className="truncate">{s.name}</span>
                    {s.isActive === false && (
                      <span className="shrink-0 rounded-full bg-fg/10 px-2 py-0.5 text-[11px] font-semibold text-fg-muted">ปิดอยู่</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-fg-muted">
                    {[s.address, s.city, s.postalCode].filter(Boolean).join(" ") || "—"}
                    {s.phone && ` · ${s.phone}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setStockOf(s)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-fg hover:bg-surface-muted"
                  >
                    <FaBoxes aria-hidden /> สต็อก<span className="sr-only"> {s.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => edit(s)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-fg hover:bg-surface-muted"
                  >
                    <FaEdit aria-hidden /> แก้ไข<span className="sr-only"> {s.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(s)}
                    className={`inline-flex h-9 items-center rounded-lg px-3 text-sm ${
                      s.isActive === false ? "text-fg hover:bg-surface-muted" : "text-danger hover:bg-danger-soft"
                    }`}
                  >
                    {s.isActive === false ? "เปิดสาขา" : "ปิดสาขา"}
                    <span className="sr-only"> {s.name}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {stockOf && <BranchStockDialog store={stockOf} onClose={() => setStockOf(null)} />}
    </div>
  );
}
