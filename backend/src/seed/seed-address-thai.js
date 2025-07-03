import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { db } from "../config/db.js";
import { provinces, districts, subdistricts } from "../models/schema.js";
import { eq } from "drizzle-orm";

const CSV_DIR = path.resolve(process.cwd(), "frontend/public/CSV thailand map");

function normalizeKey(key) {
  if (key === undefined || key === null) return "";
  return String(key).trim().replace(/^0+/, ""); // remove leading zeros
}

async function seedProvinces() {
  await db.delete(subdistricts);
  await db.delete(districts);
  await db.delete(provinces);
  const file = path.join(CSV_DIR, "provinces.csv");
  const csv = fs.readFileSync(file, "utf8");
  const records = parse(csv, { columns: true, skip_empty_lines: true });
  let skipped = 0;
  let inserted = 0;
  const provinceIdMap = {};
  for (const row of records) {
    const name_th = row.PROVINCE_THAI;
    if (!name_th) {
      console.warn("Skip province row (no name_th):", row);
      skipped++;
      continue;
    }
    const result = await db
      .insert(provinces)
      .values({
        code: row.CODE,
        name_th,
        name_en: row.PROVINCE_ENGLISH || null,
      })
      .returning({ id: provinces.id });
    provinceIdMap[normalizeKey(row.PROVINCE_ID)] = result[0].id;
    inserted++;
  }
  console.log("Seeded provinces:", inserted, "Skipped:", skipped);
  return provinceIdMap;
}

async function seedDistricts(provinceIdMap) {
  await db.delete(districts);
  const file = path.join(CSV_DIR, "districts.csv");
  const csv = fs.readFileSync(file, "utf8");
  const records = parse(csv, { columns: true, skip_empty_lines: true });
  let skipped = 0;
  let inserted = 0;
  const districtIdMap = {};
  const seenCodes = new Set();
  for (const row of records) {
    const name_th = row.DISTRICT_THAI;
    if (!name_th) {
      console.warn("Skip district row (no name_th):", row);
      skipped++;
      continue;
    }
    const province_id = provinceIdMap[normalizeKey(row.PROVINCE_ID)];
    if (!province_id) {
      console.warn("Skip district row (no province_id):", row, {
        PROVINCE_ID: row.PROVINCE_ID,
      });
      skipped++;
      continue;
    }
    const codeKey = `${row.PROVINCE_ID}-${row.CODE}`;
    if (seenCodes.has(codeKey)) {
      console.warn("Skip district row (duplicate code in province):", row);
      skipped++;
      continue;
    }
    seenCodes.add(codeKey);
    const result = await db
      .insert(districts)
      .values({
        code: row.CODE,
        province_id,
        name_th,
        name_en: row.DISTRICT_ENGLISH || null,
      })
      .returning({ id: districts.id, province_id: districts.province_id });
    districtIdMap[normalizeKey(row.DISTRICT_ID)] = {
      id: result[0].id,
      province_id: result[0].province_id,
    };
    inserted++;
  }
  console.log("Seeded districts:", inserted, "Skipped:", skipped);
  return districtIdMap;
}

async function seedSubDistricts(provinceIdMap, districtIdMap) {
  await db.delete(subdistricts);
  const file = path.join(CSV_DIR, "sub_districts.csv");
  const csv = fs.readFileSync(file, "utf8");
  const records = parse(csv, { columns: true, skip_empty_lines: true });
  let skipped = 0;
  let inserted = 0;
  for (const row of records) {
    const name_th = row.SUB_DISTRICT_THAI;
    if (!name_th) {
      console.warn("Skip subdistrict row (no name_th):", row);
      skipped++;
      continue;
    }
    const districtObj = districtIdMap[normalizeKey(row.DISTRICT_ID)];
    const district_id = districtObj?.id;
    const province_id = districtObj?.province_id;
    if (!district_id || !province_id) {
      console.warn(
        "Skip subdistrict row (no district_id or province_id):",
        row,
        { DISTRICT_ID: row.DISTRICT_ID }
      );
      skipped++;
      continue;
    }
    await db.insert(subdistricts).values({
      code: row.CODE,
      district_id,
      province_id,
      name_th,
      name_en: row.SUB_DISTRICT_ENGLISH || null,
      zipcode: row.POSTAL_CODE || null,
      latitude: row.LATITUDE || null,
      longitude: row.LONGITUDE || null,
    });
    inserted++;
  }
  console.log("Seeded subdistricts:", inserted, "Skipped:", skipped);
}

async function main() {
  const provinceIdMap = await seedProvinces();
  const districtIdMap = await seedDistricts(provinceIdMap);
  await seedSubDistricts(provinceIdMap, districtIdMap);
  console.log("All Thai address data seeded!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
