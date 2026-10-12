"use client";

import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import {
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";
import EmptyState from "@/components/EmptyState";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

function VariantRow({ variant }) {
  return (
    <div className="mb-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs">
      <p className="font-semibold text-fg">{variant.product?.name || "-"}</p>
      <p className="text-fg-muted">
        SKU: {variant.sku} | สี: {variant.color} | ไซส์: {variant.size}
      </p>
      <p className="text-fg-muted">สต็อก: {variant.stock}</p>
    </div>
  );
}

export default function DashboardActivity({ dashboard }) {
  const trafficData =
    dashboard?.analytics?.trafficSources?.length > 0
      ? {
          labels: dashboard.analytics.trafficSources.map((t) => t.source),
          datasets: [
            {
              data: dashboard.analytics.trafficSources.map((t) => t.percent),
              backgroundColor: [
                "#0284c7",
                "#16a34a",
                "#d97706",
                "#dc2626",
                "#7c3aed",
              ],
            },
          ],
        }
      : null;

  const customerMonthlyData =
    dashboard?.analytics?.customerMonthly?.length > 0
      ? {
          labels: dashboard.analytics.customerMonthly.map((m) => m.month),
          datasets: [
            {
              label: "ลูกค้าใหม่",
              data: dashboard.analytics.customerMonthly.map((m) =>
                Number(m.newCount)
              ),
              backgroundColor: "#d97706",
            },
          ],
        }
      : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-warning-soft bg-warning-soft/40 p-4">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-warning">
            <FaExclamationTriangle /> สินค้าใกล้หมดสต็อก
          </h2>
          {dashboard?.inventory?.lowStock?.length ? (
            dashboard.inventory.lowStock.map((v) => (
              <VariantRow key={v.id} variant={v} />
            ))
          ) : (
            <EmptyState
              title="ไม่มีสินค้าใกล้หมด"
              description="สต็อกสินค้าอยู่ในระดับปกติ"
            />
          )}
        </section>
        <section className="rounded-2xl border border-danger-soft bg-danger-soft/40 p-4">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-danger">
            <FaCheckCircle /> สินค้าหมดสต็อก
          </h2>
          {dashboard?.inventory?.outOfStock?.length ? (
            dashboard.inventory.outOfStock.map((v) => (
              <VariantRow key={v.id} variant={v} />
            ))
          ) : (
            <EmptyState
              title="ไม่มีสินค้าหมด"
              description="ยังไม่มีรายการที่สต็อกเป็นศูนย์"
            />
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <h2 className="mb-2 font-semibold text-fg">กิจกรรมล่าสุด</h2>
          {dashboard?.analytics?.recentActivities?.length ? (
            <ul className="space-y-1 text-xs text-fg-muted">
              {dashboard.analytics.recentActivities.map((a, i) => (
                <li key={i}>
                  {a.time} - <span className="font-semibold text-fg">{a.user}</span>
                  : {a.action}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="ยังไม่มีกิจกรรมล่าสุด"
              description="กิจกรรมของร้านจะแสดงเมื่อมีการเปลี่ยนแปลง"
            />
          )}
        </section>
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <h2 className="mb-2 font-semibold text-fg">โปรโมชัน/กิจกรรม</h2>
          {dashboard?.analytics?.promotions?.length ? (
            <ul className="space-y-1 text-xs text-fg-muted">
              {dashboard.analytics.promotions.map((p, i) => (
                <li key={i}>
                  {p.date} - <span className="font-semibold text-fg">{p.title}</span>
                  : {p.desc}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="ยังไม่มีข้อมูลโปรโมชัน"
              description="สร้างคูปองหรือแคมเปญเพื่อดึงดูดลูกค้า"
            />
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="min-h-[220px] rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-6">
          <h2 className="mb-2 font-semibold text-fg">แหล่งที่มาของ Traffic</h2>
          {trafficData ? (
            <div className="h-44">
              <Pie data={trafficData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          ) : (
            <EmptyState
              title="ยังไม่มีข้อมูล Traffic"
              description="ข้อมูลแหล่งที่มาจะแสดงเมื่อมีการเข้าชม"
            />
          )}
        </section>
        <section className="min-h-[220px] rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-6">
          <h2 className="mb-2 font-semibold text-fg">ลูกค้าใหม่แต่ละเดือน (6 เดือน)</h2>
          {customerMonthlyData ? (
            <div className="h-44">
              <Bar
                data={customerMonthlyData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
          ) : (
            <EmptyState
              title="ยังไม่มีข้อมูลลูกค้าใหม่"
              description="เมื่อมีลูกค้าสมัคร กราฟจะแสดงที่นี่"
            />
          )}
        </section>
      </div>
    </div>
  );
}
