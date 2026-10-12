"use client";
import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { PanelSkeleton } from "@/components/admin/ui/PanelSkeleton";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";

const REPORT_TABS = [
  { key: "sales", label: "ยอดขาย", icon: "💰" },
  { key: "inventory", label: "สินค้าคงคลัง", icon: "📦" },
  { key: "customer", label: "ลูกค้า", icon: "👥" },
];

function StatCard({ label, value, sub, color = "blue" }) {
  const colors = {
    blue: "bg-surface-muted text-fg border-border",
    green: "bg-success-soft text-success border-border",
    orange: "bg-warning-soft text-warning border-border",
    purple: "bg-surface-muted text-fg border-border",
    red: "bg-danger-soft text-danger border-border",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${colors[color]}`}>
      <div className="text-2xl font-extrabold">{value ?? "-"}</div>
      <div className="text-sm font-medium mt-1">{label}</div>
      {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
    </div>
  );
}

function SalesReportView({ data }) {
  if (!data)
    return (
      <EmptyState
        title="ยังไม่มีข้อมูลยอดขาย"
        description="เลือกช่วงวันที่แล้วกดดูรายงาน"
      />
    );
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="ยอดขายรวม" value={`฿${Number(data.totalRevenue || 0).toLocaleString("th-TH")}`} color="green" />
        <StatCard label="ออเดอร์ทั้งหมด" value={data.totalOrders ?? 0} color="blue" />
        <StatCard label="ออเดอร์เฉลี่ย" value={`฿${Number(data.averageOrderValue || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`} color="orange" />
        <StatCard label="ยอดขาย (บาท)" value={`฿${Number(data.totalSales || data.totalRevenue || 0).toLocaleString("th-TH")}`} color="purple" />
      </div>

      {data.dailySales?.length > 0 && (
        <div>
          <h4 className="font-semibold text-fg mb-3">ยอดขายรายวัน (30 วันล่าสุด)</h4>
          <div className="overflow-x-auto max-h-[70vh] rounded-xl border border-border">
            <table className="min-w-full bg-surface text-sm">
              <thead className="sticky top-0 z-10 bg-surface-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-fg-muted">วันที่</th>
                  <th className="px-4 py-3 text-right font-semibold text-fg-muted">จำนวนออเดอร์</th>
                  <th className="px-4 py-3 text-right font-semibold text-fg-muted">ยอดขาย (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.dailySales.map((d, i) => (
                  <tr key={i} className="hover:bg-surface-muted">
                    <td className="px-4 py-2 text-fg">{d.date}</td>
                    <td className="px-4 py-2 text-right text-fg">{d.count}</td>
                    <td className="px-4 py-2 text-right font-semibold text-fg">฿{Number(d.total || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.statusBreakdown?.length > 0 && (
        <div>
          <h4 className="font-semibold text-fg mb-3">สถานะออเดอร์</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.statusBreakdown.map((s, i) => (
              <StatCard key={i} label={s.status} value={s.count} sub={`฿${Number(s.total || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`} color={i % 2 === 0 ? "blue" : "green"} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryReportView({ data }) {
  if (!data)
    return (
      <EmptyState
        title="ยังไม่มีข้อมูลสินค้าคงคลัง"
        description="เลือกช่วงวันที่แล้วกดดูรายงาน"
      />
    );
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="สินค้าทั้งหมด" value={data.totalProducts ?? 0} color="blue" />
        <StatCard label="สินค้าใช้งานอยู่" value={data.activeProducts ?? 0} color="green" />
        <StatCard label="ใกล้หมดสต็อก" value={data.lowStockCount ?? 0} color="orange" />
        <StatCard label="หมดสต็อก" value={data.outOfStockCount ?? 0} color="red" />
      </div>

      {data.lowStockItems?.length > 0 && (
        <div>
          <h4 className="font-semibold text-fg mb-3 text-warning">⚠ สินค้าใกล้หมดสต็อก</h4>
          <div className="overflow-x-auto max-h-[70vh] rounded-xl border border-border">
            <table className="min-w-full bg-surface text-sm">
              <thead className="sticky top-0 z-10 bg-warning-soft">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-warning">สินค้า</th>
                  <th className="px-4 py-3 text-left font-semibold text-warning">SKU</th>
                  <th className="px-4 py-3 text-right font-semibold text-warning">สต็อก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.lowStockItems.map((item, i) => (
                  <tr key={i} className="hover:bg-warning-soft">
                    <td className="px-4 py-2 text-fg">{item.product?.name || item.name || "-"}</td>
                    <td className="px-4 py-2 font-mono text-xs text-fg-muted">{item.sku || "-"}</td>
                    <td className="px-4 py-2 text-right font-bold text-warning">{item.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerReportView({ data }) {
  if (!data)
    return (
      <EmptyState
        title="ยังไม่มีข้อมูลลูกค้า"
        description="เลือกช่วงวันที่แล้วกดดูรายงาน"
      />
    );
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="ลูกค้าทั้งหมด" value={data.totalCustomers ?? 0} color="blue" />
        <StatCard label="ลูกค้าใหม่ (30 วัน)" value={data.newCustomers ?? 0} color="green" />
        <StatCard label="ลูกค้าประจำ" value={data.returningCustomers ?? 0} color="purple" />
        <StatCard label="ยอดซื้อเฉลี่ย" value={`฿${Number(data.averageOrderValue || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`} color="orange" />
      </div>

      {data.topCustomers?.length > 0 && (
        <div>
          <h4 className="font-semibold text-fg mb-3">Top ลูกค้า</h4>
          <div className="overflow-x-auto max-h-[70vh] rounded-xl border border-border">
            <table className="min-w-full bg-surface text-sm">
              <thead className="sticky top-0 z-10 bg-surface-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-fg-muted">ชื่อ</th>
                  <th className="px-4 py-3 text-left font-semibold text-fg-muted">อีเมล</th>
                  <th className="px-4 py-3 text-right font-semibold text-fg-muted">ออเดอร์</th>
                  <th className="px-4 py-3 text-right font-semibold text-fg-muted">ยอดรวม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.topCustomers.map((c, i) => (
                  <tr key={i} className="hover:bg-surface-muted">
                    <td className="px-4 py-2 font-medium text-fg">{c.name || "-"}</td>
                    <td className="px-4 py-2 text-fg-muted">{c.email || "-"}</td>
                    <td className="px-4 py-2 text-right text-fg">{c.orderCount ?? "-"}</td>
                    <td className="px-4 py-2 text-right font-semibold text-fg">฿{Number(c.totalSpent || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReportsPanel() {
  const [activeTab, setActiveTab] = useState("sales");
  const [data, setData] = useState({ sales: null, inventory: null, customer: null });
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const loadReport = (tab) => {
    const params = { startDate, endDate };
    setLoading((l) => ({ ...l, [tab]: true }));
    setErrors((e) => ({ ...e, [tab]: null }));

    const fetchers = {
      sales: () => adminAPI.getSalesReport(params),
      inventory: () => adminAPI.getProductReport(params),
      customer: () => adminAPI.getCustomerReport(params),
    };

    fetchers[tab]?.()
      .then((d) => {
        setData((prev) => ({ ...prev, [tab]: d }));
        setLoading((l) => ({ ...l, [tab]: false }));
      })
      .catch((err) => {
        setErrors((e) => ({ ...e, [tab]: err.response?.data?.message || err.message || "โหลดข้อมูลไม่สำเร็จ" }));
        setLoading((l) => ({ ...l, [tab]: false }));
      });
  };

  useEffect(() => {
    loadReport(activeTab);
  }, [activeTab]);

  const handleApplyFilter = () => {
    setData((prev) => ({ ...prev, [activeTab]: null }));
    loadReport(activeTab);
  };

  const renderContent = () => {
    if (loading[activeTab]) return <PanelSkeleton cards={4} rows={6} />;
    if (errors[activeTab])
      return (
        <ErrorState
          message={errors[activeTab]}
          onRetry={() => loadReport(activeTab)}
        />
      );
    if (activeTab === "sales") return <SalesReportView data={data.sales} />;
    if (activeTab === "inventory") return <InventoryReportView data={data.inventory} />;
    if (activeTab === "customer") return <CustomerReportView data={data.customer} />;
    return null;
  };

  return (
    <div className="p-2">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-fg">รายงาน</h2>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fg"
          />
          <span className="text-fg-subtle text-sm">ถึง</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fg"
          />
          <button
            onClick={handleApplyFilter}
            className="bg-fg hover:bg-fg text-canvas px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            ดูรายงาน
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-muted p-1 rounded-xl w-fit">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-surface text-fg shadow-sm"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
