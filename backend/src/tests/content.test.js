import { newAgent } from "./helpers/app.js";
import { loginAs } from "./helpers/factories.js";

const { slugify } = await import("../services/contentService.js");

const article = (overrides = {}) => ({
  title: `How to choose a running watch ${Math.random().toString(36).slice(2, 7)}`,
  excerpt: "GPS, battery and fit",
  content: "<h2>GPS</h2><p>Pick one with dual-band GPS.</p>",
  ...overrides,
});

describe("content (blog articles and pages)", () => {
  test("drafts stay hidden; publishing lists the article and sets its date once", async () => {
    const { agent: admin } = await loginAs("admin");
    const visitor = await newAgent();

    const draft = await admin.post("/api/content/admin").send(article());
    expect(draft.status).toBe(201);
    expect(draft.body).toMatchObject({ kind: "article", status: "draft", publishedAt: null });
    expect(draft.body.slug).toMatch(/^how-to-choose-a-running-watch-[a-z0-9]+$/);
    expect((await visitor.get(`/api/content/articles/${draft.body.slug}`)).status).toBe(404);
    expect((await visitor.get("/api/content/articles")).body.articles.map((a) => a.id)).not.toContain(draft.body.id);

    const published = await admin.put(`/api/content/admin/${draft.body.id}`).send({ status: "published" });
    expect(published.body.publishedAt).toBeTruthy();
    const list = await visitor.get("/api/content/articles");
    const listed = list.body.articles.find((a) => a.id === draft.body.id);
    expect(listed).toMatchObject({ title: draft.body.title, author: { id: expect.any(String) } });
    expect(listed.content).toBeUndefined(); // list has no body
    const one = await visitor.get(`/api/content/articles/${draft.body.slug}`);
    expect(one.body.content).toContain("dual-band");

    // Editing later keeps the original publish date.
    const edited = await admin.put(`/api/content/admin/${draft.body.id}`).send({ title: "Renamed" });
    expect(edited.body.publishedAt).toBe(published.body.publishedAt);
  });

  test("slugs: made from the title (random for Thai-only), unique, editable", async () => {
    const { agent: admin } = await loginAs("admin");
    expect(slugify("Recovery 101: Massage Guns!")).toBe("recovery-101-massage-guns");
    expect(slugify("ฟื้นตัวหลังซ้อม")).toMatch(/^post-[0-9a-f]{6}$/);

    const a = await admin.post("/api/content/admin").send(article({ slug: "sleep-ring-guide" }));
    expect(a.body.slug).toBe("sleep-ring-guide");
    const dup = await admin.post("/api/content/admin").send(article({ slug: "sleep-ring-guide" }));
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe("SLUG_TAKEN");
    expect((await admin.post("/api/content/admin").send(article({ slug: "Bad Slug!" }))).status).toBe(400);

    const b = await admin.post("/api/content/admin").send(article());
    expect((await admin.put(`/api/content/admin/${b.body.id}`).send({ slug: "sleep-ring-guide" })).status).toBe(409);
    expect((await admin.put(`/api/content/admin/${a.body.id}`).send({ slug: "sleep-ring-guide" })).status).toBe(200);
  });

  test("pages are served by slug; covers can be a site path; long bodies are accepted", async () => {
    const { agent: admin } = await loginAs("admin");
    const visitor = await newAgent();
    const slug = `about-${Math.random().toString(36).slice(2, 7)}`;
    const long = `<p>${"ก".repeat(50_000)}</p>`;
    const page = await admin.post("/api/content/admin").send({
      kind: "page",
      slug,
      title: "เรื่องราวของเรา",
      content: long,
      coverImage: "/landing/train.webp",
      status: "published",
    });
    expect(page.status).toBe(201);
    expect(page.body.coverImageUrl).toBe("/landing/train.webp");

    const shown = await visitor.get(`/api/content/pages/${slug}`);
    expect(shown.status).toBe(200);
    expect(shown.body.content.length).toBe(long.length);
    // A page is not an article.
    expect((await visitor.get(`/api/content/articles/${slug}`)).status).toBe(404);

    const all = await admin.get("/api/content/admin").query({ kind: "page" });
    expect(all.body.posts.map((p) => p.id)).toContain(page.body.id);
    expect((await admin.get(`/api/content/admin/${page.body.id}`)).body.content.length).toBe(long.length);

    expect((await admin.delete(`/api/content/admin/${page.body.id}`)).status).toBe(204);
    expect((await visitor.get(`/api/content/pages/${slug}`)).status).toBe(404);
    expect((await admin.get(`/api/content/admin/${page.body.id}`)).status).toBe(404);
  });

  test("admin routes need an admin; validation rejects unknown fields", async () => {
    const { agent: customer } = await loginAs("user");
    const visitor = await newAgent();
    expect((await visitor.get("/api/content/admin")).status).toBe(401);
    expect((await customer.get("/api/content/admin")).status).toBe(403);
    expect((await customer.post("/api/content/admin").send(article())).status).toBe(403);

    const { agent: admin } = await loginAs("admin");
    expect((await admin.post("/api/content/admin").send({ ...article(), authorId: "x" })).status).toBe(400);
    expect((await admin.post("/api/content/admin").send({ title: "" })).status).toBe(400);
  });
});
