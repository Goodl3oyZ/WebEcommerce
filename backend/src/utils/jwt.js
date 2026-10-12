import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { ENV } from "../config/loadENV.js";

// Custom error class for JWT errors
class JWTError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "JWTError";
    this.code = code;
  }
}

// done
export const generateToken = (payload, expiresIn = "1h") => {
  try {
    return jwt.sign(payload, ENV.JWT.SECRET, { expiresIn });
  } catch (error) {
    throw new JWTError("Error generating token", "TOKEN_GENERATION_ERROR");
  }
};
//done
export const generateRefreshToken = (payload, expiresIn = "7d") => {
  try {
    return jwt.sign(payload, ENV.JWT.REFRESH_SECRET, { expiresIn });
  } catch (error) {
    throw new JWTError(
      "Error generating refresh token",
      "REFRESH_TOKEN_GENERATION_ERROR"
    );
  }
};
//done
export const verifyToken = (token, secret = ENV.JWT.SECRET) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new JWTError("Token has expired", "TOKEN_EXPIRED");
    }
    if (error.name === "JsonWebTokenError") {
      throw new JWTError("Invalid token", "INVALID_TOKEN");
    }
    throw new JWTError("Error verifying token", "TOKEN_VERIFICATION_ERROR");
  }
};
//done
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, ENV.JWT.REFRESH_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new JWTError("Refresh token has expired", "REFRESH_TOKEN_EXPIRED");
    }
    if (error.name === "JsonWebTokenError") {
      throw new JWTError("Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }
    throw new JWTError(
      "Error verifying refresh token",
      "REFRESH_TOKEN_VERIFICATION_ERROR"
    );
  }
};

// --- Typed tokens ----------------------------------------------------------
// Every token carries a `typ` claim so one kind can never be used as another
// (e.g. an email-verification link as an access token).
export const TOKEN_TYPES = {
  ACCESS: "access",
  REFRESH: "refresh",
  VERIFY_EMAIL: "verify_email",
  RESET_PASSWORD: "reset_password",
};

const secretFor = (type) =>
  type === TOKEN_TYPES.REFRESH ? ENV.JWT.REFRESH_SECRET : ENV.JWT.SECRET;

export const signTypedToken = (type, payload, expiresIn) => {
  try {
    // jwtid makes every token unique, even two issued in the same second
    // (otherwise a rotated refresh token could equal the one it replaces).
    return jwt.sign({ ...payload, typ: type }, secretFor(type), { expiresIn, jwtid: randomUUID() });
  } catch (error) {
    throw new JWTError("Error generating token", "TOKEN_GENERATION_ERROR");
  }
};

export const verifyTypedToken = (type, token) => {
  const decoded = verifyToken(token, secretFor(type));
  if (decoded.typ !== type) {
    throw new JWTError("Invalid token", "INVALID_TOKEN");
  }
  return decoded;
};

/**
 * Verify signature and type but accept expired tokens. Used only by logout to
 * find which session to revoke, so an expired cookie can still log out.
 */
export const verifyTypedTokenAllowExpired = (type, token) => {
  try {
    const decoded = jwt.verify(token, secretFor(type), { ignoreExpiration: true });
    return decoded.typ === type ? decoded : null;
  } catch {
    return null;
  }
};
