"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useSocketEvent } from "@/contexts/ChatContext";
import useNotificationStore from "@/store/notificationStore";
import NotificationItem from "./NotificationItem";
import { Spinner } from "@/components/ui/PageLoader";

const PREVIEW = 6;

/**
 * Header bell for signed-in customers. Kept fresh by server pushes and when
 * the tab regains focus. Opens a short list on wider screens and goes to the
 * notifications page on phones.
 */
export default function NotificationBell({ userId }) {
  const router = useRouter();
  const items = useNotificationStore((s) => s.items);
  const unread = useNotificationStore((s) => s.unread);
  const loaded = useNotificationStore((s) => s.loaded);
  const refresh = useNotificationStore((s) => s.refresh);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const reset = useNotificationStore((s) => s.reset);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const lastFetch = useRef(0);

  const fetchNow = useCallback(() => {
    lastFetch.current = Date.now();
    refresh();
  }, [refresh]);

  useEffect(() => {
    fetchNow();
    return () => reset();
  }, [userId, fetchNow, reset]);

  useSocketEvent("notification:new", fetchNow);

  // Missed pushes (sleeping laptop, dropped socket) are caught on return.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetch.current > 30_000) fetchNow();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [fetchNow]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!window.matchMedia("(min-width: 768px)").matches) return router.push("/notifications");
    if (!open) fetchNow();
    setOpen((v) => !v);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-fg/5"
        aria-label={unread > 0 ? `การแจ้งเตือน ยังไม่ได้อ่าน ${unread} รายการ` : "การแจ้งเตือน"}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-surface">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="การแจ้งเตือน"
          className="absolute right-0 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-border bg-surface text-fg shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">การแจ้งเตือน</p>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-fg-muted hover:text-fg">
                อ่านทั้งหมดแล้ว
              </button>
            )}
          </div>
          <div className="max-h-[26rem] overflow-y-auto p-1.5">
            {!loaded ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : items.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-fg-subtle" aria-hidden />
                <p className="mt-3 text-sm font-medium">ยังไม่มีการแจ้งเตือน</p>
                <p className="mt-1 text-xs text-fg-subtle">ความคืบหน้าของคำสั่งซื้อจะแสดงที่นี่</p>
              </div>
            ) : (
              <ul>
                {items.slice(0, PREVIEW).map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    compact
                    onOpen={(x) => {
                      markRead(x.id);
                      setOpen(false);
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-border px-4 py-3 text-center text-sm font-medium text-fg hover:bg-fg/5"
          >
            ดูทั้งหมด
          </Link>
        </div>
      )}
    </div>
  );
}
