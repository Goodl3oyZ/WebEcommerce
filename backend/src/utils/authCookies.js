import { ENV } from "../config/loadENV.js";

const baseCookie = () => ({
  httpOnly: true,
  secure: ENV.SERVER.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

/** Cookie lifetimes match the token lifetimes (both in seconds in ENV). */
export function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie("accessToken", accessToken, {
    ...baseCookie(),
    maxAge: ENV.JWT.ACCESS_EXPIRATION * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    ...baseCookie(),
    maxAge: ENV.JWT.REFRESH_EXPIRATION * 1000,
  });
}

export function clearAuthCookies(res) {
  res.clearCookie("accessToken", baseCookie());
  res.clearCookie("refreshToken", baseCookie());
  res.clearCookie("connect.sid", { path: "/" });
}

/** Destroy the express-session (if any) without failing the request. */
export const destroySession = (req) =>
  new Promise((resolve) => {
    if (!req.session) return resolve();
    req.session.destroy(() => resolve());
  });

/** Persist the login on the express-session, bound to the server-side session id. */
export const saveSession = (req, user, sessionId) =>
  new Promise((resolve, reject) => {
    req.session.user = { id: user.id, email: user.email, name: user.name, sid: sessionId };
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
