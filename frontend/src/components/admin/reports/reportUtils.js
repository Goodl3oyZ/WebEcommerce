/**
 * Date ranges, period comparison, series gap-filling and CSV export for the
 * admin reports. Dates are YYYY-MM-DD in the shop's time zone (the API reads
 * plain dates as whole Thai days, endDate included).
 */

export const SHOP_TZ = "Asia/Bangkok";
const DAY = 24 * 60 * 60 * 1000;

/** Today in the shop's time zone. */
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TZ }).format(new Date());

const toDate = (s) => new Date(`${s}T00:00:00Z`);
const fmt = (d) => d.toISOString().slice(0, 10);
export const addDays = (s, n) => fmt(new Date(toDate(s).getTime() + n * DAY));
export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / DAY) + 1;

export const PRESETS = [
  { id: "today", label: "วันนี้" },
  { id: "7d", label: "7 วัน" },
  { id: "30d", label: "30 วัน" },
  { id: "thisMonth", label: "เดือนนี้" },
  { id: "lastMonth", label: "เดือนก่อน" },
  { id: "90d", label: "90 วัน" },
  { id: "thisYear", label: "ปีนี้" },
  { id: "custom", label: "กำหนดเอง" },
];

/** { start, end } for a preset (end included). */
export function presetRange(id, now = today()) {
  const [y, m] = now.split("-").map(Number);
  const pad = (n) => String(n).padStart(2, "0");
  switch (id) {
    case "today":
      return { start: now, end: now };
    case "7d":
      return { start: addDays(now, -6), end: now };
    case "90d":
      return { start: addDays(now, -89), end: now };
    case "thisMonth":
      return { start: `${y}-${pad(m)}-01`, end: now };
    case "lastMonth": {
      const first = new Date(Date.UTC(y, m - 2, 1));
      const last = new Date(Date.UTC(y, m - 1, 0));
      return { start: fmt(first), end: fmt(last) };
    }
    case "thisYear":
      return { start: `${y}-01-01`, end: now };
    case "30d":
    default:
      return { start: addDays(now, -29), end: now };
  }
}

/** Same date moved by whole months, clamped to the month's last day (31 Mar − 1 month = 28/29 Feb). */
function shiftMonths(s, months) {
  const [y, m, d] = s.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return fmt(new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDay))));
}

/**
 * What to compare with: calendar presets compare with the same dates one
 * month / one year earlier ("this year so far" vs "last year to the same
 * date"); anything else with the period of the same length right before.
 */
export function previousRange({ start, end }, preset) {
  if (preset === "thisMonth" || preset === "lastMonth") {
    const prevStart = shiftMonths(start, -1);
    const prevEnd = preset === "lastMonth" ? fmt(new Date(Date.UTC(...prevStart.split("-").slice(0, 2).map(Number), 0))) : shiftMonths(end, -1);
    return { start: prevStart, end: prevEnd };
  }
  if (preset === "thisYear") return { start: shiftMonths(start, -12), end: shiftMonths(end, -12) };
  const length = daysBetween(start, end);
  return { start: addDays(start, -length), end: addDays(start, -1) };
}

/** Sensible bucket for a range length. */
export const autoGroupBy = ({ start, end }) => {
  const days = daysBetween(start, end);
  return days <= 45 ? "day" : days <= 200 ? "week" : "month";
};

/** Start of the bucket containing `s` (weeks start on Monday, like Postgres). */
function bucketOf(s, groupBy) {
  const d = toDate(s);
  if (groupBy === "week") return fmt(new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY));
  if (groupBy === "month") return `${s.slice(0, 7)}-01`;
  if (groupBy === "year") return `${s.slice(0, 4)}-01-01`;
  return s;
}

