import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
import { createUser, loginAs } from "./helpers/factories.js";
import { createOrder } from "./helpers/fixtures.js";

const { db } = await import("../config/db.js");
const schema = await import("../models/schema.js");
const { eq } = await import("drizzle-orm");
const { PROVINCE_ZONES } = await import("../utils/provinceZones.js");

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function zoneNamed(name) {
  const existing = await db.query.shippingZones.findFirst({ where: eq(schema.shippingZones.name, name) });
  if (existing) return existing;
  const [zone] = await db.insert(schema.shippingZones).values({ name, baseCost: "50.00" }).returning();
  return zone;
}

const body = (overrides = {}) => ({
  fullName: "Somchai Jaidee",
  phoneNumber: "081-234-5678",
  addressLine1: "99 Sukhumvit Rd",
  province: "กรุงเทพมหานคร",
  district: "วัฒนา",
  subdistrict: "คลองเตยเหนือ",
  postalCode: "10110",
  ...overrides,
});

test("every province in the address data has a shipping zone", () => {
  const csv = fs.readFileSync(path.join(backendRoot, "src/seed/csv/provinces.csv"), "utf8");
  const names = csv.trim().split(/\r?\n/).slice(1).map((line) => line.split(",")[2].trim());
  expect(names).toHaveLength(77);
  expect(names.filter((name) => !PROVINCE_ZONES[name])).toEqual([]);
});

