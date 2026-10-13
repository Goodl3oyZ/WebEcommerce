"use client";

import { useState } from "react";
import { FaImages, FaPlay, FaSpinner, FaTrashAlt } from "react-icons/fa";

const card = "rounded-2xl border border-border bg-surface p-5";
export const REMOVE_PHRASE = "REMOVE DEMO DATA";
const baht = (n) => `฿${Number(n).toLocaleString("th-TH")}`;
const ACTION_LABEL = {
  delete: { text: "ลบ", className: "bg-danger-soft text-danger" },
  hide: { text: "ซ่อน (มีออเดอร์)", className: "bg-warning-soft text-warning" },
  keep: { text: "เก็บไว้", className: "bg-surface-muted text-fg-muted" },
};

/** Demo catalogue with photos (adds only), and removing demo/seed data after launch. */
export function DemoDataSection({ data, busy, onInstall, onRemove }) {
  const [confirm, setConfirm] = useState("");
  const catalog = data?.catalog;
  const removal = data?.removal;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className={`${card} flex flex-col gap-4`} aria-labelledby="demo-install">
        <header className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-ink">
            <FaImages aria-hidden />
          </span>
          <div>
            <h3 id="demo-install" className="font-semibold text-fg">
              สินค้าตัวอย่างพร้อมรูป
            </h3>
            <p className="text-xs text-fg-muted">
              เพิ่มสินค้า {catalog?.products.length ?? "…"} รายการ รูป {catalog?.images ?? "…"} รูป
              สำหรับโชว์หน้าร้าน ไม่ลบข้อมูลเดิม ใช้บนเซิร์ฟเวอร์จริงได้
            </p>
          </div>
        </header>
        {!catalog ? (
          <div className="h-32 animate-pulse rounded-xl bg-surface-muted" aria-hidden />
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border text-sm">
            {catalog.products.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate text-fg">{p.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-fg-muted">
                  <span className="tabular-nums">{baht(p.price)}</span>
                  {p.installed && (
                    <span className="rounded-md bg-success-soft px-1.5 py-0.5 text-success">มีแล้ว</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={onInstall}
          disabled={Boolean(busy) || !catalog || catalog.toInstall === 0}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-fg px-4 py-2.5 text-sm font-semibold text-canvas transition-colors hover:bg-fg/85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "install" ? (
            <FaSpinner className="animate-spin" aria-hidden />
          ) : (
            <FaPlay className="h-3 w-3" aria-hidden />
          )}
          {catalog?.toInstall === 0
            ? "เพิ่มครบแล้ว"
            : `เพิ่มสินค้าตัวอย่าง${catalog ? ` (${catalog.toInstall})` : ""}`}
        </button>
      </article>

      <article className={`${card} flex flex-col gap-4`} aria-labelledby="demo-remove">
        <header className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
            <FaTrashAlt aria-hidden />
          </span>
          <div>
            <h3 id="demo-remove" className="font-semibold text-fg">
              ลบข้อมูลตัวอย่างออกจากร้าน
            </h3>
            <p className="text-xs text-fg-muted">
              ลบเฉพาะสินค้าตัวอย่างและข้อมูลที่ seed สร้าง ข้อมูลที่คุณสร้างเองไม่ถูกแตะ
              ของที่มีออเดอร์อ้างอิงจะถูกซ่อนแทนการลบ
            </p>
          </div>
        </header>
        {!removal ? (
          <div className="h-32 animate-pulse rounded-xl bg-surface-muted" aria-hidden />
        ) : removal.groups.length === 0 ? (
          <p className="rounded-xl bg-surface-muted p-4 text-sm text-fg-muted">ไม่มีข้อมูลตัวอย่างในร้าน</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {removal.groups.map((g) => (
              <li key={g.key}>
                <details className="group">
                  <summary className="cursor-pointer list-none text-fg">
                    <span
                      className="mr-1 inline-block text-fg-subtle transition-transform group-open:rotate-90"
                      aria-hidden
                    >
                      ›
                    </span>
                    {g.label} <span className="tabular-nums text-fg-muted">({g.items.length})</span>
                  </summary>
                  <ul className="mb-1 ml-4 mt-1 space-y-1 border-l border-border pl-3 text-xs">
                    {g.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-fg-muted">
                          {item.name}
                          {item.reason ? ` · ${item.reason}` : ""}
                        </span>
                        <span className={`shrink-0 rounded-md px-1.5 py-0.5 ${ACTION_LABEL[item.action].className}`}>
                          {ACTION_LABEL[item.action].text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}
        {removal?.total > 0 && (
          <div>
            <label htmlFor="confirm-demo-remove" className="text-xs text-fg-muted">
              พิมพ์ <code className="rounded bg-surface-muted px-1 font-semibold text-fg">{REMOVE_PHRASE}</code>{" "}
              เพื่อยืนยัน
            </label>
            <input
              id="confirm-demo-remove"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 font-mono text-sm text-fg focus:border-fg focus:ring-fg"
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => onRemove(confirm, () => setConfirm(""))}
          disabled={Boolean(busy) || !removal?.total || confirm !== REMOVE_PHRASE}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "remove" ? (
            <FaSpinner className="animate-spin" aria-hidden />
          ) : (
            <FaTrashAlt className="h-3 w-3" aria-hidden />
          )}
          {removal?.total ? `ลบข้อมูลตัวอย่าง (${removal.total})` : "ไม่มีอะไรต้องลบ"}
        </button>
      </article>
    </div>
  );
}
