/**
 * Card form helpers shared by checkout and "pay again" on the order page.
 * Inputs keep only what a card can contain, formatted as the customer types.
 */

/** 4242 4242 4242 4242 (digits only, at most 19). */
export const formatCardNumber = (value) =>
  value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();

/**
 * MM/YY. The slash appears after the month, a first digit of 2-9 becomes
 * 0X/, and deleting past the slash removes it too.
 */
export function formatExpiry(value, previous = "") {
  let digits = value.replace(/\D/g, "").slice(0, 4);
  const deleting = value.length < previous.length;
  if (digits.length === 1 && digits > "1") digits = `0${digits}`;
  if (digits.length < 2) return digits;
  if (digits.length === 2) return deleting ? digits : `${digits}/`;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export const formatCvc = (value) => value.replace(/\D/g, "").slice(0, 4);

export function validateCard({ number, name, expiry, cvc }) {
  const errors = {};
  const digits = number.replace(/\s/g, "");
  if (digits.length < 13 || digits.length > 19) errors.number = "หมายเลขบัตรต้องมี 13–19 หลัก";
  if (!name.trim()) errors.name = "กรุณากรอกชื่อบนบัตร";
  if (!/^\d{2}\/\d{2}$/.test(expiry)) errors.expiry = "รูปแบบ ดด/ปป";
  else {
    const [mm, yy] = expiry.split("/").map(Number);
    const now = new Date();
    const year = 2000 + yy;
    if (mm < 1 || mm > 12) errors.expiry = "เดือนต้องอยู่ระหว่าง 01–12";
    else if (year < now.getFullYear() || (year === now.getFullYear() && mm < now.getMonth() + 1))
      errors.expiry = "บัตรหมดอายุแล้ว";
  }
  if (!/^\d{3,4}$/.test(cvc)) errors.cvc = "CVC 3–4 หลัก";
  return errors;
}

const OMISE_ERRORS = {
  "number is invalid": "หมายเลขบัตรไม่ถูกต้อง",
  "brand not supported": "ไม่รองรับบัตรประเภทนี้ กรุณาใช้บัตรอื่น",
  "expiration month is invalid": "เดือนหมดอายุไม่ถูกต้อง",
  "expiration_month is invalid": "เดือนหมดอายุไม่ถูกต้อง",
  "expiration year is invalid": "ปีหมดอายุไม่ถูกต้อง",
  "expiration_year is invalid": "ปีหมดอายุไม่ถูกต้อง",
  "security code is invalid": "รหัส CVC ไม่ถูกต้อง",
  "name is invalid": "ชื่อบนบัตรไม่ถูกต้อง",
  "network error": "เชื่อมต่อระบบชำระเงินไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต",
};

/** Omise.js messages in Thai. */
export const cardErrorMessage = (msg = "") => {
  const lower = msg.toLowerCase();
  const key = Object.keys(OMISE_ERRORS).find((k) => lower.includes(k));
  return key ? OMISE_ERRORS[key] : msg || "ตรวจสอบข้อมูลบัตรอีกครั้ง";
};
