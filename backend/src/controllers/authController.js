import { authService } from "../services/authService.js";
import { generateToken } from "../utils/jwt.js";
import { sendEmail } from "../utils/email.js";

const authController = {
  testAuth(req, res) {
    res.status(200).json({ message: "Auth API is working" });
  },
  // done
  async register(req, res) {
    try {
      const { email, password, name } = req.body;
      const deviceInfo = {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        deviceId: req.headers["x-device-id"] || null, // สมมุติส่งมาจาก client
      };
      const user = await authService.register({
        email,
        password,
        name,
        deviceInfo,
      });
      // Generate verification token
      const verificationToken = generateToken(
        {
          id: user.id,
          email: user.email,
        },
        "1h"
      );
      // Send verification email
      await sendEmail({
        to: email,
        subject: "Verify your email",
        html: `
          <h1>Welcome to Our App!</h1>
          <p>Please verify your email by clicking the link below:</p>
          <a href="${process.env.API_URL}/verify-email?token=${verificationToken}">
            Verify Email
          </a>
          <p>This link will expire in 24 hours.</p>
        `,
      });

      res.status(201).json({
        status: "success",
        message:
          "Registration successful. Please check your email to verify your account.",
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        },
      });
    } catch (error) {
      if (error.message === "Email already exists") {
        return res.status(409).json({
          status: "error",
          message: error.message,
        });
      }
      res.status(500).json({
        status: "error",
        message: "Error registering user",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
  // done
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          status: "error",
          message: "Email and password are required",
        });
      }

      const { user, accessToken, refreshToken } = await authService.login(
        email,
        password,
        {
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        }
      );

      // เก็บ user ลง session
      req.session.user = {
        id: user.id,
        email: user.email,
        name: user.name,
      };

      await new Promise((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });

      // ตั้ง cookie
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 60 * 1000, // 15 นาที
        path: "/",
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 วัน
        path: "/",
      });

      // ส่ง response สำเร็จ
      console.log("Login successful for user:", user.id);

      return res.status(200).json({
        status: "success",
        message: "Login successful",
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      console.error("Login controller error:", error);

      if (
        error.code === "USER_NOT_FOUND" ||
        error.code === "INVALID_CREDENTIALS"
      ) {
        return res.status(401).json({
          status: "error",
          message: "Invalid email or password",
        });
      }

      if (error.code === "ACCOUNT_DEACTIVATED") {
        return res.status(403).json({
          status: "error",
          message: "Account is deactivated",
        });
      }

      if (error.code === "ACCOUNT_LOCKED") {
        return res.status(403).json({
          status: "error",
          message: error.message,
        });
      }

      return res.status(500).json({
        status: "error",
        message: "Error logging in",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // done
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          status: "error",
          message: "Refresh token is required",
        });
      }

      const { accessToken, newRefreshToken } = await authService.refreshToken(
        refreshToken,
        {
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        }
      );

      res.json({
        status: "success",
        message: "Tokens refreshed successfully",
        data: {
          accessToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      console.error("Refresh token error:", error);

      if (error.code === "TOKEN_REVOKED") {
        return res.status(401).json({
          status: "error",
          message: "Token has been revoked",
        });
      }

      if (error.code === "NO_ACTIVE_SESSION") {
        return res.status(401).json({
          status: "error",
          message: "No active session found",
        });
      }

      res.status(401).json({
        status: "error",
        message: "Invalid refresh token",
      });
    }
  },
  // done
  async logout(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken;
      const accessToken = req.cookies.accessToken;

      if (!refreshToken) {
        return res.status(400).json({
          status: "error",
          message: "No refresh token found in cookies",
        });
      }

      await authService.logout(refreshToken, accessToken);

      // Clear cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      res.json({
        status: "success",
        message: "Logout successful",
      });
    } catch (error) {
      console.error("Logout controller error:", error);
      res.status(500).json({
        status: "error",
        message: "Error during logout",
      });
    }
  },
  // done
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const resetToken = await authService.forgotPassword(email);

      // Send reset password email
      await sendEmail({
        to: email,
        subject: "Reset your password",
        text: `Please reset your password by clicking this link: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
      });

      res.json({ message: "Password reset instructions sent to your email" });
    } catch (error) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error processing request", error: error.message });
    }
  },
  // done
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);
      res.json({ message: "Password reset successful" });
    } catch (error) {
      if (error.message === "Invalid or expired token") {
        return res.status(400).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error resetting password", error: error.message });
    }
  },
  // done
  async verifyEmail(req, res) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          status: "error",
          message: "Verification token is required",
        });
      }

      await authService.verifyEmail(token);

      res.status(200).json({
        status: "success",
        message: "Email verified successfully",
      });
    } catch (error) {
      console.error("Email verification error:", error);

      if (error.code === "TOKEN_EXPIRED") {
        return res.status(401).json({
          status: "error",
          message: "Verification token has expired",
        });
      }

      if (error.code === "INVALID_TOKEN") {
        return res.status(401).json({
          status: "error",
          message: "Invalid verification token",
        });
      }

      if (error.code === "USER_NOT_FOUND") {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      res.status(500).json({
        status: "error",
        message: "Error verifying email",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
  // Admin only routes
  async logoutAllSessions(req, res) {
    try {
      const userId = req.user.id;
      await authService.logoutAllSessions(userId);

      res.json({
        status: "success",
        message: "All sessions have been logged out successfully",
      });
    } catch (error) {
      console.error("Logout all sessions error:", error);
      res.status(500).json({
        status: "error",
        message: "Error logging out all sessions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      await authService.changePassword(userId, currentPassword, newPassword);

      res.json({
        status: "success",
        message: "Password changed successfully",
      });
    } catch (error) {
      if (error.message === "Current password is incorrect") {
        return res.status(401).json({
          status: "error",
          message: error.message,
        });
      }
      res.status(500).json({
        status: "error",
        message: "Error changing password",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
};

export { authController };
