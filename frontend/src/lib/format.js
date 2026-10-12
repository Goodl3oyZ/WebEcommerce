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
