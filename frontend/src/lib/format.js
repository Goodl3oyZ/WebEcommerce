/** Number, or null when the value is missing / not a positive price. */
export function toPrice(value) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** ฿1,290 or ฿1,290.50 — whole baht drop the decimals. */
export function formatTHB(value) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return "–";
  const hasFraction = Math.round(n * 100) % 100 !== 0;
  return `฿${n.toLocaleString("th-TH", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Same rounding as the backend: integer satang. */
export const toSatang = (value) => Math.round(Number(value || 0) * 100);
export const fromSatang = (satang) => satang / 100;

const rtf = typeof Intl !== "undefined" && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat("th", { numeric: "auto" }) : null;

/** "5 นาทีที่แล้ว", "เมื่อวาน"; dates older than a week as a short date. */
export function timeAgo(value, now = Date.now()) {
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return "";
  const seconds = Math.round((t - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "เมื่อสักครู่";
  if (!rtf || abs >= 7 * 86400) {
    return new Date(t).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  }
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86400), "day");
}
