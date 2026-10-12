"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { FaEdit, FaImage, FaPlusCircle, FaTags, FaTimesCircle, FaTrash } from "react-icons/fa";
import { categoriesAPI } from "@/lib/api";
import { adminAPI } from "@/lib/api/admin";
import { uploadAPI } from "@/lib/api/upload";
import CategoryArt from "@/components/shop/CategoryArt";

const EMPTY = { name: "", description: "", imageUrl: null };
const card = "rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6";
const input =
  "mt-1.5 block w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-fg focus:ring-fg";

export function CategoriesPanel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const res = await categoriesAPI.getAllCategories();
      setCategories(res?.categories ?? []);
    } catch (e) {
      toast.error(`โหลดหมวดหมู่ไม่สำเร็จ: ${e?.response?.data?.message || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadAPI.uploadCategoryImage(file, editingId);
      setForm((f) => ({ ...f, imageUrl: res.url }));
      toast.success("อัปโหลดรูปแล้ว กดบันทึกเพื่อใช้รูปนี้");
    } catch (err) {
      toast.error(err?.response?.data?.message || "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("กรุณากรอกชื่อหมวดหมู่");
      return;
    }
    setSaving(true);
    const payload = { name: form.name.trim(), description: form.description, imageUrl: form.imageUrl };
    try {
      if (editingId) await adminAPI.updateCategory(editingId, payload);
      else await adminAPI.createCategory(payload);
      toast.success(editingId ? "บันทึกหมวดหมู่แล้ว" : "เพิ่มหมวดหมู่แล้ว");
      resetForm();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const edit = (c) => {
    setEditingId(c.id);
    setForm({ name: c.name, description: c.description ?? "", imageUrl: c.imageUrl ?? null });
  };

  const remove = async (c) => {
    if (!confirm(`ลบหมวดหมู่ "${c.name}"?`)) return;
    try {
      await adminAPI.deleteCategory(c.id);
      toast.success("ลบหมวดหมู่แล้ว");
      if (editingId === c.id) resetForm();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "ลบไม่สำเร็จ");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <form className={`${card} space-y-5 self-start`} onSubmit={save} aria-labelledby="cat-form-title">
        <h2 id="cat-form-title" className="flex items-center gap-2 text-lg font-bold text-fg">
          <FaTags aria-hidden /> {editingId ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}
        </h2>

        <div>
          <label htmlFor="cat-name" className="text-sm font-medium text-fg">
            ชื่อหมวดหมู่
          </label>
          <input
            id="cat-name"
            className={input}
            value={form.name}
            maxLength={255}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="เช่น รองเท้าวิ่ง, อุปกรณ์ฟิตเนส"
          />
        </div>

        <div>
          <label htmlFor="cat-desc" className="text-sm font-medium text-fg">
            คำอธิบาย
          </label>
          <textarea
            id="cat-desc"
            rows={3}
            className={input}
            value={form.description}
            maxLength={2000}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-fg">รูปหน้าปก</p>
          <div className="mt-2 grid grid-cols-[8rem_1fr] items-start gap-4">
            <div className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border">
              <CategoryArt category={{ name: form.name, description: form.description, imageUrl: form.imageUrl }} sizes="128px" />
            </div>
            <div className="space-y-2 text-xs text-fg-muted">
              <p>
                {form.imageUrl
                  ? "รูปนี้จะแสดงในหน้าแรก (Shop by category)"
                  : "ยังไม่มีรูป: หน้าร้านจะใช้ไอคอนที่เลือกจากชื่อหมวดแทน (ตามตัวอย่าง)"}
              </p>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 font-medium text-fg hover:bg-surface-muted">
                  <FaImage aria-hidden /> {uploading ? "กำลังอัปโหลด…" : form.imageUrl ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={onFile}
                    disabled={uploading}
                  />
                </label>
                {form.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imageUrl: null }))}
                    className="rounded-xl px-3 py-2 font-medium text-danger hover:bg-danger-soft"
                  >
                    เอารูปออก
                  </button>
                )}
              </div>
              <p className="text-fg-subtle">JPEG/PNG/WebP แนะนำแนวนอน 4:3 ขนาด 1200×900 ขึ้นไป</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || uploading}
            className="inline-flex items-center gap-2 rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-canvas hover:bg-fg/85 disabled:opacity-50"
          >
            {editingId ? <FaEdit aria-hidden /> : <FaPlusCircle aria-hidden />}
            {saving ? "กำลังบันทึก…" : editingId ? "บันทึก" : "เพิ่มหมวดหมู่"}
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

      <section className={card} aria-labelledby="cat-list-title">
        <h2 id="cat-list-title" className="mb-4 text-lg font-bold text-fg">
          หมวดหมู่ทั้งหมด ({categories.length})
        </h2>
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-muted" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="py-10 text-center text-sm text-fg-muted">ยังไม่มีหมวดหมู่</p>
        ) : (
          <ul className="divide-y divide-border">
            {categories.map((c) => (
              <li key={c.id} className={`flex items-center gap-4 py-3 ${editingId === c.id ? "bg-surface-muted/60" : ""}`}>
                <div className="group relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
                  <CategoryArt category={c} sizes="80px" className="[&_svg]:h-7 [&_svg]:w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-fg">{c.name}</p>
                  <p className="truncate text-xs text-fg-muted">
                    {c.productCount ?? 0} สินค้า{c.description ? ` · ${c.description}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => edit(c)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-fg hover:bg-surface-muted"
                  >
                    <FaEdit aria-hidden /> แก้ไข<span className="sr-only"> {c.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-danger hover:bg-danger-soft"
                  >
                    <FaTrash aria-hidden /> ลบ<span className="sr-only"> {c.name}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
