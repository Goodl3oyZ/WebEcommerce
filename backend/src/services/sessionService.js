import { db } from "../config/db.js";
import { sessions } from "../models/schema.js";
import { eq, and } from "drizzle-orm";
import { generateToken } from "../utils/token.js";
import { config } from "../config/config.js";

/**
 * Create a new user session
 * @param {number} userId - User ID
 * @param {Object} deviceInfo - Device information
 * @returns {Object} Session tokens
 */
export const createUserSession = async (userId, deviceInfo) => {
  // Generate tokens
  const accessToken = generateToken(
    { userId },
    config.jwt.accessTokenSecret,
    config.jwt.accessTokenExpiresIn
  );

  const refreshToken = generateToken(
    { userId },
    config.jwt.refreshTokenSecret,
    config.jwt.refreshTokenExpiresIn
  );

  // Create session
  await db.insert(sessions).values({
    userId,
    refreshToken,
    deviceInfo: deviceInfo || {},
    expiresAt: new Date(Date.now() + config.jwt.refreshTokenExpiresIn * 1000),
  });

  return {
    accessToken,
    refreshToken,
  };
};

/**
 * Delete a user session
 * @param {string} refreshToken - Refresh token to delete
 */
export const deleteUserSession = async (refreshToken) => {
  await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken));
};

/**
 * Delete all sessions for a user
 * @param {number} userId - User ID
 */
export const deleteAllUserSessions = async (userId) => {
  await db.delete(sessions).where(eq(sessions.userId, userId));
};

/**
 * Get all active sessions for a user
 * @param {number} userId - User ID
 * @returns {Array} List of active sessions
 */
export const getUserSessions = async (userId) => {
  return await db.query.sessions.findMany({
    where: and(eq(sessions.userId, userId), eq(sessions.isActive, true)),
  });
};
