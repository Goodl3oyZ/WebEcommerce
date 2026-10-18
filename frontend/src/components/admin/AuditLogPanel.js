"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  ChevronDown,
  KeyRound,
  LogIn,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  UserPlus,
} from "lucide-react";
import { adminAPI } from "@/lib/api/admin";

const card = "rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6";
const field = "h-10 rounded-xl border border-border bg-surface px-3 text-sm";
const PER_PAGE = 30;

// "entity" is the first part of the API route ("/api/products/..." → products).
const ENTITIES = {
  auth: "บัญชีและการเข้าสู่ระบบ",
  products: "สินค้า",
  categories: "หมวดหมู่",
  brands: "แบรนด์",
  collections: "คอลเลกชัน",
  orders: "ออเดอร์",
  payments: "การชำระเงิน",
  shipping: "การจัดส่ง",
  coupons: "คูปอง",
  users: "ผู้ใช้",
  inventory: "สต็อก",
  suppliers: "ซัพพลายเออร์",
  stores: "สาขา",
  loyalty: "แต้มสะสม",
  notifications: "การแจ้งเตือน",
  support: "แชทลูกค้า",
  content: "บทความและหน้าเว็บ",
  settings: "ตั้งค่าร้าน",
  uploads: "รูปภาพ",
  admin: "ระบบแอดมิน",
  demo_data: "ข้อมูลตัวอย่าง",
};

const ACTIONS = {
  create: "สร้าง",
  update: "แก้ไข",
  delete: "ลบ",
  update_status: "เปลี่ยนสถานะ",
  refund: "คืนเงิน",
  install: "ติดตั้ง",
  remove: "ลบออก",
  login: "เข้าสู่ระบบ",
  login_failed: "เข้าสู่ระบบไม่สำเร็จ",
  register: "สมัครสมาชิก",
  password_change: "เปลี่ยนรหัสผ่าน",
  password_reset: "ตั้งรหัสผ่านใหม่ทางอีเมล",
};

const LOGIN_FAILURES = {
  INVALID_CREDENTIALS: "อีเมลหรือรหัสผ่านผิด",
  ACCOUNT_LOCKED: "บัญชีถูกล็อกชั่วคราว (ลองผิดหลายครั้ง)",
  EMAIL_NOT_VERIFIED: "ยังไม่ได้ยืนยันอีเมล",
  ACCOUNT_DEACTIVATED: "บัญชีถูกปิดใช้งาน",
};

const ICONS = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  update_status: RefreshCw,
  refund: RotateCcw,
  install: Package,
  remove: Trash2,
  login: LogIn,
  login_failed: ShieldAlert,
  register: UserPlus,
  password_change: KeyRound,
  password_reset: KeyRound,
};

const ROLES = { super_admin: "Super admin", admin: "Admin", moderator: "ทีมแชท", user: "ลูกค้า" };

const when = (iso) => new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

/** A short name for what was changed, from the request body. */
function targetName(log) {
  const data = log.after || {};
  if (log.entity === "auth") return typeof data.provider === "string" ? `ผ่าน ${data.provider}` : null;
  const name = data.name || data.title || data.code || data.siteName;
  if (typeof name === "string") return name;
  if (log.action === "update_status" || typeof data.status === "string") return data.status && `สถานะ: ${data.status}`;
  if (typeof data.role === "string") return `role: ${data.role}`;
  return null;
}

const show = (value) =>
  value === null || value === undefined ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value);

