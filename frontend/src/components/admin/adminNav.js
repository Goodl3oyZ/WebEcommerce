export const ADMIN_NAV = [
  {
    value: "product-dashboard",
    label: "แดชบอร์ด",
    group: "ภาพรวม",
    keywords: "dashboard product overview",
  },
  {
    value: "products",
    label: "จัดการสินค้า",
    group: "แคตตาล็อก",
    keywords: "products sku inventory",
  },
  {
    value: "categories",
    label: "หมวดหมู่",
    group: "แคตตาล็อก",
    keywords: "categories",
  },
  {
    value: "brands",
    label: "แบรนด์",
    group: "แคตตาล็อก",
    keywords: "brands",
  },
  {
    value: "reviews",
    label: "รีวิวร้านค้า",
    group: "แคตตาล็อก",
    keywords: "reviews ratings",
  },
  {
    value: "orders",
    label: "ออเดอร์",
    group: "ขาย",
    keywords: "orders shipping",
  },
  {
    value: "users",
    label: "ผู้ใช้",
    group: "ขาย",
    keywords: "users customers",
  },
  {
    value: "support",
    label: "แชทลูกค้า",
    group: "ขาย",
    keywords: "chat support customer help",
    staff: true, // moderators (chat agents) see only items marked staff
  },
  {
    value: "coupons",
    label: "คูปอง",
    group: "ขาย",
    keywords: "coupons promo",
  },
  {
    value: "shipping",
    label: "การจัดส่ง",
    group: "ปฏิบัติการ",
    keywords: "shipping zones",
  },
  {
    value: "payments",
    label: "การชำระเงิน",
    group: "ปฏิบัติการ",
    keywords: "payments refund",
  },
  {
    value: "notifications",
    label: "การแจ้งเตือน",
    group: "ปฏิบัติการ",
    keywords: "notifications",
  },
  {
    value: "content",
    label: "บทความและหน้าเว็บ",
    group: "ปฏิบัติการ",
    keywords: "blog articles content about page cms",
  },
  {
    value: "reports",
    label: "รายงาน",
    group: "ระบบ",
    keywords: "reports analytics",
  },
  {
    value: "settings",
    label: "ตั้งค่า",
    group: "ระบบ",
    keywords: "settings theme",
  },
  {
    value: "seed",
    label: "Seed ข้อมูล",
    group: "ระบบ",
    keywords: "seed data address shipping mock test",
  },
];

/** Menu items this user may open (moderators: support chat only). */
export function navFor(user) {
  const admin = user?.role === "admin" || user?.role === "super_admin";
  return admin ? ADMIN_NAV : ADMIN_NAV.filter((item) => item.staff);
}

export function getAdminNavItem(value) {
  return ADMIN_NAV.find((item) => item.value === value) || ADMIN_NAV[0];
}