/** Every bucket from start to end, with zeros where the API has no row. */
export function fillSeries(rows = [], { start, end }, groupBy, fields = ["count", "total"]) {
  const byKey = new Map(rows.map((r) => [r.date, r]));
  const out = [];
  let cursor = bucketOf(start, groupBy);
  const last = bucketOf(end, groupBy);
  for (let guard = 0; cursor <= last && guard < 800; guard++) {
    const row = byKey.get(cursor);
    out.push({ date: cursor, ...Object.fromEntries(fields.map((f) => [f, Number(row?.[f] ?? 0)])) });
    const d = toDate(cursor);
    if (groupBy === "week") cursor = addDays(cursor, 7);
    else if (groupBy === "month") cursor = fmt(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)));
    else if (groupBy === "year") cursor = `${d.getUTCFullYear() + 1}-01-01`;
    else cursor = addDays(cursor, 1);
  }
  return out;
}

// --- Formatting -------------------------------------------------------------

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** 1 ต.ค. / ต.ค. 69 depending on the bucket. */
export function bucketLabel(s, groupBy) {
  const [y, m, d] = s.split("-").map(Number);
  if (groupBy === "month") return `${TH_MONTHS[m - 1]} ${String((y + 543) % 100).padStart(2, "0")}`;
  if (groupBy === "year") return String(y + 543);
  return `${d} ${TH_MONTHS[m - 1]}`;
}

/** "1–31 ต.ค. 2569" style label for a range. */
export function rangeLabel({ start, end }) {
  const [ys, ms, ds] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  if (start === end) return `${ds} ${TH_MONTHS[ms - 1]} ${ys + 543}`;
  if (ys === ye && ms === me) return `${ds}–${de} ${TH_MONTHS[me - 1]} ${ye + 543}`;
  if (ys === ye) return `${ds} ${TH_MONTHS[ms - 1]} – ${de} ${TH_MONTHS[me - 1]} ${ye + 543}`;
  return `${ds} ${TH_MONTHS[ms - 1]} ${ys + 543} – ${de} ${TH_MONTHS[me - 1]} ${ye + 543}`;
}

export const baht = (n, digits = 0) => {
  const v = Number(n || 0);
  const text = `฿${Math.abs(v).toLocaleString("th-TH", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
  return v < 0 ? `−${text}` : text;
};
export const num = (n) => Number(n || 0).toLocaleString("th-TH");
export const pct = (ratio, digits = 1) => `${(Number(ratio || 0) * 100).toFixed(digits)}%`;

/** Relative change, or null when there is nothing to compare with. */
export const change = (current, previous) =>
  previous == null || Number(previous) === 0 ? null : (Number(current) - Number(previous)) / Number(previous);

export const ORDER_STATUS = {
  pending: "รอชำระเงิน",
  paid: "ชำระแล้ว",
  confirmed: "ยืนยันแล้ว",
  processing: "กำลังเตรียมของ",
  shipped: "จัดส่งแล้ว",
  delivered: "ส่งถึงแล้ว",
  refund_requested: "ขอคืนเงิน",
  cancelled: "ยกเลิก",
  refunded: "คืนเงินแล้ว",
};
export const PAYMENT_STATUS = {
  pending: "รอชำระ",
  processing: "กำลังยืนยัน",
  completed: "ชำระแล้ว",
  failed: "ไม่สำเร็จ / หมดเวลา",
  refunded: "คืนเงินแล้ว",
  partially_refunded: "คืนเงินบางส่วน",
};
export const SUPPLIER_STATUS = { active: "ใช้งาน", inactive: "ไม่ใช้งาน", pending: "รอตรวจสอบ" };

// --- CSV --------------------------------------------------------------------

const cell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Download sections ({ title, headers, rows }) as one CSV. UTF-8 with BOM so
 * Excel shows Thai correctly; numbers stay plain (no ฿ or separators).
 */
export function downloadCsv(filename, sections) {
  const lines = [];
  for (const section of sections) {
    if (!section.rows?.length && !section.always) continue;
    if (lines.length) lines.push("");
    if (section.title) lines.push(cell(section.title));
    if (section.headers) lines.push(section.headers.map(cell).join(","));
    for (const row of section.rows ?? []) lines.push(row.map(cell).join(","));
  }
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