describe("own addresses", () => {
  test("the first address becomes the default and gets its shipping zone", async () => {
    const central = await zoneNamed("Central");
    const { agent } = await loginAs("user");

    const first = await agent.post("/api/addresses").send(body({ type: "shipping", label: "Home" }));
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ isDefault: true, position: 0, shippingZoneId: central.id, country: "TH" });

    const second = await agent.post("/api/addresses").send(body({ addressLine1: "1 Silom" }));
    expect(second.body).toMatchObject({ isDefault: false, position: 1 });

    const list = await agent.get("/api/addresses");
    expect(list.body.addresses.map((a) => a.id)).toEqual([first.body.id, second.body.id]);
  });

  test("a new default replaces the old one (exactly one default)", async () => {
    const { agent } = await loginAs("user");
    const a = (await agent.post("/api/addresses").send(body())).body;
    const b = (await agent.post("/api/addresses").send(body({ isDefault: true }))).body;
    expect(b.isDefault).toBe(true);

    const defaults = (await agent.get("/api/addresses")).body.addresses.filter((x) => x.isDefault);
    expect(defaults.map((x) => x.id)).toEqual([b.id]);

    expect((await agent.put(`/api/addresses/${a.id}/default`)).body.isDefault).toBe(true);
    expect((await agent.put(`/api/addresses/${a.id}/default`)).status).toBe(200); // idempotent
    const after = (await agent.get("/api/addresses")).body.addresses.filter((x) => x.isDefault);
    expect(after.map((x) => x.id)).toEqual([a.id]);
  });

  test("update changes the zone with the province and protects the default", async () => {
    const north = await zoneNamed("North");
    const { agent } = await loginAs("user");
    const address = (await agent.post("/api/addresses").send(body())).body;

    const moved = await agent.put(`/api/addresses/${address.id}`).send({ province: "เพชรบูรณ์" });
    expect(moved.body.shippingZoneId).toBe(north.id);
    expect((await agent.put(`/api/addresses/${address.id}`).send({ isDefault: false })).status).toBe(400);
    expect((await agent.put(`/api/addresses/${address.id}`).send({ phoneNumber: "call me" })).status).toBe(400);
    expect((await agent.put(`/api/addresses/${address.id}`).send({})).status).toBe(400);
  });

  test("deleting the default promotes the next address; the last one can be deleted", async () => {
    const { agent } = await loginAs("user");
    const a = (await agent.post("/api/addresses").send(body())).body;
    const b = (await agent.post("/api/addresses").send(body({ addressLine1: "2nd" }))).body;

    expect((await agent.delete(`/api/addresses/${a.id}`)).status).toBe(204);
    const [remaining] = (await agent.get("/api/addresses")).body.addresses;
    expect(remaining).toMatchObject({ id: b.id, isDefault: true });
    expect((await agent.delete(`/api/addresses/${b.id}`)).status).toBe(204);
    expect((await agent.get("/api/addresses")).body.addresses).toHaveLength(0);
  });

  test("an address used by an order cannot be deleted", async () => {
    const { agent, user } = await loginAs("user");
    const address = (await agent.post("/api/addresses").send(body())).body;
    await createOrder(user.id, { shippingAddressId: address.id, billingAddressId: address.id });
    const res = await agent.delete(`/api/addresses/${address.id}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("FOREIGN_KEY_VIOLATION");
  });

  test("other users' addresses are invisible", async () => {
    const { agent } = await loginAs("user");
    const { agent: owner } = await loginAs("user");
    const address = (await owner.post("/api/addresses").send(body())).body;

    expect((await agent.put(`/api/addresses/${address.id}`).send({ fullName: "Hacker" })).status).toBe(404);
    expect((await agent.put(`/api/addresses/${address.id}/default`)).status).toBe(404);
    expect((await agent.delete(`/api/addresses/${address.id}`)).status).toBe(404);
    expect((await agent.get("/api/addresses")).body.addresses).toHaveLength(0);
  });

  test("validation and authentication", async () => {
    const { agent } = await loginAs("user");
    expect((await agent.post("/api/addresses").send({ fullName: "x" })).status).toBe(400);
    expect((await agent.delete("/api/addresses/not-a-uuid")).status).toBe(404);
    expect((await (await newAgent()).get("/api/addresses")).status).toBe(401);
  });
});

describe("admin address views", () => {
  test("list all, a user's addresses, and one address", async () => {
    const { agent: admin } = await loginAs("admin");
    const { agent: customer, user } = await loginAs("user");
    const name = `Admin View ${randomUUID().slice(0, 6)}`;
    const address = (await customer.post("/api/addresses").send(body({ fullName: name }))).body;

    const all = await admin.get("/api/addresses/admin/all").query({ search: name });
    expect(all.status).toBe(200);
    expect(all.body.addresses).toHaveLength(1);
    expect(all.body.addresses[0].user).toMatchObject({ id: user.id, email: user.email });

    const forUser = await admin.get(`/api/addresses/admin/user/${user.id}`);
    expect(forUser.body.addresses.map((a) => a.id)).toEqual([address.id]);
    expect((await admin.get(`/api/addresses/admin/${address.id}`)).body.id).toBe(address.id);

    expect((await admin.get(`/api/addresses/admin/user/${randomUUID()}`)).status).toBe(404);
    expect((await admin.get(`/api/addresses/admin/${randomUUID()}`)).status).toBe(404);
  });

  test("customers cannot use them", async () => {
    const { agent } = await loginAs("user");
    const someone = await createUser();
    expect((await agent.get("/api/addresses/admin/all")).status).toBe(403);
    expect((await agent.get(`/api/addresses/admin/user/${someone.id}`)).status).toBe(403);
    expect((await agent.get(`/api/addresses/admin/${randomUUID()}`)).status).toBe(403);
  });
});

describe("address data (Thai divisions)", () => {
  test("provinces, districts and subdistricts, disambiguated by province", async () => {
    const tag = randomUUID().slice(0, 6);
    const [p1, p2] = await db
      .insert(schema.provinces)
      .values([
        { code: `A${tag}`, nameTh: `จังหวัดหนึ่ง${tag}` },
        { code: `B${tag}`, nameTh: `จังหวัดสอง${tag}` },
      ])
      .returning();
    // Same district name in two provinces.
    const [d1, d2] = await db
      .insert(schema.districts)
      .values([
        { provinceId: p1.id, code: "01", nameTh: `เฉลิมพระเกียรติ${tag}` },
        { provinceId: p2.id, code: "01", nameTh: `เฉลิมพระเกียรติ${tag}` },
      ])
      .returning();
    await db.insert(schema.subdistricts).values([
      { districtId: d1.id, provinceId: p1.id, code: "01", nameTh: `ตำบลหนึ่ง${tag}`, zipcode: "11111" },
      { districtId: d2.id, provinceId: p2.id, code: "01", nameTh: `ตำบลสอง${tag}`, zipcode: "22222" },
    ]);
    const agent = await newAgent();

    const provinces = await agent.get("/api/addressData/provinces");
    expect(provinces.status).toBe(200);
    expect(provinces.headers["cache-control"]).toContain("max-age");
    expect(provinces.body.map((p) => p.nameTh)).toEqual(expect.arrayContaining([p1.nameTh, p2.nameTh]));

    const districts = await agent.get("/api/addressData/districts").query({ province: p2.nameTh });
    expect(districts.body.map((d) => d.id)).toEqual([d2.id]);

    const sub = await agent
      .get("/api/addressData/subdistricts")
      .query({ district: d2.nameTh, province: p2.nameTh });
    expect(sub.body.map((s) => s.zipcode)).toEqual(["22222"]);

    expect((await agent.get("/api/addressData/districts")).body).toEqual([]);
    expect((await agent.get("/api/addressData/subdistricts").query({ district: "ไม่มี" })).body).toEqual([]);
  });
});
