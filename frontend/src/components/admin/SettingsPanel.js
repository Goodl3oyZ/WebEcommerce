"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import toast from "react-hot-toast";
import { adminAPI } from "@/lib/api";
import { PanelSkeleton } from "@/components/admin/ui/PanelSkeleton";
import ErrorState from "@/components/ErrorState";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const card = "rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-6";
const input =
  "mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-fg focus:ring-fg";

export function SettingsPanel() {
  const [settings, setSettings] = useState(null);
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
      .then((data) => setSettings(data))
      .catch((err) => setError(err.message || "โหลดการตั้งค่าไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    const siteName = settings.siteName.trim();
    if (!siteName) {
      toast.error("กรุณากรอกชื่อร้าน");
      return;
    }
    setSaving(true);
    try {
      const saved = await adminAPI.updateSettings({ siteName, maintenance: Boolean(settings.maintenance) });
      setSettings(saved);
      await site.reload();
      toast.success("บันทึกการตั้งค่าแล้ว");
    } catch (err) {
      toast.error(err.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
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
        <form className={`${card} space-y-6`} onSubmit={save} aria-labelledby="store-title">
          <div>
            <h3 id="store-title" className="font-semibold text-fg">
              ข้อมูลร้าน
            </h3>
            <p className="mt-1 text-sm text-fg-muted">มีผลกับทุกหน้าของร้าน</p>
          </div>

          <div>
            <label htmlFor="site-name" className="block text-sm font-medium text-fg">
              ชื่อร้าน
            </label>
            <input
              id="site-name"
              className={input}
              maxLength={60}
              value={settings?.siteName || ""}
              onChange={(e) => setSettings((s) => ({ ...s, siteName: e.target.value }))}
            />
            <p className="mt-2 text-xs text-fg-subtle">
              แสดงที่โลโก้ด้านบน ท้ายเว็บ และชื่อแท็บเบราว์เซอร์ ตัวอย่าง:{" "}
              <span className="font-display font-bold italic uppercase text-fg">{settings?.siteName || "—"}</span>
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-fg">สกุลเงิน</p>
            <p className="mt-1.5 inline-flex rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm font-semibold text-fg">
              THB (บาท)
            </p>
            <p className="mt-2 text-xs text-fg-subtle">ระบบชำระเงิน Omise รับเฉพาะเงินบาท จึงเปลี่ยนสกุลเงินไม่ได้</p>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-border p-4">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border text-fg focus:ring-fg"
              checked={Boolean(settings?.maintenance)}
              onChange={(e) => setSettings((s) => ({ ...s, maintenance: e.target.checked }))}
            />
            <span className="text-sm">
              <span className="font-medium text-fg">โหมดปิดปรับปรุง</span>
              <span className="mt-0.5 block text-fg-muted">
                ลูกค้าจะเห็นหน้า &quot;ปิดปรับปรุงชั่วคราว&quot; และสั่งซื้อไม่ได้ ทีมงานยังเข้าหลังบ้านได้ตามปกติ
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-canvas transition-colors hover:bg-fg/85 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
          </button>
        </form>
      )}
    </div>
  );
}
