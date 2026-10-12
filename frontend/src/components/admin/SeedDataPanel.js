"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FaBoxOpen,
  FaDatabase,
  FaExclamationTriangle,
  FaMapMarkedAlt,
  FaPlay,
  FaShippingFast,
  FaSpinner,
  FaTerminal,
} from "react-icons/fa";
import { adminAPI } from "@/lib/api/admin";

const CONFIRM_PHRASE = "DELETE EXISTING DATA";
const SEEDS = [
  { id: "address", title: "ข้อมูลที่อยู่ประเทศไทย", Icon: FaMapMarkedAlt, script: "seed-address-thai.js" },
  { id: "shipping", title: "การจัดส่งและการชำระเงิน", Icon: FaShippingFast, script: "seed-shipping-payment.js" },
  { id: "main", title: "ข้อมูลร้านตัวอย่าง", Icon: FaBoxOpen, script: "seed.js" },
  { id: "all", title: "ทั้งหมด (รีเซ็ตระบบ)", Icon: FaDatabase, script: "seed:all" },
];
const card = "rounded-2xl border border-border bg-surface p-5";

function SeedCard({ seed, preview, running, disabled, onRun }) {
  const [confirm, setConfirm] = useState("");
  const destructive = preview?.deletes?.length > 0;
  const needsPhrase = seed.id !== "address";
  const ready = !preview?.blocked && (!needsPhrase || confirm === CONFIRM_PHRASE);

  return (
    <article className={`${card} flex flex-col gap-4`} aria-labelledby={`seed-${seed.id}`}>
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-fg">
          <seed.Icon aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 id={`seed-${seed.id}`} className="font-semibold text-fg">
            {seed.title}
          </h3>
          <code className="text-[11px] text-fg-subtle">{seed.script}</code>
        </div>
      </header>

      {!preview ? (
        <div className="h-24 animate-pulse rounded-xl bg-surface-muted" aria-hidden />
      ) : (
        <>
          <section aria-label="ข้อมูลที่จะถูกลบ">
            <h4 className="text-xs font-semibold text-danger">จะลบ (ข้อมูลปัจจุบัน)</h4>
            {destructive ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {preview.deletes.map((d) => (
                  <li key={d.label} className="rounded-lg bg-danger-soft px-2 py-1 text-xs text-danger">
                    {d.label} <strong className="tabular-nums">{d.count.toLocaleString("th-TH")}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-fg-muted">ไม่มีข้อมูลที่ต้องลบ</p>
            )}
          </section>

          <section aria-label="ข้อมูลที่จะถูกสร้าง">
            <h4 className="text-xs font-semibold text-success">จะสร้าง</h4>
            <ul className="mt-2 space-y-1.5">
              {preview.creates.map((c) => (
                <li key={c.label} className="text-sm">
                  {c.items?.length ? (
                    <details className="group">
                      <summary className="cursor-pointer list-none text-fg">
                        <span className="mr-1 inline-block text-fg-subtle transition-transform group-open:rotate-90" aria-hidden>
                          ›
                        </span>
                        {c.label} <span className="tabular-nums text-fg-muted">({c.count})</span>
                      </summary>
                      <ul className="mb-1 ml-4 mt-1 space-y-0.5 border-l border-border pl-3 text-xs text-fg-muted">
                        {c.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    <span className="text-fg">
                      <span className="mr-1 text-fg-subtle" aria-hidden>
                        ·
                      </span>
                      {c.label}{" "}
                      <span className="tabular-nums text-fg-muted">({c.count == null ? "?" : c.count.toLocaleString("th-TH")})</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {preview.notes?.map((n) => (
            <p key={n} className="text-xs text-fg-muted">
              หมายเหตุ: {n}
            </p>
          ))}

          {preview.blocked ? (
            <p role="alert" className="flex gap-2 rounded-xl border border-warning/40 bg-warning-soft p-3 text-xs text-warning">
              <FaExclamationTriangle className="mt-0.5 shrink-0" aria-hidden />
              <span>รันไม่ได้: {preview.blocked}</span>
            </p>
          ) : (
            needsPhrase && (
              <div>
                <label htmlFor={`confirm-${seed.id}`} className="text-xs text-fg-muted">
                  พิมพ์ <code className="rounded bg-surface-muted px-1 font-semibold text-fg">{CONFIRM_PHRASE}</code> เพื่อยืนยัน
                </label>
                <input
                  id={`confirm-${seed.id}`}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="off"
                  className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 font-mono text-sm text-fg focus:border-fg focus:ring-fg"
                />
              </div>
            )
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => onRun(seed, needsPhrase ? confirm : undefined, () => setConfirm(""))}
        disabled={disabled || !preview || !ready}
        className={`mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          destructive ? "bg-danger text-white hover:bg-danger/90" : "bg-fg text-canvas hover:bg-fg/85"
        }`}
      >
        {running ? <FaSpinner className="animate-spin" aria-hidden /> : <FaPlay className="h-3 w-3" aria-hidden />}
        {running ? "กำลังรัน…" : destructive ? "ลบและสร้างข้อมูลใหม่" : "สร้างข้อมูล"}
      </button>
    </article>
  );
}

export function SeedDataPanel() {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(null);
  const [output, setOutput] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      setPreview(await adminAPI.getSeedPreview());
    } catch (e) {
      setError(e?.response?.status === 403 ? "เฉพาะ super admin เท่านั้นที่ใช้งานส่วนนี้ได้" : e?.response?.data?.message || e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (seed, confirm, reset) => {
    setRunning(seed.id);
    setOutput(`[RUNNING] ${seed.title}…\n`);
    try {
      const res = await adminAPI.runSeed(seed.id, confirm);
      toast.success(`Seed "${seed.title}" สำเร็จ`);
      setOutput((o) => `${o}[SUCCESS] ${res.message}\n\n${res.output || ""}`);
      reset();
      load();
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Seed ไม่สำเร็จ";
      toast.error(msg);
      setOutput((o) => `${o}[ERROR] ${msg}\n`);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-fg">
          <FaDatabase aria-hidden /> ข้อมูลเริ่มต้น (Seed)
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          ดูก่อนว่าแต่ละชุดจะลบและสร้างอะไร ตัวเลข “จะลบ” นับจากฐานข้อมูลตอนนี้ ใช้สำหรับเครื่องพัฒนาหรือระบบทดสอบ
        </p>
      </div>

      {error ? (
        <p className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{error}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {SEEDS.map((seed) => (
            <SeedCard
              key={seed.id}
              seed={seed}
              preview={preview?.[seed.id]}
              running={running === seed.id}
              disabled={running !== null}
              onRun={run}
            />
          ))}
        </div>
      )}

      {output && (
        <section className="rounded-2xl border border-border bg-[#0f0f0f] p-4 text-white/90" aria-label="ผลการรัน">
          <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2 text-xs text-white/60">
            <span className="flex items-center gap-2 font-mono">
              <FaTerminal aria-hidden /> Output
            </span>
            <button type="button" onClick={() => setOutput("")} className="hover:text-white">
              ล้าง
            </button>
          </div>
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap font-mono text-xs">{output}</pre>
        </section>
      )}
    </div>
  );
}