/** Field-by-field view: before → after when both are known. */
function Changes({ before, after }) {
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];
  if (!keys.length) return <p className="text-sm text-fg-subtle">ไม่มีข้อมูลที่ส่งมา</p>;
  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[minmax(8rem,auto)_1fr]">
      {keys.map((key) => (
        <div key={key} className="contents">
          <dt className="font-mono text-xs text-fg-subtle sm:pt-0.5">{key}</dt>
          <dd className="min-w-0 break-words">
            {before && key in before && (
              <>
                <span className="text-fg-subtle line-through">{show(before[key])}</span>
                <span className="mx-1.5 text-fg-subtle">→</span>
              </>
            )}
            <span className="text-fg">{show(after?.[key])}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function LogRow({ log }) {
  const failed = log.action === "login_failed";
  const sign = log.entity === "auth";
  const actor = log.actor?.name || log.actorEmail || "ระบบ";
  const name = targetName(log);
  const Icon = ICONS[log.action] || Pencil;

  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-3 py-3 [&::-webkit-details-marker]:hidden">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              failed ? "bg-danger-soft text-danger" : log.action === "delete" ? "bg-surface-muted text-danger" : "bg-surface-muted text-fg-muted"
            }`}
            aria-hidden
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-fg">
              <span className="font-semibold">{actor}</span>{" "}
              <span className={failed ? "font-medium text-danger" : ""}>{ACTIONS[log.action] || log.action}</span>
              {!sign && <> · {ENTITIES[log.entity] || log.entity}</>}
              {name && <span className="text-fg-muted"> {sign ? name : `“${name}”`}</span>}
            </p>
            <p className="mt-0.5 text-xs text-fg-subtle">
              {when(log.createdAt)}
              {log.actorRole && ` · ${ROLES[log.actorRole] || log.actorRole}`}
              {log.ipAddress && ` · IP ${log.ipAddress}`}
              {failed && log.after?.code && ` · ${LOGIN_FAILURES[log.after.code] || log.after.code}`}
            </p>
          </div>
          <ChevronDown className="mt-1.5 h-4 w-4 shrink-0 text-fg-subtle transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="mb-3 ml-11 space-y-3 rounded-xl bg-surface-muted p-4">
          <dl className="grid gap-x-4 gap-y-1 text-xs text-fg-muted sm:grid-cols-[8rem_1fr]">
            {log.actorEmail && (
              <>
                <dt>บัญชี</dt>
                <dd className="break-all">{log.actorEmail}</dd>
              </>
            )}
            {log.route && (
              <>
                <dt>คำขอ</dt>
                <dd className="break-all font-mono">
                  {log.method} {log.route}
                  {log.statusCode ? ` → ${log.statusCode}` : ""}
                </dd>
              </>
            )}
            {log.entityId && (
              <>
                <dt>รหัสรายการ</dt>
                <dd className="break-all font-mono">{log.entityId}</dd>
              </>
            )}
            {log.userAgent && (
              <>
                <dt>อุปกรณ์</dt>
                <dd className="break-all">{log.userAgent}</dd>
              </>
            )}
          </dl>
          {(log.before || log.after) && !failed && <Changes before={log.before} after={log.after} />}
        </div>
      </details>
    </li>
  );
}

/** Admin: who changed what in the shop, and every sign-in. */
export function AuditLogPanel() {
  const [logs, setLogs] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ entity: "", action: "", from: "", to: "", search: "" });
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLogs(null);
    const { from, to, ...rest } = filters;
    const params = Object.fromEntries(Object.entries(rest).filter(([, value]) => value));
    // Dates are local days: from its first to its last moment.
    if (from) params.from = new Date(`${from}T00:00:00`).toISOString();
    if (to) params.to = new Date(`${to}T23:59:59.999`).toISOString();
    try {
      const res = await adminAPI.listAuditLogs({ page, limit: PER_PAGE, ...params });
      setLogs(res.logs ?? []);
      setPagination(res.pagination ?? { pages: 1, total: 0 });
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "โหลดประวัติไม่สำเร็จ");
      setLogs([]);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-fg">ประวัติการใช้งาน</h2>
        <p className="mt-1 text-sm text-fg-muted">
          ทุกการเพิ่ม แก้ไข และลบโดยทีมงาน พร้อมการเข้าสู่ระบบของทุกบัญชี (รวมครั้งที่ไม่สำเร็จ) เก็บไว้ 1 ปี
          กดรายการเพื่อดูว่าเปลี่ยนอะไร
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <form
          className="relative min-w-[14rem] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter("search", query.trim());
          }}
        >
          <label>
            <span className="sr-only">ค้นหาอีเมลหรือรหัสรายการ</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาอีเมล หรือรหัสรายการ แล้วกด Enter"
              className={`${field} w-full pl-9`}
            />
          </label>
        </form>
        <select value={filters.entity} onChange={(e) => setFilter("entity", e.target.value)} aria-label="ประเภท" className={field}>
          <option value="">ทุกประเภท</option>
          {Object.entries(ENTITIES).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select value={filters.action} onChange={(e) => setFilter("action", e.target.value)} aria-label="การกระทำ" className={field}>
          <option value="">ทุกการกระทำ</option>
          {Object.entries(ACTIONS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-fg-muted">
          ตั้งแต่
          <input type="date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} className={field} />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-fg-muted">
          ถึง
          <input type="date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} className={field} />
        </label>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setPage(1);
              setFilters({ entity: "", action: "", from: "", to: "", search: "" });
            }}
            className="h-10 rounded-xl px-3 text-sm text-fg-muted hover:bg-surface-muted"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      <section className={card} aria-label="รายการประวัติ">
        {logs === null ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-muted" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="py-10 text-center text-sm text-fg-muted">{filtered ? "ไม่พบรายการที่ตรงกับตัวกรอง" : "ยังไม่มีประวัติ"}</p>
        ) : (
          <>
            <p className="mb-1 text-xs text-fg-subtle">ทั้งหมด {pagination.total.toLocaleString("th-TH")} รายการ</p>
            <ul className="divide-y divide-border">
              {logs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </ul>
          </>
        )}
        {pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl border border-border px-3 py-2 text-sm disabled:opacity-50">
              ก่อนหน้า
            </button>
            <span className="text-sm text-fg-muted">หน้า {page} / {pagination.pages}</span>
            <button type="button" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)} className="rounded-xl border border-border px-3 py-2 text-sm disabled:opacity-50">
              ถัดไป
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
