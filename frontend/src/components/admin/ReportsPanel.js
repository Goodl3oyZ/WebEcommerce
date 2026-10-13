"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FaDownload, FaSyncAlt } from "react-icons/fa";
import { adminAPI, categoriesAPI } from "@/lib/api";
import { PanelSkeleton } from "@/components/admin/ui/PanelSkeleton";
import ErrorState from "@/components/ErrorState";
import {
  PRESETS,
  autoGroupBy,
  downloadCsv,
  presetRange,
  previousRange,
  rangeLabel,
  today,
} from "./reports/reportUtils";
import {
  CustomerReport,
  InventoryReport,
  OrdersReport,
  SalesReport,
  SupplierReport,
  customerCsv,
  inventoryCsv,
  ordersCsv,
  salesCsv,
  supplierCsv,
} from "./reports/ReportViews";

/**
 * Reports: figures for a chosen period, compared with the period right before
 * it, exportable as CSV. (The dashboard is the live "what needs attention now"
 * view; this is for reviewing and handing numbers on.)
 */
const TABS = [
  { id: "sales", label: "ยอดขาย", dated: true, compare: true, fetch: adminAPI.getSalesReport, View: SalesReport, csv: salesCsv },
  { id: "orders", label: "ออเดอร์", dated: true, compare: true, fetch: adminAPI.getOrderReport, View: OrdersReport, csv: ordersCsv },
  { id: "customer", label: "ลูกค้า", dated: true, compare: true, fetch: adminAPI.getCustomerReport, View: CustomerReport, csv: customerCsv },
  { id: "inventory", label: "สินค้าคงคลัง", dated: false, fetch: adminAPI.getProductReport, View: InventoryReport, csv: inventoryCsv },
  { id: "supplier", label: "ซัพพลายเออร์", dated: false, fetch: adminAPI.getSupplierReport, View: SupplierReport, csv: supplierCsv },
];
const GROUPS = [
  { id: "day", label: "วัน" },
  { id: "week", label: "สัปดาห์" },
  { id: "month", label: "เดือน" },
];
const TAB_KEY = "admin-report-tab";

