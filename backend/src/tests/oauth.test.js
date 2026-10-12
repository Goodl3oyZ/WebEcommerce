import { jest } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
import { createUser, loginAs } from "./helpers/factories.js";

const { authService } = await import("../services/authService.js");
const { oauthController } = await import("../controllers/oauthController.js");

const FAILURE = "http://localhost:3000/auth/callback?error=";

describe("OAuth start and callback routes", () => {
  test.each([
    ["github", "https://github.com/login/oauth/authorize"],
    ["google", "https://accounts.google.com/o/oauth2/v2/auth"],
  ])("GET /oauth/%s redirects to the provider", async (provider, url) => {
    const res = await (await newAgent()).get(`/oauth/${provider}`);
    expect(res.status).toBe(302);
    expect(res.headers.location.startsWith(url)).toBe(true);
    expect(res.headers.location).toContain("client_id=test-");
  });

  test("an unconfigured provider redirects back with an error instead of crashing", async () => {
    const agent = await newAgent();
    for (const path of ["/oauth/facebook", "/oauth/facebook/callback"]) {
      const res = await agent.get(path);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`${FAILURE}PROVIDER_NOT_CONFIGURED`);
    }
  });

  test.each(["github", "google"])(
    "GET /oauth/%s/callback redirects to the app when the user denies access",
    async (provider) => {
      const res = await (await newAgent())
        .get(`/oauth/${provider}/callback`)
        .query({ error: "access_denied" });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`${FAILURE}OAUTH_FAILED`);
    }
  );
});

describe("oauthController.oauthCallback", () => {
  test("starts a session, sets cookies and redirects to the app", async () => {
    const user = await createUser({ provider: "google" });
    const res = { cookie: jest.fn(), redirect: jest.fn() };
    const req = {
      user,
      ip: "127.0.0.1",
      get: () => "jest",
      session: { save: (cb) => cb() },
    };

    await oauthController.oauthCallback(req, res);

    expect(res.redirect).toHaveBeenCalledWith("http://localhost:3000/auth/callback?success=true");
    expect(res.cookie.mock.calls.map(([name]) => name)).toEqual(["accessToken", "refreshToken"]);
    expect(await authService.isSessionActive(req.session.user.sid)).toBe(true);
  });
});

describe("authService.findOrCreateOAuthUser", () => {
  const profile = (email, extra = {}) => ({
    id: randomUUID(),
    displayName: "OAuth Person",
    emails: [{ value: email, ...extra.email }],
    _json: extra.json ?? {},
  });

  test("creates a new verified user from a verified provider email", async () => {
    const email = `oauth-${randomUUID().slice(0, 8)}@test.local`;
    const user = await authService.findOrCreateOAuthUser(
      profile(email, { json: { email_verified: true } }),
      "google"
    );
    expect(user).toMatchObject({ email, provider: "google", isVerified: true });
  });

  test("links an existing account only when the provider verified the email", async () => {
    const existing = await createUser();
    const verified = await authService.findOrCreateOAuthUser(
      profile(existing.email.toUpperCase(), { email: { primary: true, verified: true } }),
      "github"
    );
    expect(verified.id).toBe(existing.id);

    const other = await createUser();
    await expect(
      authService.findOrCreateOAuthUser(profile(other.email, { email: { verified: false } }), "github")
    ).rejects.toMatchObject({ statusCode: 409, code: "OAUTH_EMAIL_UNVERIFIED" });
  });

  test("refuses deactivated accounts and profiles without email", async () => {
    const inactive = await createUser({ isActive: false });
    await expect(
      authService.findOrCreateOAuthUser(profile(inactive.email, { json: { email_verified: true } }), "google")
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      authService.findOrCreateOAuthUser({ id: "1", emails: [] }, "google")
    ).rejects.toMatchObject({ code: "NO_EMAIL" });
  });
});

describe("GET /oauth/me and /oauth/logout", () => {
  test("/oauth/me returns the profile", async () => {
    const { agent, user } = await loginAs("user");
    const res = await agent.get("/oauth/me");
    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(user.id);
    expect((await (await newAgent()).get("/oauth/me")).status).toBe(401);
  });

  test("/oauth/logout ends the session and redirects to the app", async () => {
    const { agent } = await loginAs("user");
    const res = await agent.get("/oauth/logout");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("http://localhost:3000");
    expect((await agent.get("/api/users/profile")).status).toBe(401);
  });
});
