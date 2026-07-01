import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse/sync";
import { db } from "../config/db.js";
import { provinces, districts, subdistricts } from "../models/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_DIR = path.join(__dirname, "csv");

const REQUIRED_CSV = ["provinces.csv", "districts.csv", "sub_districts.csv"];

function assertCsvFiles() {
  if (!fs.existsSync(CSV_DIR)) {
    throw new Error(
      `CSV directory not found: ${CSV_DIR}\n` +
        "Expected backend/src/seed/csv/ with provinces.csv, districts.csv, sub_districts.csv"
    );
  }
  for (const name of REQUIRED_CSV) {
    const file = path.join(CSV_DIR, name);
    if (!fs.existsSync(file)) {
      throw new Error(`Missing CSV file: ${file}`);
    }
  }
}

function normalizeKey(key) {
  if (key === undefined || key === null) return "";
  return String(key).trim().replace(/^0+/, "");
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
    const nameTh = row.PROVINCE_THAI;
    if (!nameTh) {
      console.warn("Skip province row (no nameTh):", row);
      skipped++;
      continue;
    }
    const result = await db
      .insert(provinces)
      .values({
        code: row.CODE,
        nameTh,
        nameEn: row.PROVINCE_ENGLISH || null,
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
    const nameTh = row.DISTRICT_THAI;
    if (!nameTh) {
      console.warn("Skip district row (no nameTh):", row);
      skipped++;
      continue;
    }
    const provinceId = provinceIdMap[normalizeKey(row.PROVINCE_ID)];
    if (!provinceId) {
      console.warn("Skip district row (no provinceId):", row, {
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
        provinceId,
        nameTh,
        nameEn: row.DISTRICT_ENGLISH || null,
      })
      .returning({ id: districts.id, provinceId: districts.provinceId });
    districtIdMap[normalizeKey(row.DISTRICT_ID)] = {
      id: result[0].id,
      provinceId: result[0].provinceId,
    };
    inserted++;
  }
  console.log("Seeded districts:", inserted, "Skipped:", skipped);
  return districtIdMap;
}

async function seedSubDistricts(districtIdMap) {
  await db.delete(subdistricts);
  const file = path.join(CSV_DIR, "sub_districts.csv");
  const csv = fs.readFileSync(file, "utf8");
  const records = parse(csv, { columns: true, skip_empty_lines: true });
  let skipped = 0;
  let inserted = 0;
  for (const row of records) {
    const nameTh = row.SUB_DISTRICT_THAI;
    if (!nameTh) {
      console.warn("Skip subdistrict row (no nameTh):", row);
      skipped++;
      continue;
    }
    const districtObj = districtIdMap[normalizeKey(row.DISTRICT_ID)];
    const districtId = districtObj?.id;
    const provinceId = districtObj?.provinceId;
    if (!districtId || !provinceId) {
      console.warn(
        "Skip subdistrict row (no districtId or provinceId):",
        row,
        { DISTRICT_ID: row.DISTRICT_ID }
      );
      skipped++;
      continue;
    }
    await db.insert(subdistricts).values({
      code: row.CODE,
      districtId,
      provinceId,
      nameTh,
      nameEn: row.SUB_DISTRICT_ENGLISH || null,
      zipcode: row.POSTAL_CODE || null,
    });
    inserted++;
  }
  console.log("Seeded subdistricts:", inserted, "Skipped:", skipped);
}

async function main() {
  assertCsvFiles();
  console.log("Reading CSV from:", CSV_DIR);
  const provinceIdMap = await seedProvinces();
  const districtIdMap = await seedDistricts(provinceIdMap);
  await seedSubDistricts(districtIdMap);
  console.log("All Thai address data seeded!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
