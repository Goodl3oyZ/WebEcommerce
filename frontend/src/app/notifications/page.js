"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usersAPI } from "@/lib/api/users";
import useNotificationStore from "@/store/notificationStore";
import Container from "@/components/shop/Container";
import NotificationItem from "@/components/shop/NotificationItem";
import PageLoader, { Spinner } from "@/components/ui/PageLoader";

/** Email on/off for order updates, stored in the user's preferences. */
function OrderEmailToggle() {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    usersAPI
      .getPreferences()
      .then((p) => setPrefs(p?.notifications ?? {}))
      .catch(() => setPrefs({}));
  }, []);

  if (prefs === null) return null;
  const on = prefs.orderEmails !== false;

  const toggle = async () => {
    const next = { ...prefs, orderEmails: !on };
    setSaving(true);
    setPrefs(next);
    try {
      await usersAPI.updatePreferences({ notifications: next });
      toast.success(
        next.orderEmails ? "เปิดอีเมลแจ้งเตือนแล้ว" : "ปิดอีเมลแจ้งเตือนแล้ว",
      );
    } catch {
      setPrefs(prefs);
      toast.error("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div>
        <p id="order-email-label" className="text-sm font-semibold text-fg">
          อีเมลแจ้งความคืบหน้าคำสั่งซื้อ
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          ส่งอีเมลเมื่อชำระเงินสำเร็จ จัดส่งสินค้า ยกเลิก หรือคืนเงิน
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby="order-email-label"
        disabled={saving}
        onClick={toggle}
        className={`relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
          on ? "bg-brand" : "bg-fg/20"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const items = useNotificationStore((s) => s.items);
  const unread = useNotificationStore((s) => s.unread);
  const loaded = useNotificationStore((s) => s.loaded);
  const loading = useNotificationStore((s) => s.loading);
  const hasMore = useNotificationStore((s) => s.hasMore);
  const refresh = useNotificationStore((s) => s.refresh);
  const loadMore = useNotificationStore((s) => s.loadMore);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const remove = useNotificationStore((s) => s.remove);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  if (authLoading) return <PageLoader />;

  if (!user) {
    return (
      <Container className="py-20 text-center">
        <Bell className="mx-auto h-10 w-10 text-fg-subtle" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">
          เข้าสู่ระบบเพื่อดูการแจ้งเตือน
        </h1>
        <Link
          href="/auth/login?redirect=/notifications"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-fg px-6 text-sm font-semibold text-canvas"
        >
          เข้าสู่ระบบ
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              การแจ้งเตือน
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              {unread > 0
                ? `ยังไม่ได้อ่าน ${unread} รายการ`
                : "อ่านครบทุกรายการแล้ว"}
            </p>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-fg/5"
            >
              <CheckCheck className="h-4 w-4" aria-hidden /> อ่านทั้งหมดแล้ว
            </button>
          )}
        </div>

        <div className="mt-6">
          <OrderEmailToggle />
        </div>

        <section aria-label="รายการแจ้งเตือน" className="mt-6">
          {!loaded ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-6 w-6" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
              <Bell className="mx-auto h-9 w-9 text-fg-subtle" aria-hidden />
              <p className="mt-3 font-medium">ยังไม่มีการแจ้งเตือน</p>
              <p className="mt-1 text-sm text-fg-subtle">
                เมื่อคำสั่งซื้อมีความคืบหน้า เราจะแจ้งที่นี่
              </p>
              <Link
                href="/products"
                className="mt-5 inline-flex text-sm font-semibold underline underline-offset-4"
              >
                เลือกซื้อสินค้า
              </Link>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-surface p-1.5">
                {items.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onOpen={(x) => markRead(x.id)}
                    onRemove={(x) => remove(x.id)}
                  />
                ))}
              </ul>
              {hasMore && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loading}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-6 text-sm font-medium hover:bg-fg/5 disabled:opacity-60"
                  >
                    {loading && <Spinner className="h-4 w-4" />} โหลดเพิ่ม
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </Container>
  );
}
