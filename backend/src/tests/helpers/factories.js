import { randomUUID } from "node:crypto";
import { newAgent } from "./app.js";

export const DEFAULT_PASSWORD = "Password123!";

const unique = () => randomUUID().slice(0, 8);

/** Insert a user directly (verified and active by default). */
export async function createUser({
  role = "user",
  password = DEFAULT_PASSWORD,
  isVerified = true,
  isActive = true,
  ...overrides
} = {}) {
  const { db } = await import("../../config/db.js");
  const { users, userRoles } = await import("../../models/schema.js");
  const { hashPassword } = await import("../../utils/hashPassword.js");

  const [user] = await db
    .insert(users)
    .values({
      name: `Test ${role} ${unique()}`,
      email: `${role}-${unique()}@test.local`,
      password: await hashPassword(password),
      isVerified,
      isActive,
      ...overrides,
    })
    .returning();
  await db.insert(userRoles).values({ userId: user.id, role });
  return { ...user, role, plainPassword: password };
}

/** Create a user with `role` and return an agent logged in as them. */
export async function loginAs(role = "user", userOverrides = {}) {
  const user = await createUser({ role, ...userOverrides });
  const agent = await newAgent();
  const res = await agent
    .post("/api/auth/login")
    .send({ email: user.email, password: user.plainPassword });
  if (res.status !== 200) {
    throw new Error(`loginAs(${role}) failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { agent, user };
}
