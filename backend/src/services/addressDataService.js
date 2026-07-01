import { db } from "../config/db.js";
import { provinces, districts, subdistricts } from "../models/schema.js";
import { eq } from "drizzle-orm";

export const addressDataService = {
  async getProvinces() {
    return db.query.provinces.findMany();
  },
  async getDistrictsByProvinceName(provinceName) {
    if (!provinceName) return [];
    const prov = await db.query.provinces.findFirst({
      where: eq(provinces.nameTh, provinceName),
    });
    if (!prov) return [];
    return db.query.districts.findMany({
      where: eq(districts.provinceId, prov.id),
    });
  },
  async getSubdistrictsByDistrictName(districtName) {
    if (!districtName) return [];
    const dist = await db.query.districts.findFirst({
      where: eq(districts.nameTh, districtName),
    });
    if (!dist) return [];
    return db.query.subdistricts.findMany({
      where: eq(subdistricts.districtId, dist.id),
    });
  },
};
