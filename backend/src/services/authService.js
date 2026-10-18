import { randomUUID } from "node:crypto";
import { db } from "../config/db.js";
import { users, userRoles, userSessions } from "../models/schema.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";
import {
  TOKEN_TYPES,
  signTypedToken,
  verifyTypedToken,
  verifyTypedTokenAllowExpired,
} from "../utils/jwt.js";
import { eq, and, lt, ne } from "drizzle-orm";
import { redis } from "../config/redis.js";
import { ENV } from "../config/loadENV.js";
import { getHighestRole } from "../utils/roles.js";
import { ApiError } from "../utils/ApiError.js";

const JWT_ACCESS_EXPIRATION = ENV.JWT.ACCESS_EXPIRATION; // seconds
const JWT_REFRESH_EXPIRATION = ENV.JWT.REFRESH_EXPIRATION; // seconds
const VERIFY_EMAIL_EXPIRATION = "24h";
const RESET_PASSWORD_EXPIRATION = "30m";
const MAX_LOGIN_ATTEMPTS = ENV.SECURITY.MAX_LOGIN_ATTEMPTS;
const LOCKOUT_DURATION = ENV.SECURITY.LOCKOUT_DURATION; // seconds

const authError = (status, message, code) => new ApiError(status, message, null, code);

async function getUserRole(userId) {
  const rows = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  return getHighestRole(rows);
}

/** Password-version claim: changes whenever the password changes, so reset links are single-use. */
const passwordVersion = (user) => user.lastPasswordChange?.getTime() ?? 0;

async function revokeSessions(userId, { exceptSessionId } = {}) {
  await db
    .update(userSessions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(userSessions.userId, userId),
        eq(userSessions.isActive, true),
        exceptSessionId ? ne(userSessions.id, exceptSessionId) : undefined
      )
    );
}

