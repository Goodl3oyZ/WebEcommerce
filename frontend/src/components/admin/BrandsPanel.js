"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { FaBuilding, FaEdit, FaImage, FaPlusCircle, FaTimesCircle, FaTrash } from "react-icons/fa";
import { brandsAPI } from "@/lib/api";
import { adminAPI } from "@/lib/api/admin";
import { uploadAPI } from "@/lib/api/upload";
import EntityThumb from "@/components/admin/ui/EntityThumb";

const EMPTY = { name: "", description: "", logo: null, website: "", isActive: true };
const card = "rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6";
const input =
  "mt-1.5 block w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-fg focus:ring-fg";
const errorText = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

export function BrandsPanel() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const res = await brandsAPI.getAllBrands();
      setBrands(res?.brands ?? []);
    } catch (err) {
      toast.error(`โหลดแบรนด์ไม่สำเร็จ: ${errorText(err, "")}`);
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
      const res = await uploadAPI.uploadBrandLogo(file);
      setForm((f) => ({ ...f, logo: res.url }));
      toast.success("อัปโหลดโลโก้แล้ว กดบันทึกเพื่อใช้รูปนี้");
    } catch (err) {
      toast.error(errorText(err, "อัปโหลดโลโก้ไม่สำเร็จ"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return toast.error("ชื่อแบรนด์ต้องมีอย่างน้อย 2 ตัวอักษร");
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      logo: form.logo || null,
      website: form.website?.trim() || "",
      isActive: form.isActive,
    };
    try {
      if (editingId) await adminAPI.updateBrand(editingId, payload);
      else await adminAPI.createBrand(payload);
      toast.success(editingId ? "บันทึกแบรนด์แล้ว" : "เพิ่มแบรนด์แล้ว");
      resetForm();
      load();
    } catch (err) {
      toast.error(errorText(err, "บันทึกไม่สำเร็จ"));
    } finally {
      setSaving(false);
    }
  };

  const edit = (b) => {
    setEditingId(b.id);
    setForm({
      name: b.name,
      description: b.description ?? "",
      logo: b.logo ?? null,
      website: b.website ?? "",
      isActive: b.isActive !== false,
    });
  };

  const remove = async (b) => {
    if (!confirm(`ลบแบรนด์ "${b.name}"?`)) return;
    try {
      await adminAPI.deleteBrand(b.id);
      toast.success("ลบแบรนด์แล้ว");
      if (editingId === b.id) resetForm();
      load();
    } catch (err) {
      toast.error(errorText(err, "ลบไม่สำเร็จ"));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <form className={`${card} space-y-5 self-start`} onSubmit={save} aria-labelledby="brand-form-title">
        <h2 id="brand-form-title" className="flex items-center gap-2 text-lg font-bold text-fg">
          <FaBuilding aria-hidden /> {editingId ? "แก้ไขแบรนด์" : "เพิ่มแบรนด์"}
        </h2>

        <div>
          <label htmlFor="brand-name" className="text-sm font-medium text-fg">ชื่อแบรนด์</label>
          <input
            id="brand-name"
            className={input}
            value={form.name}
            maxLength={100}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="เช่น Pulse Labs"
          />
        </div>

        <div>
          <label htmlFor="brand-desc" className="text-sm font-medium text-fg">คำอธิบาย</label>
          <textarea
            id="brand-desc"
            rows={3}
            className={input}
            value={form.description}
            maxLength={500}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="brand-web" className="text-sm font-medium text-fg">เว็บไซต์ (ถ้ามี)</label>
          <input
            id="brand-web"
            type="url"
            className={input}
            value={form.website}
            maxLength={255}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            placeholder="https://"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-fg">โลโก้</p>
          <div className="mt-2 grid grid-cols-[8rem_1fr] items-start gap-4">
            <EntityThumb src={form.logo} name={form.name} size={128} />
            <div className="space-y-2 text-xs text-fg-muted">
              <p>{form.logo ? "โลโก้ของแบรนด์" : "ยังไม่มีโลโก้: แสดงตัวอักษรแรกของชื่อแทน"}</p>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 font-medium text-fg hover:bg-surface-muted">
                  <FaImage aria-hidden /> {uploading ? "กำลังอัปโหลด…" : form.logo ? "เปลี่ยนโลโก้" : "อัปโหลดโลโก้"}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={onFile}
                    disabled={uploading}
                  />
                </label>
                {form.logo && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, logo: null }))}
                    className="rounded-xl px-3 py-2 font-medium text-danger hover:bg-danger-soft"
                  >
                    เอาโลโก้ออก
                  </button>
                )}
              </div>
              <p className="text-fg-subtle">PNG พื้นใสหรือ JPEG สี่เหลี่ยมจัตุรัส 512×512 ขึ้นไป</p>
            </div>
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-fg">แสดงในหน้าร้าน</span>
            <span className="block text-xs text-fg-muted">ปิดไว้ แบรนด์และสินค้าของแบรนด์จะไม่แสดงให้ลูกค้าเห็น</span>
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
            disabled={saving || uploading}
            className="inline-flex items-center gap-2 rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-canvas hover:bg-fg/85 disabled:opacity-50"
          >
            {editingId ? <FaEdit aria-hidden /> : <FaPlusCircle aria-hidden />}
            {saving ? "กำลังบันทึก…" : editingId ? "บันทึก" : "เพิ่มแบรนด์"}
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

      <section className={card} aria-labelledby="brand-list-title">
        <h2 id="brand-list-title" className="mb-4 text-lg font-bold text-fg">
          แบรนด์ทั้งหมด ({brands.length})
        </h2>
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-muted" />
            ))}
          </div>
        ) : brands.length === 0 ? (
          <p className="py-10 text-center text-sm text-fg-muted">ยังไม่มีแบรนด์</p>
        ) : (
          <ul className="divide-y divide-border">
            {brands.map((b) => (
              <li key={b.id} className={`flex items-center gap-4 py-3 ${editingId === b.id ? "bg-surface-muted/60" : ""}`}>
                <EntityThumb src={b.logo} name={b.name} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-semibold text-fg">
                    {b.name}
                    {b.isActive === false && (
                      <span className="rounded-full bg-fg/10 px-2 py-0.5 text-[11px] font-semibold text-fg-muted">ซ่อนอยู่</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-fg-muted">{b.description || b.website || "—"}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => edit(b)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-fg hover:bg-surface-muted"
                  >
                    <FaEdit aria-hidden /> แก้ไข<span className="sr-only"> {b.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(b)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-danger hover:bg-danger-soft"
                  >
                    <FaTrash aria-hidden /> ลบ<span className="sr-only"> {b.name}</span>
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
