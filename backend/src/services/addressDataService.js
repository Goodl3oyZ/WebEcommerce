import { db } from "../config/db.js";
import { provinces, districts, subdistricts } from "../models/schema.js";
import { and, asc, eq } from "drizzle-orm";

export const addressDataService = {
  async getProvinces() {
    return db.query.provinces.findMany({ orderBy: [asc(provinces.nameTh)] });
  },

  async getDistrictsByProvinceName(provinceName) {
    if (!provinceName) return [];
    const province = await db.query.provinces.findFirst({ where: eq(provinces.nameTh, provinceName) });
    if (!province) return [];
    return db.query.districts.findMany({
      where: eq(districts.provinceId, province.id),
      orderBy: [asc(districts.nameTh)],
    });
  },

  /**
   * District names repeat across provinces (e.g. เฉลิมพระเกียรติ), so the
   * province narrows the lookup when given.
   */
  async getSubdistrictsByDistrictName(districtName, provinceName) {
    if (!districtName) return [];
    let provinceId;
    if (provinceName) {
      const province = await db.query.provinces.findFirst({ where: eq(provinces.nameTh, provinceName) });
      if (!province) return [];
      provinceId = province.id;
    }
    const district = await db.query.districts.findFirst({
      where: and(eq(districts.nameTh, districtName), provinceId ? eq(districts.provinceId, provinceId) : undefined),
    });
    if (!district) return [];
    return db.query.subdistricts.findMany({
      where: eq(subdistricts.districtId, district.id),
      orderBy: [asc(subdistricts.nameTh)],
    });
  },
};
