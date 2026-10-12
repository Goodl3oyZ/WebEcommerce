import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
import { createUser, loginAs, DEFAULT_PASSWORD } from "./helpers/factories.js";
import { emailsTo, tokenFromEmail } from "./helpers/email.js";

const { db } = await import("../config/db.js");
const { users } = await import("../models/schema.js");
const { eq } = await import("drizzle-orm");

const NEW_PASSWORD = "NewPassw0rd!";
const freshEmail = () => `new-${randomUUID().slice(0, 8)}@test.local`;
const cookieValue = (res, name) =>
  res.headers["set-cookie"]?.find((c) => c.startsWith(`${name}=`))?.split(";")[0].split("=")[1];

async function login(agent, email, password = DEFAULT_PASSWORD) {
  return agent.post("/api/auth/login").send({ email, password });
}

describe("POST /api/auth/register", () => {
  test("creates an unverified user and emails a working verification link", async () => {
    const agent = await newAgent();
    const email = freshEmail();
    const res = await agent.post("/api/auth/register").send({
      name: "New User",
      email: email.toUpperCase(), // stored lowercase
      password: DEFAULT_PASSWORD,
      confirmPassword: DEFAULT_PASSWORD,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(email);
    const [mail] = emailsTo(email);
    expect(mail.html).toContain("http://localhost:5000/api/auth/verify-email?token=");
  });

  test("rejects a duplicate email (case-insensitive) with 409", async () => {
    const existing = await createUser();
    const agent = await newAgent();
    const res = await agent.post("/api/auth/register").send({
      name: "Dup",
      email: existing.email.toUpperCase(),
      password: DEFAULT_PASSWORD,
      confirmPassword: DEFAULT_PASSWORD,
    });
    expect(res.status).toBe(409);
  });

  test("validates password strength and confirmation", async () => {
    const agent = await newAgent();
    const weak = await agent
      .post("/api/auth/register")
      .send({ name: "Weak", email: freshEmail(), password: "short", confirmPassword: "short" });
    expect(weak.status).toBe(400);

    const mismatch = await agent.post("/api/auth/register").send({
      name: "Mismatch",
      email: freshEmail(),
      password: DEFAULT_PASSWORD,
      confirmPassword: "Different1!",
    });
    expect(mismatch.status).toBe(400);
  });
});

describe("GET /api/auth/verify-email", () => {
  async function registerAndGetToken() {
    const agent = await newAgent();
    const email = freshEmail();
    await agent.post("/api/auth/register").send({
      name: "Verify Me",
      email,
      password: DEFAULT_PASSWORD,
      confirmPassword: DEFAULT_PASSWORD,
    });
    return { agent, email, token: tokenFromEmail(emailsTo(email)[0]) };
  }

  test("verifies the email (JSON client)", async () => {
    const { agent, email, token } = await registerAndGetToken();
    const res = await agent.get("/api/auth/verify-email").query({ token }).set("Accept", "application/json");
    expect(res.status).toBe(200);
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    expect(user.isVerified).toBe(true);
  });

  test("redirects browsers to the app", async () => {
    const { agent, token } = await registerAndGetToken();
    const res = await agent.get("/api/auth/verify-email").query({ token }).set("Accept", "text/html");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("http://localhost:3000/auth/login?verified=1");
  });

  test("rejects an access token used as a verification token", async () => {
    const { agent, user } = await loginAs("user", { isVerified: false });
    const accessToken = cookieValue(
      await agent.post("/api/auth/login").send({ email: user.email, password: DEFAULT_PASSWORD }),
      "accessToken"
    );
    const res = await agent
      .get("/api/auth/verify-email")
      .query({ token: accessToken })
      .set("Accept", "application/json");
    expect(res.status).toBe(400);
    const fresh = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    expect(fresh.isVerified).toBe(false);
  });

  test("requires a token", async () => {
    const agent = await newAgent();
    const res = await agent.get("/api/auth/verify-email").set("Accept", "application/json");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  test("sets auth cookies and returns the user", async () => {
    const user = await createUser();
    const agent = await newAgent();
    const res = await login(agent, user.email.toUpperCase());

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ id: user.id, role: "user" });
    expect(cookieValue(res, "accessToken")).toBeTruthy();
    expect(cookieValue(res, "refreshToken")).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toContain(user.password);
  });

  test("gives the same 401 for unknown email and wrong password", async () => {
    const user = await createUser();
    const agent = await newAgent();
    const unknown = await login(agent, freshEmail());
    const wrong = await login(agent, user.email, "Wrong-passw0rd!");
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  test("only reveals a deactivated account after the correct password", async () => {
    const user = await createUser({ isActive: false });
    const agent = await newAgent();
    expect((await login(agent, user.email, "Wrong-passw0rd!")).status).toBe(401);
    expect((await login(agent, user.email)).status).toBe(403);
  });

  test("locks the account after MAX_LOGIN_ATTEMPTS failures", async () => {
    const user = await createUser();
    const agent = await newAgent();
    for (let i = 0; i < 5; i++) {
      expect((await login(agent, user.email, "Wrong-passw0rd!")).status).toBe(401);
    }
    const locked = await login(agent, user.email); // even the right password
    expect(locked.status).toBe(429);
    expect(locked.body.code).toBe("ACCOUNT_LOCKED");
  });

  test("validates the body", async () => {
    const agent = await newAgent();
    expect((await agent.post("/api/auth/login").send({ email: "not-an-email" })).status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  test("returns the current user without the password hash", async () => {
    const { agent, user } = await loginAs("user");
    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(user.id);
    expect(res.body.data.user.password).toBeUndefined();
  });

  test("requires authentication", async () => {
    const res = await (await newAgent()).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/refresh-token", () => {
  test("rotates tokens from the cookie and rejects replay of the old token", async () => {
    const user = await createUser();
    const agent = await newAgent();
    const loginRes = await login(agent, user.email);
    const oldRefresh = cookieValue(loginRes, "refreshToken");

    const refreshed = await agent.post("/api/auth/refresh-token");
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.refreshToken).not.toBe(oldRefresh);
    expect((await agent.get("/api/auth/me")).status).toBe(200);

    // Replaying the old token ends the session entirely.
    const replay = await (await newAgent()).post("/api/auth/refresh-token").send({ refreshToken: oldRefresh });
    expect(replay.status).toBe(401);
    expect(replay.body.code).toBe("TOKEN_REVOKED");
    const after = await agent.post("/api/auth/refresh-token");
    expect(after.status).toBe(401);
  });

  test("works with a body token and without any access token", async () => {
    const user = await createUser();
    const loginRes = await login(await newAgent(), user.email);
    const res = await (await newAgent())
      .post("/api/auth/refresh-token")
      .send({ refreshToken: loginRes.body.tokens.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  test("rejects missing or invalid refresh tokens", async () => {
    const agent = await newAgent();
    expect((await agent.post("/api/auth/refresh-token")).status).toBe(401);
    expect(
      (await agent.post("/api/auth/refresh-token").send({ refreshToken: "garbage" })).status
    ).toBe(401);
  });

  test("rejects an access token used as a refresh token", async () => {
    const user = await createUser();
    const loginRes = await login(await newAgent(), user.email);
    const res = await (await newAgent())
      .post("/api/auth/refresh-token")
      .send({ refreshToken: loginRes.body.tokens.accessToken });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  test("revokes the session so the old access token stops working", async () => {
    const user = await createUser();
    const agent = await newAgent();
    const { accessToken } = (await login(agent, user.email)).body.tokens;

    const res = await agent.post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect((await agent.get("/api/auth/me")).status).toBe(401);

    const reuse = await (await newAgent())
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe("SESSION_REVOKED");
  });

  test("succeeds even without any credentials", async () => {
    const res = await (await newAgent()).post("/api/auth/logout");
    expect(res.status).toBe(200);
  });
});

describe("POST /api/auth/logout-all", () => {
  test("ends every session of the user", async () => {
    const user = await createUser();
    const deviceA = await newAgent();
    const deviceB = await newAgent();
    await login(deviceA, user.email);
    await login(deviceB, user.email);

    expect((await deviceA.post("/api/auth/logout-all")).status).toBe(200);
    expect((await deviceA.get("/api/auth/me")).status).toBe(401);
    expect((await deviceB.get("/api/auth/me")).status).toBe(401);
  });

  test("is available to regular users (their own sessions)", async () => {
    const { agent } = await loginAs("user");
    expect((await agent.post("/api/auth/logout-all")).status).toBe(200);
  });

  test("requires authentication", async () => {
    expect((await (await newAgent()).post("/api/auth/logout-all")).status).toBe(401);
  });
});

describe("POST /api/auth/change-password", () => {
  test("changes the password and signs out other devices only", async () => {
    const user = await createUser();
    const current = await newAgent();
    const other = await newAgent();
    await login(current, user.email);
    await login(other, user.email);

    const res = await current.post("/api/auth/change-password").send({
      currentPassword: DEFAULT_PASSWORD,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });
    expect(res.status).toBe(200);
    expect((await current.get("/api/auth/me")).status).toBe(200);
    expect((await other.get("/api/auth/me")).status).toBe(401);
    expect((await login(await newAgent(), user.email, NEW_PASSWORD)).status).toBe(200);
  });

  test("rejects a wrong current password with 400 (not 401)", async () => {
    const { agent } = await loginAs("user");
    const res = await agent.post("/api/auth/change-password").send({
      currentPassword: "Wrong-passw0rd!",
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });
    expect(res.status).toBe(400);
  });

  test("explains that social-login accounts have no password", async () => {
    const user = await createUser({ provider: "google" });
    await db.update(users).set({ password: "" }).where(eq(users.id, user.id));
    // No password to log in with, so start a session directly (as OAuth does).
    const { authService } = await import("../services/authService.js");
    const session = await authService.createSession(user);
    const res = await (await newAgent())
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({ currentPassword: "anything", newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("NO_PASSWORD_SET");
  });

  test("requires authentication", async () => {
    expect((await (await newAgent()).post("/api/auth/change-password").send({})).status).toBe(401);
  });
});

describe("password reset", () => {
  test("forgot-password answers the same for unknown emails and sends nothing", async () => {
    const agent = await newAgent();
    const email = freshEmail();
    const res = await agent.post("/api/auth/forgot-password").send({ email });
    expect(res.status).toBe(200);
    expect(emailsTo(email)).toHaveLength(0);
  });

  test("reset link works once, signs out all devices, and the new password works", async () => {
    const user = await createUser();
    const device = await newAgent();
    await login(device, user.email);

    const forgot = await (await newAgent())
      .post("/api/auth/forgot-password")
      .send({ email: user.email });
    expect(forgot.status).toBe(200);
    const mail = emailsTo(user.email).at(-1);
    expect(mail.text).toContain("http://localhost:3000/auth/reset-password?token=");
    const token = tokenFromEmail(mail);

    const body = { token, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD };
    const agent = await newAgent();
    expect((await agent.post("/api/auth/reset-password").send(body)).status).toBe(200);
    expect((await agent.post("/api/auth/reset-password").send(body)).status).toBe(400); // reused

    expect((await device.get("/api/auth/me")).status).toBe(401);
    expect((await login(await newAgent(), user.email, NEW_PASSWORD)).status).toBe(200);
  });

  test("rejects a garbage token", async () => {
    const res = await (await newAgent())
      .post("/api/auth/reset-password")
      .send({ token: "garbage", newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
    expect(res.status).toBe(400);
  });
});

describe("authMiddleware", () => {
  test("rejects a deactivated user even with a valid session", async () => {
    const { agent, user } = await loginAs("user");
    await db.update(users).set({ isActive: false }).where(eq(users.id, user.id));
    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("ACCOUNT_DEACTIVATED");
  });
});
