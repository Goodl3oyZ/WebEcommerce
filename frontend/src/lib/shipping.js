/**
 * Carriers the admin can pick when shipping, and where customers track them.
 * Thailand Post has its own tracking page; the others open 17TRACK, which
 * covers Thai carriers and detects the carrier from the number.
 */
export const CARRIERS = [
  { id: "thailandpost", name: "ไปรษณีย์ไทย", track: (n) => `https://track.thailandpost.co.th/?trackNumber=${encodeURIComponent(n)}` },
  { id: "kerry", name: "Kerry Express (KEX)" },
  { id: "flash", name: "Flash Express" },
  { id: "jt", name: "J&T Express" },
  { id: "ninjavan", name: "Ninja Van" },
  { id: "dhl", name: "DHL eCommerce" },
  { id: "other", name: "อื่น ๆ" },
];

const universal = (n) => `https://t.17track.net/en#nums=${encodeURIComponent(n)}`;

/** Display name for a stored carrier (an id above, or free text from older orders). */
export const carrierName = (value) => CARRIERS.find((c) => c.id === value)?.name ?? value ?? "";

/** Link to the carrier's tracking page, or null without a tracking number. */
export function trackingUrl(carrier, trackingNumber) {
  if (!trackingNumber) return null;
  const known = CARRIERS.find((c) => c.id === carrier);
  return known?.track ? known.track(trackingNumber) : universal(trackingNumber);
}

/** Thai labels for order statuses (admin and customer views). */
export const ORDER_STATUS_TH = {
  pending: "รอชำระเงิน",
  paid: "ชำระแล้ว",
  confirmed: "ยืนยันแล้ว",
  processing: "กำลังเตรียมสินค้า",
  shipped: "จัดส่งแล้ว",
  delivered: "จัดส่งสำเร็จ",
  refund_requested: "ขอคืนเงิน",
  cancelled: "ยกเลิก",
  refunded: "คืนเงินแล้ว",
};

/** Days after shipping before an unconfirmed order is closed (matches AUTO_DELIVER_DAYS). */
export const AUTO_DELIVER_DAYS = 7;
