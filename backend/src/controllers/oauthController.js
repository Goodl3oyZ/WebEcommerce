import { authService } from "../services/authService.js";
import { ENV } from "../config/loadENV.js";
import { parseUserAgent } from "../utils/parseUserAgent.js";

export const oauthController = {
  async oauthCallback(req, res) {
    try {
      const { accessToken, refreshToken } = await authService.generateTokens(
        req.user,
        {
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          deviceInfo: parseUserAgent(req.get("User-Agent")),
        }
      );
      req.session.user = {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
      };
      await new Promise((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 60 * 1000,
        path: "/",
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });
      res.redirect(`${ENV.SERVER.FRONTEND_URL}/auth/callback?success=true`);
    } catch (error) {
      res.redirect(
        `${ENV.SERVER.FRONTEND_URL}/auth/callback?error=Authentication failed`
      );
    }
  },
  async getMe(req, res) {
    try {
      if (!req.session.user) {
        return res
          .status(401)
          .json({ status: "error", message: "No active session found" });
      }
      const { userController } = await import("./userController.js");
      const result = await userController.getProfile(req.session.user.id);
      if (!result || !result.data?.user) {
        return res
          .status(404)
          .json({ status: "error", message: "User not found" });
      }
      res.json(result);
    } catch (error) {
      res
        .status(500)
        .json({ status: "error", message: "Failed to get user data" });
    }
  },
  async logout(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken;
      const accessToken = req.cookies.accessToken;
      const userId = req.session.user?.id;
      await authService.logout(refreshToken, accessToken, userId);
      res.clearCookie("accessToken", { path: "/" });
      res.clearCookie("refreshToken", { path: "/" });
      req.session.destroy((err) => {
        if (err) {
          return res
            .status(500)
            .json({ status: "error", message: "Failed to logout" });
        }
        res.redirect(ENV.FRONTEND_URL || "http://localhost:3000");
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: "Logout failed" });
    }
  },
};
