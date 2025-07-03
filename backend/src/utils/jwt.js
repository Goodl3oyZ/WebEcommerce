import jwt from "jsonwebtoken";
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
