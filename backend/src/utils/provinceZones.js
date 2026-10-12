import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { shippingZones } from "../models/schema.js";

/**
 * Province (Thai name, as in the address data) -> shipping zone name from the
 * seed. Must cover all 77 provinces: an unmapped province has no shipping
 * options, so its customers cannot check out (a test enforces this).
 */
export const PROVINCE_ZONES = {
  // Central
  กรุงเทพมหานคร: "Central",
  นนทบุรี: "Central",
  ปทุมธานี: "Central",
  สมุทรปราการ: "Central",
  พระนครศรีอยุธยา: "Central",
  อ่างทอง: "Central",
  ลพบุรี: "Central",
  สิงห์บุรี: "Central",
  ชัยนาท: "Central",
  สระบุรี: "Central",
  นครปฐม: "Central",
  สมุทรสาคร: "Central",
  สมุทรสงคราม: "Central",
  สุพรรณบุรี: "Central",
  นครนายก: "Central",
  // North
  เชียงใหม่: "North",
  เชียงราย: "North",
  ลำปาง: "North",
  ลำพูน: "North",
  แม่ฮ่องสอน: "North",
  แพร่: "North",
  น่าน: "North",
  พะเยา: "North",
  อุตรดิตถ์: "North",
  ตาก: "North",
  สุโขทัย: "North",
  พิษณุโลก: "North",
  พิจิตร: "North",
  กำแพงเพชร: "North",
  นครสวรรค์: "North",
  อุทัยธานี: "North",
  เพชรบูรณ์: "North",
  // Northeast
  นครราชสีมา: "Northeast",
  บุรีรัมย์: "Northeast",
  สุรินทร์: "Northeast",
  ศรีสะเกษ: "Northeast",
  อุบลราชธานี: "Northeast",
  ยโสธร: "Northeast",
  ชัยภูมิ: "Northeast",
  อำนาจเจริญ: "Northeast",
  บึงกาฬ: "Northeast",
  หนองบัวลำภู: "Northeast",
  ขอนแก่น: "Northeast",
  อุดรธานี: "Northeast",
  เลย: "Northeast",
  หนองคาย: "Northeast",
  มหาสารคาม: "Northeast",
  ร้อยเอ็ด: "Northeast",
  กาฬสินธุ์: "Northeast",
  สกลนคร: "Northeast",
  นครพนม: "Northeast",
  มุกดาหาร: "Northeast",
  // East
  ชลบุรี: "East",
  ระยอง: "East",
  จันทบุรี: "East",
  ตราด: "East",
  ฉะเชิงเทรา: "East",
  ปราจีนบุรี: "East",
  สระแก้ว: "East",
  // West
  ราชบุรี: "West",
  กาญจนบุรี: "West",
  เพชรบุรี: "West",
  ประจวบคีรีขันธ์: "West",
  // South
  นครศรีธรรมราช: "South",
  กระบี่: "South",
  พังงา: "South",
  ภูเก็ต: "South",
  สุราษฎร์ธานี: "South",
  ระนอง: "South",
  ชุมพร: "South",
  สงขลา: "South",
  สตูล: "South",
  ตรัง: "South",
  พัทลุง: "South",
  ปัตตานี: "South",
  ยะลา: "South",
  นราธิวาส: "South",
};

/** Shipping zone id for a province, or null when it has no (active) zone. */
export async function resolveShippingZoneId(province, txOrDb = db) {
  const zoneName = province ? PROVINCE_ZONES[province.trim()] : null;
  if (!zoneName) return null;
  const zone = await txOrDb.query.shippingZones.findFirst({ where: eq(shippingZones.name, zoneName) });
  return zone?.isActive === false ? null : zone?.id ?? null;
}
