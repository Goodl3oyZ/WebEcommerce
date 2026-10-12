"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { adminAPI } from "@/lib/api";
import { PanelSkeleton } from "@/components/admin/ui/PanelSkeleton";
import ErrorState from "@/components/ErrorState";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import toast from "react-hot-toast";

export function SettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const load = () => {
    setLoading(true);
    setError(null);
    adminAPI
      .getSettings?.()
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch settings");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-fg">ตั้งค่า</h2>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-6">
        <h3 className="mb-2 font-semibold text-fg">ธีมหน้าจอ</h3>
        <p className="mb-4 text-sm text-fg-muted">
          บันทึกที่อุปกรณ์นี้ (user preference) และใช้ได้ทั้งระบบ
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <ThemeToggle />
          {mounted &&
            ["light", "dark", "system"].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`rounded-xl border px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  theme === value
                    ? "border-primary-600 bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-100"
                    : "border-border text-fg hover:bg-surface-muted"
                }`}
              >
                {value === "light"
                  ? "สว่าง"
                  : value === "dark"
                    ? "มืด"
                    : "ตามระบบ"}
              </button>
            ))}
          {mounted && (
            <span className="text-xs text-fg-subtle">
              กำลังใช้: {resolvedTheme}
            </span>
          )}
        </div>
      </section>

      {loading ? (
        <PanelSkeleton rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <form
          className="space-y-4 rounded-2xl border border-border bg-surface p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const saved = await adminAPI.updateSettings({
                siteName: settings.siteName,
                maintenance: Boolean(settings.maintenance),
                currency: settings.currency,
                theme: settings.theme === "dark" ? "dark" : "light",
              });
              setSettings(saved);
              toast.success("บันทึกการตั้งค่าแล้ว");
            } catch (err) {
              toast.error(err.message || "บันทึกไม่สำเร็จ");
            }
          }}
        >
          <h3 className="font-semibold text-fg">ค่าคอนฟิกระบบ</h3>
          <label className="block text-sm">
            ชื่อร้าน
            <input
              className="mt-1 w-full rounded-xl border border-border px-3 py-2"
              value={settings?.siteName || ""}
              onChange={(e) =>
                setSettings((s) => ({ ...s, siteName: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm">
            สกุลเงิน
            <input
              maxLength={3}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2"
              value={settings?.currency || "THB"}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  currency: e.target.value.toUpperCase(),
                }))
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(settings?.maintenance)}
              onChange={(e) =>
                setSettings((s) => ({ ...s, maintenance: e.target.checked }))
              }
            />
            โหมดปิดปรับปรุง
          </label>
          <button
            type="submit"
            className="rounded-xl bg-primary-600 px-4 py-2 text-white"
          >
            บันทึกการตั้งค่า
          </button>
        </form>
      )}
    </div>
  );
}
