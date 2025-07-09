"use client";
import React from "react";
import {
  FaMoneyBillWave,
  FaUserPlus,
  FaClipboardList,
  FaChartLine,
  FaBoxes,
  FaBell,
  FaExclamationTriangle,
  FaCheckCircle,
  FaFire,
  FaRegSadTear,
} from "react-icons/fa";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

export default function DashboardSummary({ dashboard, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[120px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Empty state helper
  const renderEmptyState = (msg = "ไม่มีข้อมูล") => (
    <div className="flex flex-col items-center justify-center min-h-[120px] py-6 text-gray-400">
      <FaRegSadTear className="text-3xl mb-2" />
      <span className="text-xs">{msg}</span>
    </div>
  );

  // Modern summary cards
  const cards = [
    {
      icon: <FaMoneyBillWave className="text-xl text-green-500" />,
      title: "ยอดขายวันนี้",
      value: dashboard?.salesSummary?.today?.total || 0,
      desc: `ออเดอร์ ${dashboard?.salesSummary?.today?.count || 0} ราย`,
      bg: "bg-gradient-to-tr from-green-50 to-green-100",
    },
    {
      icon: <FaClipboardList className="text-xl text-blue-500" />,
      title: "ออเดอร์รอดำเนินการ",
      value:
        dashboard?.salesSummary?.statusCounts?.find(
          (s) => s.status === "pending"
        )?.count || 0,
      desc: "Pending",
      bg: "bg-gradient-to-tr from-blue-50 to-blue-100",
    },
    {
      icon: <FaUserPlus className="text-xl text-orange-500" />,
      title: "ลูกค้าใหม่ 7 วัน",
      value: dashboard?.customers?.new7d || 0,
      desc: `ลูกค้าทั้งหมด ${dashboard?.customers?.total || 0}`,
      bg: "bg-gradient-to-tr from-orange-50 to-orange-100",
    },
    {
      icon: <FaBoxes className="text-xl text-purple-500" />,
      title: "สินค้าทั้งหมด",
      value: dashboard?.inventory?.total || 0,
      desc: `ใกล้หมด ${dashboard?.inventory?.lowStock?.length || 0}`,
      bg: "bg-gradient-to-tr from-purple-50 to-purple-100",
    },
  ];

  // Chart data (no mock/placeholder)
  const salesData =
    dashboard?.analytics?.salesChart &&
    dashboard.analytics.salesChart.length > 0
      ? {
          labels: dashboard.analytics.salesChart.map((d) => d.date),
          datasets: [
            {
              label: "ยอดขาย (บาท)",
              data: dashboard.analytics.salesChart.map((d) => Number(d.total)),
              borderColor: "#2563eb",
              backgroundColor: "rgba(37,99,235,0.1)",
              tension: 0.4,
              fill: true,
            },
          ],
        }
      : null;
  const ordersData =
    dashboard?.analytics?.ordersChart &&
    dashboard.analytics.ordersChart.length > 0
      ? {
          labels: dashboard.analytics.ordersChart.map((d) => d.date),
          datasets: [
            {
              label: "จำนวนออเดอร์",
              data: dashboard.analytics.ordersChart.map((d) => Number(d.count)),
              backgroundColor: "#22c55e",
            },
          ],
        }
      : null;
  const topProductsData =
    dashboard?.analytics?.topProducts &&
    dashboard.analytics.topProducts.length > 0
      ? {
          labels: dashboard.analytics.topProducts.map((p) => p.name),
          datasets: [
            {
              data: dashboard.analytics.topProducts.map((p) =>
                Number(p.totalSold)
              ),
              backgroundColor: [
                "#2563eb",
                "#22c55e",
                "#f59e42",
                "#ef4444",
                "#a21caf",
              ],
            },
          ],
        }
      : null;
  const customerMonthlyData =
    dashboard?.analytics?.customerMonthly &&
    dashboard.analytics.customerMonthly.length > 0
      ? {
          labels: dashboard.analytics.customerMonthly.map((m) => m.month),
          datasets: [
            {
              label: "ลูกค้าใหม่",
              data: dashboard.analytics.customerMonthly.map((m) =>
                Number(m.newCount)
              ),
              backgroundColor: "#f59e42",
            },
          ],
        }
      : null;
  const trafficData =
    dashboard?.analytics?.trafficSources &&
    dashboard.analytics.trafficSources.length > 0
      ? {
          labels: dashboard.analytics.trafficSources.map((t) => t.source),
          datasets: [
            {
              data: dashboard.analytics.trafficSources.map((t) => t.percent),
              backgroundColor: [
                "#2563eb",
                "#22c55e",
                "#f59e42",
                "#ef4444",
                "#a21caf",
              ],
            },
          ],
        }
      : null;
  const hasData = (data) =>
    data &&
    data.datasets &&
    data.datasets[0] &&
    data.datasets[0].data &&
    data.datasets[0].data.length > 0 &&
    data.datasets[0].data.some((v) => v > 0);

  // Helper: render product/variant info
  const renderProductVariant = (variant) => (
    <div key={variant.id} className="flex flex-col text-xs mb-1">
      <span className="font-semibold text-gray-800">
        {variant.product?.name || "-"}
      </span>
      <span className="text-gray-500">
        SKU: {variant.sku} | สี: {variant.color} | ไซส์: {variant.size}
      </span>
      <span className="text-gray-500">สต็อก: {variant.stock}</span>
    </div>
  );

  // Export dashboard as PDF (WYSIWYG: เหมือนหน้าเว็บจริง)
  const exportDashboardToPDF = async () => {
    const jsPDFModule = await import("jspdf");
    const jsPDF = jsPDFModule.default;
    const dashboardEl = document.querySelector("#dashboard-summary-root");
    if (!dashboardEl) return;
    const canvas = await html2canvas(dashboardEl, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pageWidth - 40 * 2;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    let y = 40;
    // ถ้าสูงเกิน 1 หน้า ให้แบ่งหลายหน้า
    if (pdfHeight < pageHeight - 80) {
      pdf.addImage(imgData, "PNG", 40, y, pdfWidth, pdfHeight);
    } else {
      let remainingHeight = pdfHeight;
      let position = y;
      let imgY = 0;
      while (remainingHeight > 0) {
        pdf.addImage(
          imgData,
          "PNG",
          40,
          position,
          pdfWidth,
          pdfHeight,
          undefined,
          "FAST",
          0,
          imgY
        );
        remainingHeight -= pageHeight - 80;
        imgY += (imgProps.height * (pageHeight - 80)) / pdfHeight;
        if (remainingHeight > 0) {
          pdf.addPage();
          position = 40;
        }
      }
    }
    pdf.save(`dashboard-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div id="dashboard-summary-root" className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Dashboard</h1>
          <p className="text-sm text-gray-500">
            สรุปภาพรวมธุรกิจของคุณแบบเรียลไทม์
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition"
            onClick={exportDashboardToPDF}
          >
            Export PDF
          </button>
        </div>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`rounded-xl shadow-md p-5 flex flex-col items-start gap-2 min-h-[120px] border border-gray-100 hover:shadow-lg transition-shadow ${card.bg}`}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-inner mb-2">
              {card.icon}
            </div>
            <div className="text-xs text-gray-500 font-medium">
              {card.title}
            </div>
            <div className="text-2xl font-extrabold text-gray-800">
              {card.value}
            </div>
            <div className="text-xs text-gray-400 mt-auto">{card.desc}</div>
          </div>
        ))}
      </div>
      {/* Main Content: Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Sales Chart */}
        <div
          id="dashboard-sales-chart"
          data-title="ยอดขาย 30 วันล่าสุด"
          className="bg-white rounded-2xl shadow p-6 min-h-[260px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold">ยอดขาย 30 วันล่าสุด</div>
            {/* Filter dropdown (mock) */}
            <select className="text-xs border rounded px-2 py-1">
              <option>30 วัน</option>
              <option>7 วัน</option>
              <option>90 วัน</option>
            </select>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {salesData ? (
              <Line
                data={salesData}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  maintainAspectRatio: false,
                }}
                height={140}
              />
            ) : (
              renderEmptyState("ยังไม่มีข้อมูลยอดขาย")
            )}
          </div>
        </div>
        {/* Orders Chart */}
        <div
          id="dashboard-orders-chart"
          data-title="จำนวนออเดอร์ 30 วันล่าสุด"
          className="bg-white rounded-2xl shadow p-6 min-h-[260px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold">จำนวนออเดอร์ 30 วันล่าสุด</div>
            <select className="text-xs border rounded px-2 py-1">
              <option>30 วัน</option>
              <option>7 วัน</option>
              <option>90 วัน</option>
            </select>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {ordersData ? (
              <Bar
                data={ordersData}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  maintainAspectRatio: false,
                }}
                height={140}
              />
            ) : (
              renderEmptyState("ยังไม่มีข้อมูลออเดอร์")
            )}
          </div>
        </div>
        {/* Top Products Pie */}
        <div
          id="dashboard-top-products-chart"
          data-title="Top 5 สินค้าขายดี"
          className="bg-white rounded-2xl shadow p-6 min-h-[260px] flex flex-col"
        >
          <div className="font-bold mb-2">Top 5 สินค้าขายดี</div>
          <div className="flex-1 flex items-center justify-center">
            {topProductsData ? (
              <Pie
                data={topProductsData}
                options={{ responsive: true, maintainAspectRatio: false }}
                height={120}
              />
            ) : (
              renderEmptyState("ยังไม่มีข้อมูลสินค้าขายดี")
            )}
          </div>
        </div>
      </div>
      {/* Lists Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Inventory Section */}
        <div className="flex flex-col gap-4">
          {/* Low Stock */}
          <div className="bg-yellow-50 rounded-xl shadow p-4 min-h-[120px]">
            <div className="flex items-center gap-2 mb-2 text-yellow-700 font-bold">
              <FaExclamationTriangle /> สินค้าใกล้หมดสต็อก
            </div>
            {dashboard?.inventory?.lowStock?.length
              ? dashboard.inventory.lowStock.map(renderProductVariant)
              : renderEmptyState("ไม่มีสินค้าใกล้หมด")}
          </div>
          {/* Out of Stock */}
          <div className="bg-red-50 rounded-xl shadow p-4 min-h-[120px]">
            <div className="flex items-center gap-2 mb-2 text-red-700 font-bold">
              <FaCheckCircle /> สินค้าหมดสต็อก
            </div>
            {dashboard?.inventory?.outOfStock?.length
              ? dashboard.inventory.outOfStock.map(renderProductVariant)
              : renderEmptyState("ไม่มีสินค้าหมด")}
          </div>
        </div>
        {/* Recent Activities & Promotions */}
        <div className="flex flex-col gap-4">
          {/* Recent Activities */}
          <div className="bg-white rounded-xl shadow p-4 min-h-[120px]">
            <div className="font-bold mb-2">กิจกรรมล่าสุด</div>
            {dashboard?.analytics?.recentActivities?.length ? (
              <ul className="text-xs">
                {dashboard.analytics.recentActivities.map((a, i) => (
                  <li key={i} className="mb-1">
                    {a.time} - <span className="font-semibold">{a.user}</span>:{" "}
                    {a.action}
                  </li>
                ))}
              </ul>
            ) : (
              renderEmptyState("ยังไม่มีกิจกรรมล่าสุด")
            )}
          </div>
          {/* Promotions */}
          <div className="bg-white rounded-xl shadow p-4 min-h-[120px]">
            <div className="font-bold mb-2">โปรโมชัน/กิจกรรม</div>
            {dashboard?.analytics?.promotions?.length ? (
              <ul className="text-xs">
                {dashboard.analytics.promotions.map((p, i) => (
                  <li key={i} className="mb-1">
                    {p.date} - <span className="font-semibold">{p.title}</span>:{" "}
                    {p.desc}
                  </li>
                ))}
              </ul>
            ) : (
              renderEmptyState("ยังไม่มีข้อมูลโปรโมชัน")
            )}
          </div>
        </div>
      </div>
      {/* Traffic & Customer Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div
          id="dashboard-traffic-chart"
          data-title="แหล่งที่มาของ Traffic"
          className="bg-white rounded-2xl shadow p-6 min-h-[220px] flex flex-col"
        >
          <div className="font-bold mb-2">แหล่งที่มาของ Traffic</div>
          <div className="flex-1 flex items-center justify-center">
            {trafficData ? (
              <Pie
                data={trafficData}
                options={{ responsive: true, maintainAspectRatio: false }}
                height={120}
              />
            ) : (
              renderEmptyState("ยังไม่มีข้อมูล Traffic")
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow p-6 min-h-[220px] flex flex-col">
          <div className="font-bold mb-2">ลูกค้าใหม่แต่ละเดือน (6 เดือน)</div>
          <div className="flex-1 flex items-center justify-center">
            {customerMonthlyData ? (
              <Bar
                data={customerMonthlyData}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  maintainAspectRatio: false,
                }}
                height={120}
              />
            ) : (
              renderEmptyState("ยังไม่มีข้อมูลลูกค้าใหม่")
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
