import { authService } from "../services/authService.js";
import { sendEmail } from "../utils/email.js";
import { ENV } from "../config/loadENV.js";
import {
  setAuthCookies,
  clearAuthCookies,
  destroySession,
  saveSession,
} from "../utils/authCookies.js";

const clientInfo = (req) => ({
  ipAddress: req.ip,
  userAgent: req.headers["user-agent"],
});

// Errors are ApiErrors thrown by authService; Express 5 forwards rejected
// promises to errorHandler, which formats them.
const authController = {
  async register(req, res) {
    const { email, password, name } = req.body;
    const user = await authService.register({ email, password, name });

    const token = authService.createEmailVerificationToken(user);
    const link = `${ENV.SERVER.API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;
    try {
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        html: `
          <h1>Welcome!</h1>
          <p>Please verify your email by clicking the link below:</p>
          <a href="${link}">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
        `,
      });
    } catch (error) {
      // The account exists either way; failing here would make a retry hit 409.
      console.error("Verification email could not be sent:", error.message);
    }

    res.status(201).json({
      status: "success",
      message: "Registration successful. Please check your email to verify your account.",
      data: { user: { id: user.id, email: user.email, name: user.name } },
    });
  },

  async login(req, res) {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken, sessionId, role } = await authService.login(
      email,
      password,
      clientInfo(req)
    );

    await saveSession(req, user, sessionId);
    setAuthCookies(res, { accessToken, refreshToken });

    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role,
          isVerified: user.isVerified,
        },
      },
      // For non-browser clients that use Bearer tokens.
      tokens: { accessToken, refreshToken },
    });
  },

  /** Accepts the refresh token from the body (API clients) or the cookie (browser). */
  async refreshToken(req, res) {
    const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
    if (!refreshToken) {
      return res
        .status(401)
        .json({ status: "error", message: "Refresh token is required", code: "NO_REFRESH_TOKEN" });
    }
    try {
      const tokens = await authService.refreshToken(refreshToken, clientInfo(req));
      setAuthCookies(res, tokens);
      res.json({
        status: "success",
        message: "Tokens refreshed successfully",
        data: tokens,
      });
    } catch (error) {
      clearAuthCookies(res);
      throw error;
    }
  },

  /** Always succeeds: ends whatever session the request identifies and clears cookies. */
  async logout(req, res) {
    const authHeader = req.headers.authorization;
    await authService.logout({
      refreshToken: req.body?.refreshToken || req.cookies?.refreshToken,
      accessToken: authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : req.cookies?.accessToken,
      sessionId: req.session?.user?.sid,
    });
    await destroySession(req);
    clearAuthCookies(res);
    res.json({ status: "success", message: "Logout successful" });
  },

  async logoutAllSessions(req, res) {
    await authService.logoutAllSessions(req.user.id);
    await destroySession(req);
    clearAuthCookies(res);
    res.json({
      status: "success",
      message: "All sessions have been logged out successfully",
    });
  },

  /** Same response whether or not the email has an account. */
  async forgotPassword(req, res) {
    const { email } = req.body;
    const resetToken = await authService.forgotPassword(email);
    if (resetToken) {
      const link = `${ENV.SERVER.FRONTEND_URL}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;
      try {
        await sendEmail({
          to: email,
          subject: "Reset your password",
          text: `Reset your password using this link (valid for 30 minutes): ${link}`,
        });
      } catch (error) {
        console.error("Password reset email could not be sent:", error.message);
      }
    }
    res.json({
      status: "success",
      message: "If an account exists for this email, password reset instructions have been sent.",
    });
  },

  async resetPassword(req, res) {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    res.json({ status: "success", message: "Password reset successful. Please log in." });
  },

  /** JSON for API clients; browsers following the email link are redirected to the app. */
  async verifyEmail(req, res) {
    const { token } = req.query;
    const wantsHtml = req.accepts(["json", "html"]) === "html";
    try {
      if (!token) {
        return res
          .status(400)
          .json({ status: "error", message: "Verification token is required" });
      }
      await authService.verifyEmail(String(token));
      if (wantsHtml) return res.redirect(`${ENV.SERVER.FRONTEND_URL}/auth/login?verified=1`);
      res.json({ status: "success", message: "Email verified successfully" });
    } catch (error) {
      if (wantsHtml && error.statusCode === 400) {
        return res.redirect(
          `${ENV.SERVER.FRONTEND_URL}/auth/login?verifyError=${encodeURIComponent(error.code || "INVALID_TOKEN")}`
        );
      }
      throw error;
    }
  },

  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword, req.sessionId);
    res.json({ status: "success", message: "Password changed successfully" });
  },
};

export { authController };
