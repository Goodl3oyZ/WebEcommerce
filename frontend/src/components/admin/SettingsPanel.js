"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import toast from "react-hot-toast";
import { adminAPI, uploadAPI } from "@/lib/api";
import BrandMark from "@/components/brand/BrandMark";
import { faviconHref } from "@/contexts/SiteSettingsContext";
import { PanelSkeleton } from "@/components/admin/ui/PanelSkeleton";
import ErrorState from "@/components/ErrorState";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Store logo: used next to the name in the header and as the browser-tab icon. */
function LogoSettings({ saved, saving, persist }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const name = saved.siteName;

  const choose = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) return toast.error("ใช้ไฟล์ PNG, JPG หรือ WebP");
    if (file.size > 2 * 1024 * 1024) return toast.error("ไฟล์ใหญ่เกิน 2 MB");
    setUploading(true);
    try {
      const { fileName } = await uploadAPI.uploadSiteLogo(file);
      await persist({ logo: fileName }, "เปลี่ยนโลโก้แล้ว");
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const remove = () => {
    if (!window.confirm("ลบโลโก้? ร้านจะกลับไปใช้ตัวอักษรแรกของชื่อร้านแทน")) return;
    persist({ logo: null }, "ลบโลโก้แล้ว");
  };

  const busy = saving || uploading;
  return (
    <section className={`${card} space-y-5`} aria-labelledby="logo-title">
      <div>
        <h3 id="logo-title" className="font-semibold text-fg">
          โลโก้ร้าน
        </h3>
        <p className="mt-1 text-sm text-fg-muted">
          แสดงหน้าชื่อร้านที่แถบด้านบน และเป็นไอคอนบนแท็บเบราว์เซอร์ ถ้ายังไม่ได้อัปโหลด ระบบจะใช้ตัวอักษรแรกของชื่อร้าน
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["แถบด้านบน (สว่าง)", "bg-white text-[#141414] border-[#e5e5e5]"],
          ["แถบด้านบน (มืด)", "bg-[#0f0f0f] text-white border-white/10"],
        ].map(([label, tone]) => (
          <div key={label}>
            <p className="mb-1.5 text-xs text-fg-subtle">{label}</p>
            <div className={`flex h-14 items-center gap-2 rounded-xl border px-4 ${tone}`}>
              <BrandMark size={32} logoUrl={saved.logoUrl} siteName={name} />
              <span className="truncate font-display text-xl font-bold uppercase italic tracking-tight">{name}</span>
            </div>
          </div>
        ))}
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs text-fg-subtle">แท็บเบราว์เซอร์</p>
          <div className="inline-flex h-9 max-w-full items-center gap-2 rounded-t-lg border border-b-0 border-border bg-surface-muted px-3 text-sm text-fg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={faviconHref(saved)} alt="" className="h-4 w-4 rounded-sm object-contain" />
            <span className="truncate">{name} — หน้าร้าน</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept={LOGO_TYPES.join(",")} className="sr-only" onChange={choose} tabIndex={-1} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-xl bg-fg px-4 py-2 text-sm font-semibold text-canvas hover:bg-fg/85 disabled:opacity-50"
        >
          {uploading ? "กำลังอัปโหลด…" : saved.logoUrl ? "เปลี่ยนโลโก้" : "อัปโหลดโลโก้"}
        </button>
        {saved.logoUrl && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface-muted disabled:opacity-50"
          >
            ลบโลโก้
          </button>
        )}
        <span className="text-xs text-fg-subtle">PNG, JPG หรือ WebP ไม่เกิน 2 MB รูปสี่เหลี่ยมจัตุรัสพื้นใสดูดีที่สุด (แนะนำ 512×512)</span>
      </div>
    </section>
  );
}

const card = "rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-6";
const input =
  "mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-fg focus:ring-fg";

