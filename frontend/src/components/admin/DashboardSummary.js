"use client";

import dynamic from "next/dynamic";
import {
  FaMoneyBillWave,
  FaUserPlus,
  FaClipboardList,
  FaBoxes,
} from "react-icons/fa";
import { StatCard } from "@/components/admin/ui/StatCard";
import { PanelSkeleton } from "@/components/admin/ui/PanelSkeleton";
import ErrorState from "@/components/ErrorState";
import TopProductsList from "@/components/admin/dashboard/TopProductsList";
import { useTabs } from "@/components/ui/Tabs";

const DashboardCharts = dynamic(
  () => import("@/components/admin/dashboard/DashboardCharts"),
  { ssr: false, loading: () => <PanelSkeleton cards={0} rows={0} charts={2} /> }
);

const DashboardActivity = dynamic(
  () => import("@/components/admin/dashboard/DashboardActivity"),
  { ssr: false, loading: () => <PanelSkeleton cards={0} rows={4} charts={0} /> }
);

export default function DashboardSummary({
  dashboard,
  loading,
  error,
  onRetry,
}) {
  const { setValue } = useTabs();

  const exportDashboardToPDF = async () => {
    const jsPDFModule = await import("jspdf");
    const jsPDF = jsPDFModule.default;
    const html2canvas = (await import("html2canvas")).default;
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

  if (loading) {
    return <PanelSkeleton cards={4} charts={3} rows={4} />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={onRetry}
      />
    );
  }

  const cards = [
    {
      tone: "success",
      icon: <FaMoneyBillWave className="text-lg" />,
      title: "ยอดขายวันนี้",
      value: `฿${Number(dashboard?.salesSummary?.today?.total || 0).toLocaleString("th-TH")}`,
      desc: `ออเดอร์ ${dashboard?.salesSummary?.today?.count || 0} ราย`,
    },
    {
      tone: "info",
      icon: <FaClipboardList className="text-lg" />,
      title: "ออเดอร์รอดำเนินการ",
      value:
        dashboard?.salesSummary?.statusCounts?.find((s) => s.status === "pending")
          ?.count || 0,
      desc: "Pending",
    },
    {
      tone: "warning",
      icon: <FaUserPlus className="text-lg" />,
      title: "ลูกค้าใหม่ 7 วัน",
      value: dashboard?.customers?.new7d || 0,
      desc: `ลูกค้าทั้งหมด ${dashboard?.customers?.total || 0}`,
    },
    {
      tone: "purple",
      icon: <FaBoxes className="text-lg" />,
      title: "สินค้าทั้งหมด",
      value: dashboard?.inventory?.total || 0,
      desc: `ใกล้หมด ${dashboard?.inventory?.lowStock?.length || 0}`,
    },
  ];

  return (
    <div id="dashboard-summary-root" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">แดชบอร์ด</h1>
          <p className="text-sm text-fg-muted">
            สรุปภาพรวมธุรกิจของคุณแบบเรียลไทม์
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl bg-fg px-4 py-2 text-sm font-medium text-canvas shadow-sm transition-colors duration-150 hover:bg-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg sm:self-start"
          onClick={exportDashboardToPDF}
        >
          Export PDF
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard
            key={card.title}
            tone={card.tone}
            icon={card.icon}
            title={card.title}
            value={card.value}
            description={card.desc}
          />
        ))}
      </div>

      <DashboardCharts dashboard={dashboard} />

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-6">
        <h2 className="mb-4 font-semibold text-fg">Top 5 สินค้าขายดี</h2>
        <TopProductsList
          products={dashboard?.analytics?.topProducts || []}
          onAddProduct={() => setValue("products")}
        />
      </section>

      <DashboardActivity dashboard={dashboard} />
    </div>
  );
}
