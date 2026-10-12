import { authService } from "../services/authService.js";
import { userService } from "../services/userService.js";
import { ENV } from "../config/loadENV.js";
import { parseUserAgent } from "../utils/parseUserAgent.js";
import {
  setAuthCookies,
  clearAuthCookies,
  destroySession,
  saveSession,
} from "../utils/authCookies.js";

export const oauthFailureUrl = (code = "OAUTH_FAILED") =>
  `${ENV.SERVER.FRONTEND_URL}/auth/callback?error=${encodeURIComponent(code)}`;

export const oauthController = {
  /** Runs after passport has resolved `req.user`: start a session and return to the app. */
  async oauthCallback(req, res) {
    try {
      const { accessToken, refreshToken, sessionId } = await authService.generateTokens(
        req.user,
        {
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          deviceInfo: parseUserAgent(req.get("User-Agent")),
        }
      );
      await saveSession(req, req.user, sessionId);
      setAuthCookies(res, { accessToken, refreshToken });
      res.redirect(`${ENV.SERVER.FRONTEND_URL}/auth/callback?success=true`);
    } catch (error) {
      console.error("OAuth callback failed:", error);
      res.redirect(oauthFailureUrl(error.code));
    }
  },

  async getMe(req, res) {
    res.json(await userService.getProfile(req.user.id));
  },

  /** Browser logout link: ends the session and returns to the app. */
  async logout(req, res) {
    await authService.logout({
      refreshToken: req.cookies?.refreshToken,
      accessToken: req.cookies?.accessToken,
      sessionId: req.session?.user?.sid,
    });
    await destroySession(req);
    clearAuthCookies(res);
    res.redirect(ENV.SERVER.FRONTEND_URL || "/");
  },
};
