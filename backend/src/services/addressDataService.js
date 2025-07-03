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
      where: eq(provinces.name_th, provinceName),
    });
    if (!prov) return [];
    return db.query.districts.findMany({
      where: eq(districts.province_id, prov.id),
    });
  },
  async getSubdistrictsByDistrictName(districtName) {
    if (!districtName) return [];
    const dist = await db.query.districts.findFirst({
      where: eq(districts.name_th, districtName),
    });
    if (!dist) return [];
    return db.query.subdistricts.findMany({
      where: eq(subdistricts.district_id, dist.id),
    });
  },
};
