"use client";

import { useState } from "react";
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
import EmptyState from "@/components/EmptyState";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const RANGE_OPTIONS = [
  { label: "7 วัน", days: 7 },
  { label: "30 วัน", days: 30 },
  { label: "90 วัน", days: 90 },
];

function sliceByDays(rows, days) {
  if (!rows?.length) return [];
  return rows.slice(-days);
}

function AreaChart({ labels, values, color, label }) {
  const data = {
    labels,
    datasets: [
      {
        label,
        data: values,
        borderColor: color,
        backgroundColor: `${color}22`,
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        ticks: { maxTicksLimit: 8, color: "#6b7280" },
        grid: { display: false },
      },
      y: {
        ticks: { color: "#6b7280" },
        grid: { color: "rgba(148,163,184,0.2)" },
      },
    },
  };
  return (
    <div className="h-44 w-full sm:h-52">
      <Line data={data} options={options} />
    </div>
  );
}

export default function DashboardCharts({ dashboard }) {
  const [salesDays, setSalesDays] = useState(30);
  const [orderDays, setOrderDays] = useState(30);

  const salesRows = sliceByDays(dashboard?.analytics?.salesChart, salesDays);
  const orderRows = sliceByDays(dashboard?.analytics?.ordersChart, orderDays);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-fg">ยอดขาย {salesDays} วันล่าสุด</h2>
          <select
            className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-fg"
            value={salesDays}
            onChange={(e) => setSalesDays(Number(e.target.value))}
            aria-label="ช่วงเวลายอดขาย"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.days} value={opt.days}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {salesRows.length ? (
          <AreaChart
            labels={salesRows.map((d) => d.date)}
            values={salesRows.map((d) => Number(d.total))}
            color="#0284c7"
            label="ยอดขาย (บาท)"
          />
        ) : (
          <EmptyState
            title="ยังไม่มีข้อมูลยอดขาย"
            description="เมื่อมีออเดอร์สำเร็จ กราฟยอดขายจะแสดงที่นี่"
          />
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-fg">จำนวนออเดอร์ {orderDays} วันล่าสุด</h2>
          <select
            className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-fg"
            value={orderDays}
            onChange={(e) => setOrderDays(Number(e.target.value))}
            aria-label="ช่วงเวลาจำนวนออเดอร์"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.days} value={opt.days}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {orderRows.length ? (
          <AreaChart
            labels={orderRows.map((d) => d.date)}
            values={orderRows.map((d) => Number(d.count))}
            color="#16a34a"
            label="จำนวนออเดอร์"
          />
        ) : (
          <EmptyState
            title="ยังไม่มีข้อมูลออเดอร์"
            description="เมื่อมีออเดอร์เข้ามา กราฟจะอัปเดตอัตโนมัติ"
          />
        )}
      </section>
    </div>
  );
}
