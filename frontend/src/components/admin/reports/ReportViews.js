"use client";

import { BarList, Kpi, KpiGrid, Section, Table, TrendChart } from "./ReportParts";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  SUPPLIER_STATUS,
  baht,
  bucketLabel,
  change,
  fillSeries,
  num,
  pct,
} from "./reportUtils";

const shortBaht = (v) => (Math.abs(v) >= 10000 ? `฿${(v / 1000).toLocaleString("th-TH", { maximumFractionDigits: 1 })}k` : baht(v));

/** Current and previous series aligned bucket by bucket. */
function trend(current, previous, range, prevRange, groupBy, field) {
  const now = fillSeries(current?.dailySales, range, groupBy);
  const before = previous ? fillSeries(previous.dailySales, prevRange, groupBy) : null;
  return {
    labels: now.map((r) => bucketLabel(r.date, groupBy)),
    current: now.map((r) => r[field]),
    // Align by position; a longer previous series is cut, a shorter one padded.
    previous: before ? now.map((_, i) => before[i]?.[field] ?? null) : null,
    rows: now,
  };
}

// --- Sales -------------------------------------------------------------------

export function SalesReport({ data, previous, range, prevRange, groupBy }) {
  const t = trend(data, previous, range, prevRange, groupBy, "total");
  const b = data.breakdown ?? {};
  const itemRevenue = (data.byCategory ?? []).reduce((s, c) => s + c.revenue, 0);

  return (
    <div className="space-y-4">
      <KpiGrid>
        <Kpi label="ยอดขายสุทธิ" value={baht(data.totalRevenue)} delta={change(data.totalRevenue, previous?.totalRevenue)} />
        <Kpi label="ออเดอร์ที่ชำระแล้ว" value={num(data.totalOrders)} delta={change(data.totalOrders, previous?.totalOrders)} />
        <Kpi
          label="ยอดเฉลี่ยต่อออเดอร์"
          value={baht(data.averageOrderValue)}
          delta={change(data.averageOrderValue, previous?.averageOrderValue)}
        />
        <Kpi label="จำนวนชิ้นที่ขายได้" value={num(data.itemsSold)} delta={change(data.itemsSold, previous?.itemsSold)} />
      </KpiGrid>

      <div className="grid gap-4 xl:grid-cols-3">
        <Section
          className="xl:col-span-2"
          title="ยอดขายสุทธิ"
          description={`ราย${groupBy === "day" ? "วัน" : groupBy === "week" ? "สัปดาห์" : "เดือน"} เส้นประคือช่วงก่อนหน้าที่ยาวเท่ากัน`}
        >
          <TrendChart labels={t.labels} current={t.current} previous={t.previous} format={shortBaht} />
        </Section>

        <Section title="ที่มาของยอดขาย" description="เฉพาะออเดอร์ที่ชำระเงินแล้ว">
          <dl className="space-y-2.5 text-sm">
            {[
              ["ลูกค้าชำระทั้งหมด", b.grossSales, "รวม VAT และค่าส่ง หลังหักส่วนลด"],
              ["  ในนั้นเป็น VAT 7%", b.tax],
              ["  ในนั้นเป็นค่าจัดส่ง", b.shipping],
              ["ส่วนลดที่ให้ลูกค้า", b.discounts, "หักไปแล้วในยอดที่ชำระ"],
              ["คืนเงิน", -(b.refunds || 0)],
            ].map(([label, value, hint]) => (
              <div key={label} className="flex items-start justify-between gap-3">
                <dt className={label.startsWith("  ") ? "pl-3 text-fg-muted" : "text-fg"}>
                  {label.trim()}
                  {hint && <span className="block text-xs text-fg-subtle">{hint}</span>}
                </dt>
                <dd className={`tabular-nums ${value < 0 ? "text-danger" : "text-fg"}`}>{baht(value, 2)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 border-t border-border pt-2.5 font-semibold">
              <dt className="text-fg">ยอดขายสุทธิ</dt>
              <dd className="tabular-nums text-fg">{baht(data.totalRevenue, 2)}</dd>
            </div>
            <div className="flex justify-between gap-3 text-xs text-fg-muted">
              <dt>ยอดก่อน VAT (หลังคืนเงิน)</dt>
              <dd className="tabular-nums">{baht((data.totalRevenue || 0) - (b.tax || 0), 2)}</dd>
            </div>
          </dl>
        </Section>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Section className="xl:col-span-3" title="สินค้าขายดี" description="10 อันดับตามยอดขายสินค้า (ก่อนส่วนลดและค่าส่ง)">
          <Table
            rows={data.topProducts}
            empty="ยังไม่มีสินค้าที่ขายได้ในช่วงนี้"
            columns={[
              { key: "rank", header: "#", render: (_, i) => <span className="text-fg-muted">{i + 1}</span> },
              { key: "name", header: "สินค้า", render: (p) => p.name ?? "สินค้าที่ถูกลบ" },
              { key: "quantity", header: "ชิ้น", align: "right", render: (p) => num(p.quantity) },
              { key: "revenue", header: "ยอดขาย", align: "right", render: (p) => baht(p.revenue) },
              {
                key: "share",
                header: "สัดส่วน",
                align: "right",
                render: (p) => <span className="text-fg-muted">{itemRevenue ? pct(p.revenue / itemRevenue) : "–"}</span>,
              },
            ]}
          />
        </Section>
        <Section className="xl:col-span-2" title="ยอดขายตามหมวดหมู่">
          <BarList
            emptyText="ยังไม่มียอดขายในช่วงนี้"
            format={baht}
            items={(data.byCategory ?? []).map((c) => ({
              key: c.categoryId ?? "none",
              label: c.name ?? "ไม่มีหมวดหมู่",
              value: c.revenue,
              note: itemRevenue ? pct(c.revenue / itemRevenue, 0) : null,
            }))}
          />
        </Section>
      </div>
    </div>
  );
}

export function salesCsv(data, { range, prevRange, previous, groupBy }) {
  const b = data.breakdown ?? {};
  return [
    { title: `รายงานยอดขาย ${range.start} ถึง ${range.end}`, always: true },
    {
      title: "สรุป",
      headers: ["รายการ", "ช่วงนี้", `ช่วงก่อน (${prevRange.start} ถึง ${prevRange.end})`],
      rows: [
        ["ยอดขายสุทธิ", data.totalRevenue, previous?.totalRevenue ?? ""],
        ["ออเดอร์ที่ชำระแล้ว", data.totalOrders, previous?.totalOrders ?? ""],
        ["ยอดเฉลี่ยต่อออเดอร์", data.averageOrderValue, previous?.averageOrderValue ?? ""],
        ["จำนวนชิ้นที่ขายได้", data.itemsSold, previous?.itemsSold ?? ""],
        ["ลูกค้าชำระทั้งหมด", b.grossSales, previous?.breakdown?.grossSales ?? ""],
        ["VAT", b.tax, previous?.breakdown?.tax ?? ""],
        ["ค่าจัดส่ง", b.shipping, previous?.breakdown?.shipping ?? ""],
        ["ส่วนลด", b.discounts, previous?.breakdown?.discounts ?? ""],
        ["คืนเงิน", b.refunds, previous?.breakdown?.refunds ?? ""],
      ],
    },
    {
      title: "ยอดขายตามช่วงเวลา",
      headers: ["วันที่", "ออเดอร์", "ยอดขายสุทธิ"],
      rows: fillSeries(data.dailySales, range, groupBy).map((r) => [r.date, r.count, r.total]),
    },
    {
      title: "สินค้าขายดี",
      headers: ["อันดับ", "สินค้า", "จำนวนชิ้น", "ยอดขาย"],
      rows: (data.topProducts ?? []).map((p, i) => [i + 1, p.name ?? "", p.quantity, p.revenue]),
    },
    {
      title: "ยอดขายตามหมวดหมู่",
      headers: ["หมวดหมู่", "ยอดขาย"],
      rows: (data.byCategory ?? []).map((c) => [c.name ?? "ไม่มีหมวดหมู่", c.revenue]),
    },
  ];
}

// --- Orders ------------------------------------------------------------------

const countOf = (list, key, value) => list?.find((s) => s[key] === value)?.count ?? 0;

export function OrdersReport({ data, previous, range, prevRange, groupBy }) {
  const t = trend(data, previous, range, prevRange, groupBy, "count");
  const paidRate = (d) => (d?.totalOrders ? (countOf(d.paymentBreakdown, "paymentStatus", "completed") + countOf(d.paymentBreakdown, "paymentStatus", "partially_refunded") + countOf(d.paymentBreakdown, "paymentStatus", "refunded")) / d.totalOrders : null);
  const nowPaid = paidRate(data);
  const prevPaid = paidRate(previous);
  const unpaid = countOf(data.paymentBreakdown, "paymentStatus", "pending") + countOf(data.paymentBreakdown, "paymentStatus", "processing");

  return (
    <div className="space-y-4">
      <KpiGrid>
        <Kpi label="ออเดอร์ทั้งหมด" value={num(data.totalOrders)} delta={change(data.totalOrders, previous?.totalOrders)} hint="รวมที่ยังไม่ชำระ" />
        <Kpi
          label="ชำระเงินสำเร็จ"
          value={nowPaid == null ? "–" : pct(nowPaid)}
          delta={nowPaid != null && prevPaid != null ? nowPaid - prevPaid : null}
          points
        />
        <Kpi
          label="อัตรายกเลิก"
          value={pct(data.cancellationRate)}
          delta={previous?.totalOrders ? data.cancellationRate - previous.cancellationRate : null}
          inverse
          points
        />
        <Kpi label="ยังรอชำระ" value={num(unpaid)} hint="หมดเวลาจะยกเลิกอัตโนมัติ" />
      </KpiGrid>

      <Section title="จำนวนออเดอร์" description="ทุกออเดอร์ที่สร้างในช่วงนี้ เส้นประคือช่วงก่อนหน้า">
        <TrendChart labels={t.labels} current={t.current} previous={t.previous} format={(v) => num(v)} />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="สถานะออเดอร์">
          <BarList
            format={num}
            total={data.totalOrders}
            items={(data.statusBreakdown ?? [])
              .slice()
              .sort((a, b) => b.count - a.count)
              .map((s) => ({
                key: s.status,
                label: ORDER_STATUS[s.status] ?? s.status,
                value: s.count,
                note: data.totalOrders ? pct(s.count / data.totalOrders, 0) : null,
                tone: s.status === "cancelled" ? "bg-danger" : s.status === "pending" ? "bg-warning" : "bg-fg",
              }))}
          />
        </Section>
        <Section title="สถานะการชำระเงิน">
          <BarList
            format={num}
            total={data.totalOrders}
            items={(data.paymentBreakdown ?? [])
              .slice()
              .sort((a, b) => b.count - a.count)
              .map((s) => ({
                key: s.paymentStatus,
                label: PAYMENT_STATUS[s.paymentStatus] ?? s.paymentStatus,
                value: s.count,
                note: data.totalOrders ? pct(s.count / data.totalOrders, 0) : null,
                tone: s.paymentStatus === "completed" ? "bg-success" : s.paymentStatus === "failed" ? "bg-danger" : "bg-fg-subtle",
              }))}
          />
        </Section>
      </div>
    </div>
  );
}

export function ordersCsv(data, { range, groupBy }) {
  return [
    { title: `รายงานออเดอร์ ${range.start} ถึง ${range.end}`, always: true },
    {
      title: "สรุป",
      headers: ["รายการ", "ค่า"],
      rows: [
        ["ออเดอร์ทั้งหมด", data.totalOrders],
        ["อัตรายกเลิก", data.cancellationRate],
      ],
    },
    { title: "สถานะออเดอร์", headers: ["สถานะ", "จำนวน"], rows: (data.statusBreakdown ?? []).map((s) => [ORDER_STATUS[s.status] ?? s.status, s.count]) },
    {
      title: "สถานะการชำระเงิน",
      headers: ["สถานะ", "จำนวน"],
      rows: (data.paymentBreakdown ?? []).map((s) => [PAYMENT_STATUS[s.paymentStatus] ?? s.paymentStatus, s.count]),
    },
    {
      title: "ออเดอร์ตามช่วงเวลา",
      headers: ["วันที่", "ออเดอร์", "มูลค่ารวม (ทุกสถานะ)"],
      rows: fillSeries(data.dailySales, range, groupBy).map((r) => [r.date, r.count, r.total]),
    },
  ];
}

// --- Inventory ---------------------------------------------------------------

const variantName = (v) => [v.color, v.size].filter(Boolean).join(" / ");

export function InventoryReport({ data }) {
  const stockColumns = [
    { key: "name", header: "สินค้า", render: (v) => v.product?.name ?? "-" },
    { key: "variant", header: "ตัวเลือก", render: (v) => <span className="text-fg-muted">{variantName(v) || "-"}</span> },
    { key: "sku", header: "SKU", render: (v) => <span className="font-mono text-xs text-fg-muted">{v.sku}</span> },
    { key: "stock", header: "คงเหลือ", align: "right", render: (v) => <span className={v.stock === 0 ? "font-semibold text-danger" : "font-semibold text-warning"}>{v.stock}</span> },
  ];
  return (
    <div className="space-y-4">
      <KpiGrid>
        <Kpi label="มูลค่าสต็อก (ราคาขาย)" value={baht(data.stockValue)} hint="สินค้าที่เปิดขาย" />
        <Kpi label="จำนวนชิ้นในสต็อก" value={num(data.totalUnits)} hint={`${num(data.activeProducts)} จาก ${num(data.totalProducts)} สินค้าเปิดขาย`} />
        <Kpi label={`ใกล้หมด (≤ ${data.threshold ?? 5} ชิ้น)`} value={num(data.lowStockCount)} hint="ตัวเลือกสินค้า" />
        <Kpi label="หมดสต็อก" value={num(data.outOfStockCount)} hint="ตัวเลือกสินค้า" />
      </KpiGrid>
      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="หมดสต็อก" description="ลูกค้าเลือกตัวเลือกเหล่านี้ไม่ได้ ควรเติมก่อน">
          <Table rows={data.outOfStockItems} columns={stockColumns} empty="ไม่มีสินค้าหมดสต็อก" />
        </Section>
        <Section title="ใกล้หมด" description="เรียงจากเหลือน้อยที่สุด">
          <Table rows={data.lowStockItems} columns={stockColumns} empty="ไม่มีสินค้าใกล้หมด" />
        </Section>
      </div>
    </div>
  );
}

export function inventoryCsv(data) {
  const rows = (list) => (list ?? []).map((v) => [v.product?.name ?? "", variantName(v), v.sku, v.stock]);
  return [
    { title: `รายงานสินค้าคงคลัง ณ ${new Date().toLocaleString("th-TH")}`, always: true },
    {
      title: "สรุป",
      headers: ["รายการ", "ค่า"],
      rows: [
        ["มูลค่าสต็อก (ราคาขาย)", data.stockValue],
        ["จำนวนชิ้นในสต็อก", data.totalUnits],
        ["สินค้าทั้งหมด", data.totalProducts],
        ["สินค้าที่เปิดขาย", data.activeProducts],
        ["ตัวเลือกใกล้หมด", data.lowStockCount],
        ["ตัวเลือกหมดสต็อก", data.outOfStockCount],
      ],
    },
    { title: "หมดสต็อก", headers: ["สินค้า", "ตัวเลือก", "SKU", "คงเหลือ"], rows: rows(data.outOfStockItems) },
    { title: "ใกล้หมด", headers: ["สินค้า", "ตัวเลือก", "SKU", "คงเหลือ"], rows: rows(data.lowStockItems) },
  ];
}

// --- Customers ---------------------------------------------------------------

export function CustomerReport({ data, previous }) {
  const repeat = data.activeCustomers ? data.returningCustomers / data.activeCustomers : null;
  const prevRepeat = previous?.activeCustomers ? previous.returningCustomers / previous.activeCustomers : null;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <Kpi label="ลูกค้าใหม่" value={num(data.newCustomers)} delta={change(data.newCustomers, previous?.newCustomers)} hint="สมัครในช่วงนี้" />
        <Kpi label="ลูกค้าที่ซื้อ" value={num(data.activeCustomers)} delta={change(data.activeCustomers, previous?.activeCustomers)} />
        <Kpi
          label="ซื้อซ้ำ"
          value={repeat == null ? "–" : pct(repeat)}
          delta={repeat != null && prevRepeat != null ? repeat - prevRepeat : null}
          points
          hint={`${num(data.returningCustomers)} คน`}
        />
        <Kpi label="ยอดซื้อเฉลี่ยต่อออเดอร์" value={baht(data.averageOrderValue)} delta={change(data.averageOrderValue, previous?.averageOrderValue)} />
      </KpiGrid>
      <Section title="ลูกค้าที่ซื้อมากที่สุด" description={`จากทั้งหมด ${num(data.totalCustomers)} บัญชี`}>
        <Table
          rows={data.topCustomers}
          empty="ยังไม่มีลูกค้าซื้อในช่วงนี้"
          columns={[
            { key: "rank", header: "#", render: (_, i) => <span className="text-fg-muted">{i + 1}</span> },
            {
              key: "name",
              header: "ลูกค้า",
              render: (c) => (
                <span>
                  {c.name || "-"}
                  <span className="block text-xs text-fg-muted">{c.email}</span>
                </span>
              ),
            },
            { key: "orderCount", header: "ออเดอร์", align: "right", render: (c) => num(c.orderCount) },
            { key: "totalSpent", header: "ยอดซื้อ", align: "right", render: (c) => baht(c.totalSpent) },
          ]}
        />
      </Section>
    </div>
  );
}

export function customerCsv(data, { range }) {
  return [
    { title: `รายงานลูกค้า ${range.start} ถึง ${range.end}`, always: true },
    {
      title: "สรุป",
      headers: ["รายการ", "ค่า"],
      rows: [
        ["บัญชีทั้งหมด", data.totalCustomers],
        ["ลูกค้าใหม่", data.newCustomers],
        ["ลูกค้าที่ซื้อ", data.activeCustomers],
        ["ลูกค้าซื้อซ้ำ", data.returningCustomers],
        ["ยอดซื้อเฉลี่ยต่อออเดอร์", data.averageOrderValue],
      ],
    },
    {
      title: "ลูกค้าที่ซื้อมากที่สุด",
      headers: ["อันดับ", "ชื่อ", "อีเมล", "ออเดอร์", "ยอดซื้อ"],
      rows: (data.topCustomers ?? []).map((c, i) => [i + 1, c.name ?? "", c.email, c.orderCount, c.totalSpent]),
    },
  ];
}

// --- Suppliers ---------------------------------------------------------------

export function SupplierReport({ data }) {
  return (
    <div className="space-y-4">
      <KpiGrid>
        <Kpi label="ซัพพลายเออร์ทั้งหมด" value={num(data.totalSuppliers)} />
        <Kpi label="ใช้งานอยู่" value={num(data.activeSuppliers)} />
      </KpiGrid>
      <Section title="ซัพพลายเออร์" description="ต้นทุนและระยะเวลาส่งของเฉลี่ยจากสินค้าที่ผูกไว้">
        <Table
          rows={data.suppliers}
          empty="ยังไม่มีซัพพลายเออร์"
          columns={[
            { key: "name", header: "ชื่อ" },
            { key: "status", header: "สถานะ", render: (s) => SUPPLIER_STATUS[s.status] ?? s.status },
            { key: "productCount", header: "สินค้า", align: "right", render: (s) => num(s.productCount) },
            { key: "averageCost", header: "ต้นทุนเฉลี่ย", align: "right", render: (s) => baht(s.averageCost, 2) },
            { key: "averageLeadTime", header: "ส่งของเฉลี่ย", align: "right", render: (s) => `${s.averageLeadTime} วัน` },
          ]}
        />
      </Section>
    </div>
  );
}

export function supplierCsv(data) {
  return [
    { title: "รายงานซัพพลายเออร์", always: true },
    {
      headers: ["ชื่อ", "สถานะ", "จำนวนสินค้า", "ต้นทุนเฉลี่ย", "ส่งของเฉลี่ย (วัน)"],
      rows: (data.suppliers ?? []).map((s) => [s.name, SUPPLIER_STATUS[s.status] ?? s.status, s.productCount, s.averageCost, s.averageLeadTime]),
    },
  ];
}