export const authService = {
  async register({ email, password, name }) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existingUser) {
      throw authError(409, "Email already exists", "EMAIL_EXISTS");
    }

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        password: await hashPassword(password),
        isVerified: false,
        isActive: true,
        lastPasswordChange: new Date(),
      })
      .returning();

    await db.insert(userRoles).values({ userId: newUser.id, role: "user" });
    return newUser;
  },

  createEmailVerificationToken(user) {
    return signTypedToken(
      TOKEN_TYPES.VERIFY_EMAIL,
      { id: user.id, email: user.email },
      VERIFY_EMAIL_EXPIRATION
    );
  },

  /**
   * Create a login session and its token pair. The session id (`sid`) is
   * embedded in both tokens so the session can be revoked server-side.
   */
  async createSession(user, { ipAddress = null, userAgent = null, deviceInfo = {} } = {}) {
    const sid = randomUUID();
    const role = await getUserRole(user.id);
    const accessToken = signTypedToken(
      TOKEN_TYPES.ACCESS,
      { id: user.id, email: user.email, role, sid },
      JWT_ACCESS_EXPIRATION
    );
    const refreshToken = signTypedToken(
      TOKEN_TYPES.REFRESH,
      { id: user.id, email: user.email, sid },
      JWT_REFRESH_EXPIRATION
    );

    await db.insert(userSessions).values({
      id: sid,
      userId: user.id,
      refreshToken,
      accessToken,
      deviceInfo,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + JWT_REFRESH_EXPIRATION * 1000),
      lastActivity: new Date(),
    });

    await db
      .update(users)
      .set({ lastLoginAt: new Date(), lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return { accessToken, refreshToken, sessionId: sid, role };
  },

  async login(email, password, deviceInfo = {}) {
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user) {
      // Same response as a wrong password so emails cannot be enumerated.
      throw authError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    const lockoutKey = `lockout:${user.id}`;
    const failKey = `login_fail:${user.id}`;
    if (await redis.get(lockoutKey)) {
      throw authError(
        429,
        "Too many failed login attempts. Please try again later.",
        "ACCOUNT_LOCKED"
      );
    }

    const isValidPassword =
      Boolean(user.password) && (await comparePassword(password, user.password));
    if (!isValidPassword) {
      const attempts = await redis.incr(failKey);
      if (attempts === 1) await redis.expire(failKey, LOCKOUT_DURATION);
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        await redis.set(lockoutKey, "1", { EX: LOCKOUT_DURATION });
        await redis.del(failKey);
      }
      throw authError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    // Only reveal account state after the password has been proven.
    if (!user.isActive) {
      throw authError(403, "Account is deactivated", "ACCOUNT_DEACTIVATED");
    }
    await redis.del(failKey);
    if (!user.isVerified) {
      throw authError(403, "Please verify your email before logging in", "EMAIL_NOT_VERIFIED");
    }

    await db.delete(userSessions).where(lt(userSessions.expiresAt, new Date()));

    const session = await this.createSession(user, {
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      deviceInfo,
    });
    return { user: { ...user, role: session.role }, ...session };
  },

  /** Rotate the token pair for an active session (refresh token reuse revokes it). */
  async refreshToken(refreshToken, deviceInfo = {}) {
    let decoded;
    try {
      decoded = verifyTypedToken(TOKEN_TYPES.REFRESH, refreshToken);
    } catch {
      throw authError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }

    const session = await db.query.userSessions.findFirst({
      where: and(eq(userSessions.id, decoded.sid ?? ""), eq(userSessions.isActive, true)),
    });
    if (!session || session.expiresAt < new Date()) {
      throw authError(401, "No active session found", "NO_ACTIVE_SESSION");
    }
    if (session.refreshToken !== refreshToken) {
      // An old refresh token was replayed: assume it leaked and end the session.
      await db
        .update(userSessions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(userSessions.id, session.id));
      throw authError(401, "Refresh token has been revoked", "TOKEN_REVOKED");
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, decoded.id) });
    if (!user?.isActive) {
      throw authError(401, "Account is not active", "ACCOUNT_DEACTIVATED");
    }

    const role = await getUserRole(user.id);
    const accessToken = signTypedToken(
      TOKEN_TYPES.ACCESS,
      { id: user.id, email: user.email, role, sid: session.id },
      JWT_ACCESS_EXPIRATION
    );
    const newRefreshToken = signTypedToken(
      TOKEN_TYPES.REFRESH,
      { id: user.id, email: user.email, sid: session.id },
      JWT_REFRESH_EXPIRATION
    );

    await db
      .update(userSessions)
      .set({
        refreshToken: newRefreshToken,
        accessToken,
        ipAddress: deviceInfo.ipAddress ?? session.ipAddress,
        userAgent: deviceInfo.userAgent ?? session.userAgent,
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + JWT_REFRESH_EXPIRATION * 1000),
        updatedAt: new Date(),
      })
      .where(eq(userSessions.id, session.id));

    return { accessToken, refreshToken: newRefreshToken };
  },

  /** Is the session behind a token still usable? */
  async isSessionActive(sessionId) {
    if (!sessionId) return false;
    const session = await db.query.userSessions.findFirst({
      where: and(eq(userSessions.id, sessionId), eq(userSessions.isActive, true)),
      columns: { expiresAt: true },
    });
    return Boolean(session && session.expiresAt > new Date());
  },

  /** End the session identified by any of the given credentials. Never throws for bad tokens. */
  async logout({ refreshToken, accessToken, sessionId }) {
    const sid =
      sessionId ||
      (refreshToken && verifyTypedTokenAllowExpired(TOKEN_TYPES.REFRESH, refreshToken)?.sid) ||
      (accessToken && verifyTypedTokenAllowExpired(TOKEN_TYPES.ACCESS, accessToken)?.sid);
    if (!sid) return false;

    const [session] = await db
      .update(userSessions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(userSessions.id, sid))
      .returning({ userId: userSessions.userId });
    if (session) {
      await db
        .update(users)
        .set({ lastLogoutAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, session.userId));
    }
    return Boolean(session);
  },

  async logoutAllSessions(userId) {
    await revokeSessions(userId);
    await db
      .update(users)
      .set({ lastLogoutAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
    return true;
  },

  /**
   * Returns a reset token, or null when no active account has this email.
   * Callers must respond identically in both cases.
   */
  /**
   * The account to re-send a verification link to, or null (unknown,
   * already verified, deactivated, or asked within the last minute).
   */
  async resendVerification(email) {
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user || user.isVerified || !user.isActive) return null;
    const fresh = await redis.set(`verify-resend:${user.id}`, "1", { NX: true, EX: 60 });
    return fresh === "OK" ? user : null;
  },

  async forgotPassword(email) {
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user || !user.isActive) return null;
    return signTypedToken(
      TOKEN_TYPES.RESET_PASSWORD,
      { id: user.id, pwv: passwordVersion(user) },
      RESET_PASSWORD_EXPIRATION
    );
  },

  async resetPassword(token, newPassword) {
    const invalid = () =>
      authError(400, "Invalid or expired reset link", "INVALID_RESET_TOKEN");
    let decoded;
    try {
      decoded = verifyTypedToken(TOKEN_TYPES.RESET_PASSWORD, token);
    } catch {
      throw invalid();
    }
    const user = await db.query.users.findFirst({ where: eq(users.id, decoded.id) });
    // A token issued before the last password change has already been used.
    if (!user || passwordVersion(user) !== decoded.pwv) throw invalid();

    await db
      .update(users)
      .set({
        password: await hashPassword(newPassword),
        lastPasswordChange: new Date(),
        // The reset link reached this inbox, which proves the address.
        isVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    await revokeSessions(user.id);
    await redis.del([`lockout:${user.id}`, `login_fail:${user.id}`]);
    return { id: user.id, email: user.email };
  },

  async changePassword(userId, currentPassword, newPassword, currentSessionId) {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw authError(404, "User not found", "USER_NOT_FOUND");
    if (!user.password) {
      throw authError(
        400,
        "This account signs in with a social provider. Use 'forgot password' to set a password.",
        "NO_PASSWORD_SET"
      );
    }
    // 400, not 401: a wrong current password must not look like an expired login.
    if (!(await comparePassword(currentPassword, user.password))) {
      throw authError(400, "Current password is incorrect", "INVALID_CURRENT_PASSWORD");
    }

    await db
      .update(users)
      .set({
        password: await hashPassword(newPassword),
        lastPasswordChange: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    // Sign out every other device; keep the session that made the change.
    await revokeSessions(userId, { exceptSessionId: currentSessionId });
    return true;
  },

  async verifyEmail(token) {
    let decoded;
    try {
      decoded = verifyTypedToken(TOKEN_TYPES.VERIFY_EMAIL, token);
    } catch (error) {
      if (error.code === "TOKEN_EXPIRED") {
        throw authError(400, "Verification link has expired", "TOKEN_EXPIRED");
      }
      throw authError(400, "Invalid verification link", "INVALID_TOKEN");
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, decoded.id) });
    // The link is bound to the address it was sent to.
    if (!user || user.email !== decoded.email) {
      throw authError(400, "Invalid verification link", "INVALID_TOKEN");
    }
    if (!user.isVerified) {
      await db
        .update(users)
        .set({ isVerified: true, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }
    return true;
  },

  /** Used by the OAuth callback after passport has resolved the user. */
  async generateTokens(user, { userAgent = null, deviceInfo = {}, ipAddress = null } = {}) {
    const { accessToken, refreshToken, sessionId } = await this.createSession(user, {
      userAgent,
      deviceInfo,
      ipAddress,
    });
    return { accessToken, refreshToken, sessionId };
  },

  async findUserById(id) {
    return db.query.users.findFirst({ where: eq(users.id, id) });
  },

  /**
   * Find or create the user for an OAuth profile.
   * An existing account is only linked when the provider says the email is
   * verified; otherwise anyone controlling an unverified provider email could
   * take over the account.
   */
  async findOrCreateOAuthUser(profile, provider) {
    const emailEntry =
      profile.emails?.find((e) => e.primary && e.verified !== false) ?? profile.emails?.[0];
    const email = emailEntry?.value?.trim().toLowerCase();
    if (!email) {
      throw authError(400, `No email provided by ${provider}`, "NO_EMAIL");
    }
    const emailVerified =
      emailEntry.verified === true ||
      profile._json?.email_verified === true ||
      // Facebook only returns confirmed email addresses.
      provider === "facebook";

    const name = profile.displayName || profile.username || email.split("@")[0];
    const avatar = profile.photos?.[0]?.value || null;
    const providerId = profile.id;

    const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existingUser) {
      const sameProvider =
        existingUser.provider === provider && existingUser.providerId === providerId;
      if (!sameProvider && !emailVerified) {
        throw authError(
          409,
          "An account with this email already exists. Sign in with your password.",
          "OAUTH_EMAIL_UNVERIFIED"
        );
      }
      if (!existingUser.isActive) {
        throw authError(403, "Account is deactivated", "ACCOUNT_DEACTIVATED");
      }
      await db
        .update(users)
        .set({
          lastLoginAt: new Date(),
          lastActivityAt: new Date(),
          provider,
          providerId,
          isVerified: existingUser.isVerified || emailVerified,
        })
        .where(eq(users.id, existingUser.id));
      return { ...existingUser, provider, providerId };
    }

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name,
        avatar,
        password: "",
        isVerified: emailVerified,
        isActive: true,
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
        provider,
        providerId,
      })
      .returning();
    await db.insert(userRoles).values({ userId: newUser.id, role: "user" });
    return newUser;
  },
};
