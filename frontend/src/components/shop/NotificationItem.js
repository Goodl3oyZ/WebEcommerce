"use client";

import Link from "next/link";
import { Bell, CreditCard, Megaphone, Package, Truck, X } from "lucide-react";
import { timeAgo } from "@/lib/format";

const ICONS = { order: Package, payment: CreditCard, shipping: Truck, promotion: Megaphone, system: Bell };

/** Where a notification leads, if anywhere (only paths inside the shop). */
export const notificationHref = (n) => {
  const link = n.metadata?.link;
  return typeof link === "string" && link.startsWith("/") && !link.startsWith("//") ? link : null;
};

/** One row; used by the header bell and the notifications page. */
export default function NotificationItem({ notification: n, onOpen, onRemove, compact = false }) {
  const Icon = ICONS[n.type] ?? Bell;
  const href = notificationHref(n);
  const body = (
    <>
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          n.isRead ? "bg-surface-muted text-fg-subtle" : "bg-brand/20 text-fg"
        }`}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={`min-w-0 flex-1 truncate text-sm ${n.isRead ? "font-medium text-fg-muted" : "font-semibold text-fg"}`}>
            {n.title}
          </span>
          <time dateTime={n.createdAt} className="shrink-0 text-xs text-fg-subtle">
            {timeAgo(n.createdAt)}
          </time>
        </span>
        <span className={`mt-0.5 block text-sm leading-relaxed text-fg-muted ${compact ? "line-clamp-2" : "whitespace-pre-line"}`}>
          {n.message}
        </span>
      </span>
      {!n.isRead && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand">
          <span className="sr-only">ยังไม่ได้อ่าน</span>
        </span>
      )}
    </>
  );
  const rowClass = "flex min-w-0 flex-1 items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-fg/5";

  return (
    <li className="flex items-start">
      {href ? (
        <Link href={href} className={rowClass} onClick={() => onOpen?.(n)}>
          {body}
        </Link>
      ) : (
        <button type="button" className={rowClass} onClick={() => onOpen?.(n)}>
          {body}
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(n)}
          className="ml-1 mt-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-fg/5 hover:text-fg"
          aria-label={`ลบการแจ้งเตือน ${n.title}`}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </li>
  );
}
