"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { FaArrowDown, FaArrowUp } from "react-icons/fa";
import { pct } from "./reportUtils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

/** A titled block of the report. */
export function Section({ title, description, action, children, className = "" }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h3 className="font-semibold text-fg">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** +12.5% / −3.0% against the previous period. `inverse`: a rise is bad (e.g. cancellations). */
export function Delta({ value, inverse = false, points = false }) {
  if (value == null || !Number.isFinite(value)) {
    return <span className="text-xs text-fg-subtle">ไม่มีข้อมูลเทียบ</span>;
  }
  if (Math.abs(value) < 0.0005) return <span className="text-xs text-fg-subtle">เท่าเดิม</span>;
  const up = value > 0;
  const good = inverse ? !up : up;
  const Icon = up ? FaArrowUp : FaArrowDown;
  const text = points ? `${Math.abs(value * 100).toFixed(1)} จุด` : pct(Math.abs(value));
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
        good ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
      }`}
    >
      <Icon className="h-2.5 w-2.5" aria-hidden />
      {text}
    </span>
  );
}

/** Headline number with its change against the previous period. */
export function Kpi({ label, value, delta, inverse, points, hint }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-medium text-fg-muted">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-bold tabular-nums tracking-tight text-fg">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {delta !== undefined && <Delta value={delta} inverse={inverse} points={points} />}
        {hint && <span className="text-xs text-fg-subtle">{hint}</span>}
      </div>
    </div>
  );
}

export function KpiGrid({ children }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}

/** Horizontal bars, each row a share of the largest (or of `total`). */
export function BarList({ items, format = (v) => v, total, emptyText = "ไม่มีข้อมูล", tone = "bg-fg" }) {
  if (!items?.length) return <p className="py-6 text-center text-sm text-fg-muted">{emptyText}</p>;
  const max = total ?? Math.max(...items.map((i) => i.value), 0);
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const share = max > 0 ? item.value / max : 0;
        return (
          <li key={item.key ?? item.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-fg">{item.label}</span>
              <span className="shrink-0 tabular-nums text-fg">
                {format(item.value)}
                {item.note && <span className="ml-1.5 text-xs text-fg-muted">{item.note}</span>}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div className={`h-full rounded-full ${item.tone ?? tone}`} style={{ width: `${Math.max(share * 100, 1.5)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Theme colours for the canvas chart (re-read when the theme changes). */
function useChartColors() {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState(null);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const hsl = (name, alpha = 1) => `hsl(${css.getPropertyValue(name).trim()} / ${alpha})`;
    setColors({
      line: hsl("--fg"),
      fill: hsl("--fg", 0.08),
      previous: hsl("--fg-subtle", 0.9),
      grid: hsl("--border", 0.7),
      text: hsl("--fg-muted"),
      surface: hsl("--surface"),
    });
  }, [resolvedTheme]);
  return colors;
}

/** Line chart of this period, with the previous period dashed behind it. */
export function TrendChart({ labels, current, previous, format = (v) => v, currentLabel = "ช่วงนี้", previousLabel = "ช่วงก่อน" }) {
  const colors = useChartColors();
  if (!colors) return <div className="h-64" />;
  const datasets = [
    {
      label: currentLabel,
      data: current,
      borderColor: colors.line,
      backgroundColor: colors.fill,
      fill: true,
      tension: 0.3,
      borderWidth: 2,
      pointRadius: current.length > 40 ? 0 : 2.5,
      pointHoverRadius: 5,
    },
  ];
  if (previous) {
    datasets.push({
      label: previousLabel,
      data: previous,
      borderColor: colors.previous,
      borderDash: [5, 5],
      borderWidth: 1.5,
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
    });
  }
  return (
    <div className="h-64">
      <Line
        data={{ labels, datasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: {
              display: Boolean(previous),
              align: "end",
              labels: { color: colors.text, boxWidth: 18, boxHeight: 2, font: { size: 11 } },
            },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${format(ctx.parsed.y)}` } },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: colors.text, maxRotation: 0, autoSkipPadding: 12, font: { size: 11 } } },
            y: {
              beginAtZero: true,
              grid: { color: colors.grid },
              border: { display: false },
              ticks: { color: colors.text, font: { size: 11 }, callback: (v) => format(v), maxTicksLimit: 5 },
            },
          },
        }}
      />
    </div>
  );
}

/** A plain, scrollable table. columns: [{ key, header, align, render }] */
export function Table({ columns, rows, empty = "ไม่มีข้อมูล", maxHeight = "28rem" }) {
  if (!rows?.length) return <p className="py-6 text-center text-sm text-fg-muted">{empty}</p>;
  return (
    <div className="overflow-auto rounded-xl border border-border" style={{ maxHeight }}>
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-surface-muted">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-fg-muted ${c.align === "right" ? "text-right" : "text-left"}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {rows.map((row, i) => (
            <tr key={row.id ?? row.key ?? i} className="hover:bg-surface-muted/60">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2 text-fg ${c.align === "right" ? "text-right tabular-nums" : ""} ${c.className ?? ""}`}
                >
                  {c.render ? c.render(row, i) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