const chip = (active) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    active ? "bg-fg text-canvas" : "text-fg-muted hover:bg-surface-muted hover:text-fg"
  }`;

export function ReportsPanel() {
  const [tabId, setTabId] = useState("sales");
  const [preset, setPreset] = useState("30d");
  const [custom, setCustom] = useState(() => presetRange("30d"));
  const [groupOverride, setGroupOverride] = useState(null);
  const [compare, setCompare] = useState(true);
  const [inventoryFilter, setInventoryFilter] = useState({ threshold: 5, categoryId: "" });
  const [categories, setCategories] = useState([]);
  const [state, setState] = useState({ loading: true, error: null, data: null, previous: null });
  const [reloadKey, setReloadKey] = useState(0);

  const tab = TABS.find((t) => t.id === tabId);
  const range = preset === "custom" ? custom : presetRange(preset);
  const prevRange = previousRange(range, preset);
  const groupBy = groupOverride ?? autoGroupBy(range);
  const validRange = range.start && range.end && range.start <= range.end;

  // Remember the last tab.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TAB_KEY);
      if (saved && TABS.some((t) => t.id === saved)) setTabId(saved);
    } catch {}
  }, []);
  const chooseTab = (id) => {
    setTabId(id);
    try {
      localStorage.setItem(TAB_KEY, id);
    } catch {}
  };

  useEffect(() => {
    categoriesAPI
      .getAllCategories()
      .then((rows) => setCategories(Array.isArray(rows) ? rows : rows?.data ?? []))
      .catch(() => setCategories([]));
  }, []);

  const params = useMemo(() => {
    if (tab.id === "inventory") {
      return { threshold: inventoryFilter.threshold, ...(inventoryFilter.categoryId && { categoryId: inventoryFilter.categoryId }) };
    }
    if (!tab.dated) return {};
    return { startDate: range.start, endDate: range.end, ...(tab.id !== "customer" && { groupBy }) };
  }, [tab, range.start, range.end, groupBy, inventoryFilter]);

  const load = useCallback(async () => {
    if (tab.dated && !validRange) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const wantPrevious = tab.compare && compare;
      const [data, previous] = await Promise.all([
        tab.fetch(params),
        wantPrevious ? tab.fetch({ ...params, startDate: prevRange.start, endDate: prevRange.end }) : null,
      ]);
      setState({ loading: false, error: null, data, previous });
    } catch (err) {
      setState({ loading: false, error: err?.response?.data?.message || err.message || "โหลดรายงานไม่สำเร็จ", data: null, previous: null });
    }
    // prevRange is derived from params' dates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, params, compare, validRange, reloadKey]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = () => {
    if (!state.data) return;
    const suffix = tab.dated ? `${range.start}_${range.end}` : today();
    downloadCsv(`report-${tab.id}-${suffix}.csv`, tab.csv(state.data, { range, prevRange, previous: state.previous, groupBy }));
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-fg">รายงาน</h2>
          <p className="mt-1 text-sm text-fg-muted">
            {tab.dated
              ? `${rangeLabel(range)}${tab.compare && compare ? ` · เทียบกับ ${rangeLabel(prevRange)}` : ""}`
              : "ข้อมูล ณ ตอนนี้ ไม่ขึ้นกับช่วงวันที่"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-fg hover:bg-surface-muted"
            aria-label="โหลดใหม่"
          >
            <FaSyncAlt className={`h-3.5 w-3.5 ${state.loading ? "animate-spin" : ""}`} aria-hidden />
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!state.data || state.loading}
            className="inline-flex items-center gap-2 rounded-xl bg-fg px-4 py-2 text-sm font-semibold text-canvas hover:bg-fg/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FaDownload className="h-3.5 w-3.5" aria-hidden /> ดาวน์โหลด CSV
          </button>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label="ประเภทรายงาน">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => chooseTab(t.id)}
            aria-current={t.id === tabId ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              t.id === tabId ? "border-fg text-fg" : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab.dated ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1" role="group" aria-label="ช่วงเวลา">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={chip(preset === p.id)}
                onClick={() => {
                  if (p.id === "custom") setCustom(range);
                  setPreset(p.id);
                  setGroupOverride(null);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {preset === "custom" && (
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="date"
                  value={custom.start}
                  max={custom.end || today()}
                  onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))}
                  className="rounded-lg border border-border px-2 py-1.5 text-sm"
                  aria-label="ตั้งแต่วันที่"
                />
                <span className="text-fg-muted">ถึง</span>
                <input
                  type="date"
                  value={custom.end}
                  min={custom.start}
                  max={today()}
                  onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))}
                  className="rounded-lg border border-border px-2 py-1.5 text-sm"
                  aria-label="ถึงวันที่"
                />
              </div>
            )}
            {tab.id !== "customer" && (
              <div className="flex rounded-lg bg-surface-muted p-0.5" role="group" aria-label="แบ่งตาม">
                {GROUPS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${groupBy === g.id ? "bg-surface text-fg shadow-sm" : "text-fg-muted"}`}
                    onClick={() => setGroupOverride(g.id)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-fg-muted">
              <input type="checkbox" className="h-4 w-4 rounded" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
              เทียบช่วงก่อน
            </label>
          </div>
        </div>
      ) : tab.id === "inventory" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-sm">
          <label className="flex items-center gap-2 text-fg-muted">
            หมวดหมู่
            <select
              value={inventoryFilter.categoryId}
              onChange={(e) => setInventoryFilter((f) => ({ ...f, categoryId: e.target.value }))}
              className="rounded-lg border border-border py-1.5 pl-2 pr-8 text-sm"
            >
              <option value="">ทั้งหมด</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-fg-muted">
            ถือว่าใกล้หมดเมื่อเหลือ ≤
            <input
              type="number"
              min="0"
              max="999"
              value={inventoryFilter.threshold}
              onChange={(e) => setInventoryFilter((f) => ({ ...f, threshold: Math.max(0, Number(e.target.value) || 0) }))}
              className="w-20 rounded-lg border border-border px-2 py-1.5 text-sm"
            />
            ชิ้น
          </label>
        </div>
      ) : null}

      {tab.dated && !validRange ? (
        <p className="rounded-xl bg-warning-soft p-4 text-sm text-warning">เลือกวันที่เริ่มต้นให้ไม่เกินวันที่สิ้นสุด</p>
      ) : state.loading && !state.data ? (
        <PanelSkeleton cards={4} rows={6} />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : state.data ? (
        <div className={state.loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={state.loading}>
          <tab.View data={state.data} previous={state.previous} range={range} prevRange={prevRange} groupBy={groupBy} />
        </div>
      ) : null}
    </div>
  );
}
