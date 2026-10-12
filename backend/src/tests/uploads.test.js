import { newAgent } from "./helpers/app.js";
import { loginAs } from "./helpers/factories.js";
import { PNG } from "./helpers/fixtures.js";

const HTML_AS_PNG = Buffer.from("<html><script>alert(1)</script></html>");
const attachPng = (req, name = "photo.png") => req.attach("image", PNG, { filename: name, contentType: "image/png" });

describe("avatar uploads", () => {
  test("POST/PUT /avatar set the profile image; DELETE removes it", async () => {
    const { agent, user } = await loginAs("user");

    const posted = await attachPng(agent.post("/api/uploads/avatar"));
    expect(posted.status).toBe(200);
    expect(posted.body.url).toMatch(new RegExp(`/profiles/profiles-${user.id}/`));
    expect(posted.body.user.password).toBeUndefined();
    expect((await fetch(posted.body.url)).status).toBe(200);

    const replaced = await attachPng(agent.put("/api/uploads/avatar"), "new.png");
    expect(replaced.body.url).not.toBe(posted.body.url);
    // The replaced file is removed from storage.
    expect((await fetch(posted.body.url)).status).toBe(404);

    const deleted = await agent.delete("/api/uploads/avatar");
    expect(deleted.status).toBe(200);
    expect(deleted.body.user.avatar).toBeNull();
    expect((await agent.delete("/api/uploads/avatar")).status).toBe(404);
  });

  test("rejects files that are not really images, SVG and missing files", async () => {
    const { agent } = await loginAs("user");
    const fake = await agent
      .post("/api/uploads/avatar")
      .attach("image", HTML_AS_PNG, { filename: "x.png", contentType: "image/png" });
    expect(fake.status).toBe(400);
    const svg = await agent
      .post("/api/uploads/avatar")
      .attach("image", Buffer.from("<svg/>"), { filename: "x.svg", contentType: "image/svg+xml" });
    expect(svg.status).toBe(400);
    expect((await agent.post("/api/uploads/avatar")).status).toBe(400);
  });
});

describe("review images (customer-owned)", () => {
  test("customers upload, replace and delete only their own files", async () => {
    const { agent, user } = await loginAs("user");
    const { agent: other } = await loginAs("user");

    const uploaded = await attachPng(agent.post("/api/uploads/review"));
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.fileName.startsWith(`reviews-${user.id}/`)).toBe(true);

    // Another customer cannot delete it, by key or by URL, or via oldFileName.
    expect((await other.delete("/api/uploads/review").send({ fileName: uploaded.body.fileName })).status).toBe(403);
    expect((await other.delete("/api/uploads/review").send({ fileName: uploaded.body.url })).status).toBe(403);
    const sneaky = await attachPng(other.put("/api/uploads/review").field("oldFileName", uploaded.body.fileName));
    expect(sneaky.status).toBe(403);
    expect((await fetch(uploaded.body.url)).status).toBe(200);

    const replaced = await attachPng(agent.put("/api/uploads/review").field("oldFileName", uploaded.body.url));
    expect(replaced.status).toBe(200);
    expect((await fetch(uploaded.body.url)).status).toBe(404);

    expect((await agent.delete("/api/uploads/review").send({ fileName: replaced.body.fileName })).status).toBe(200);
    expect((await agent.delete("/api/uploads/review").send({})).status).toBe(400);
    expect((await agent.delete("/api/uploads/review").send({ fileName: "https://evil.example/x.png" })).status).toBe(400);
  });
});

describe.each([
  ["product", "products", "productId"],
  ["brand", "brands", "brandId"],
  ["store", "stores", "storeId"],
])("%s images (admin)", (path, bucket, idField) => {
  test("admins upload under the entity id, replace and delete", async () => {
    const { agent } = await loginAs("admin");
    const entityId = "11111111-1111-4111-8111-111111111111";

    const uploaded = await attachPng(agent.post(`/api/uploads/${path}`).field(idField, entityId));
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.fileName.startsWith(`${bucket}-${entityId}/`)).toBe(true);
    expect((await fetch(uploaded.body.url)).status).toBe(200);

    const unassigned = await attachPng(agent.post(`/api/uploads/${path}`));
    expect(unassigned.body.fileName.startsWith(`${bucket}-unassigned/`)).toBe(true);
    expect((await attachPng(agent.post(`/api/uploads/${path}`).field(idField, "nope"))).status).toBe(400);

    const replaced = await attachPng(agent.put(`/api/uploads/${path}`).field("oldFileName", uploaded.body.fileName));
    expect(replaced.status).toBe(200);
    expect((await fetch(uploaded.body.url)).status).toBe(404);

    expect((await agent.delete(`/api/uploads/${path}`).send({ fileName: replaced.body.url })).status).toBe(200);
    expect((await agent.delete(`/api/uploads/${path}`).send({ fileName: unassigned.body.fileName })).status).toBe(200);
  });

  test("customers cannot use it", async () => {
    const { agent } = await loginAs("user");
    expect((await attachPng(agent.post(`/api/uploads/${path}`))).status).toBe(403);
    expect((await attachPng(agent.put(`/api/uploads/${path}`))).status).toBe(403);
    expect((await agent.delete(`/api/uploads/${path}`).send({ fileName: "x" })).status).toBe(403);
  });
});

test("uploads require authentication", async () => {
  const res = await attachPng((await newAgent()).post("/api/uploads/review"));
  expect(res.status).toBe(401);
});