export function SettingsPanel() {
  const [saved, setSaved] = useState(null); // last values stored on the server
  const [siteName, setSiteName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const site = useSiteSettings();

  useEffect(() => setMounted(true), []);

  const load = () => {
    setLoading(true);
    setError(null);
    adminAPI
      .getSettings()
      .then((data) => {
        setSaved(data);
        setSiteName(data.siteName ?? "");
      })
      .catch((err) => setError(err.message || "โหลดการตั้งค่าไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const persist = async (changes, done) => {
    setSaving(true);
    try {
      const next = await adminAPI.updateSettings(changes);
      setSaved(next);
      setSiteName(next.siteName ?? "");
      await site.reload();
      toast.success(done);
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const dirty = saved && siteName.trim() !== (saved.siteName ?? "");

  const save = (e) => {
    e.preventDefault();
    const name = siteName.trim();
    if (!name) return toast.error("กรุณากรอกชื่อร้าน");
    persist({ siteName: name }, `เปลี่ยนชื่อร้านเป็น “${name}” แล้ว`);
  };

  const toggleMaintenance = () => {
    const on = !saved.maintenance;
    if (on && !window.confirm("ปิดปรับปรุงร้าน? ลูกค้าจะเข้าชมและสั่งซื้อไม่ได้จนกว่าจะเปิดอีกครั้ง")) return;
    persist({ maintenance: on }, on ? "ปิดปรับปรุงร้านแล้ว" : "เปิดร้านตามปกติแล้ว");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-fg">ตั้งค่า</h2>

      <section className={card} aria-labelledby="theme-title">
        <h3 id="theme-title" className="font-semibold text-fg">
          ธีมหน้าจอ
        </h3>
        <p className="mt-1 text-sm text-fg-muted">ใช้กับเบราว์เซอร์นี้ (ทั้งหน้าร้านและหลังบ้าน) ผู้ใช้แต่ละคนเลือกของตัวเองได้</p>
        <div className="mt-4 flex flex-wrap items-center gap-2" role="radiogroup" aria-labelledby="theme-title">
          {mounted &&
            [
              ["light", "สว่าง"],
              ["dark", "มืด"],
              ["system", "ตามระบบ"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => setTheme(value)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  theme === value ? "border-fg bg-fg text-canvas" : "border-border text-fg hover:bg-surface-muted"
                }`}
              >
                {label}
              </button>
            ))}
          {mounted && <span className="text-xs text-fg-subtle">กำลังใช้: {resolvedTheme === "dark" ? "มืด" : "สว่าง"}</span>}
        </div>
      </section>

      {loading ? (
        <PanelSkeleton rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <section
            className={`${card} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${
              saved.maintenance ? "border-warning bg-warning-soft" : ""
            }`}
            aria-labelledby="status-title"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-1 h-3 w-3 shrink-0 rounded-full ${saved.maintenance ? "bg-warning" : "bg-success"}`}
                aria-hidden
              />
              <div>
                <h3 id="status-title" className="font-semibold text-fg">
                  สถานะร้าน: {saved.maintenance ? "ปิดปรับปรุงอยู่" : "เปิดให้บริการ"}
                </h3>
                <p className="mt-1 text-sm text-fg-muted">
                  {saved.maintenance
                    ? "ลูกค้าเห็นหน้า “ปิดปรับปรุงชั่วคราว” และสั่งซื้อไม่ได้ ทีมงานยังใช้งานได้ตามปกติ"
                    : "ลูกค้าเข้าชมและสั่งซื้อได้ตามปกติ"}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={toggleMaintenance}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${
                saved.maintenance ? "bg-fg text-canvas hover:bg-fg/85" : "border border-border text-fg hover:bg-surface-muted"
              }`}
            >
              {saved.maintenance ? "เปิดร้านตามปกติ" : "ปิดปรับปรุงร้าน"}
            </button>
          </section>

          <LogoSettings saved={saved} saving={saving} persist={persist} />

          <form className={`${card} space-y-6`} onSubmit={save} aria-labelledby="store-title">
            <div>
              <h3 id="store-title" className="font-semibold text-fg">
                ข้อมูลร้าน
              </h3>
              <p className="mt-1 text-sm text-fg-muted">มีผลกับทุกหน้าของร้านทันทีหลังบันทึก</p>
            </div>

            <div>
              <label htmlFor="site-name" className="block text-sm font-medium text-fg">
                ชื่อร้าน
              </label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <input
                  id="site-name"
                  className={`${input} mt-0`}
                  maxLength={60}
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={saving || !dirty}
                  className="shrink-0 rounded-xl bg-fg px-5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-fg/85 disabled:opacity-40"
                >
                  {saving ? "กำลังบันทึก…" : "บันทึกชื่อร้าน"}
                </button>
              </div>
              <p className="mt-2 text-xs text-fg-subtle">
                {dirty ? (
                  <span className="font-medium text-warning">ยังไม่ได้บันทึก — ตอนนี้ร้านยังใช้ชื่อ “{saved.siteName}”</span>
                ) : (
                  <>ชื่อที่ใช้อยู่ตอนนี้ แสดงที่โลโก้ด้านบน ท้ายเว็บ และชื่อแท็บเบราว์เซอร์</>
                )}
              </p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-canvas px-3 py-2">
                <span className="text-xs text-fg-subtle">ตัวอย่างโลโก้:</span>
                <BrandMark size={24} logoUrl={saved.logoUrl} siteName={siteName || saved.siteName} />
                <span className="font-display text-lg font-bold italic uppercase tracking-tight text-fg">{siteName || "—"}</span>
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-fg">สกุลเงิน</p>
              <p className="mt-1.5 inline-flex rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm font-semibold text-fg">
                THB (บาท)
              </p>
              <p className="mt-2 text-xs text-fg-subtle">ระบบชำระเงิน Omise รับเฉพาะเงินบาท จึงเปลี่ยนสกุลเงินไม่ได้</p>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
