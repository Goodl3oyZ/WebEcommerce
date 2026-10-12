import { z } from "zod";
import { documentRoutes } from "./registry.js";
import { authDto } from "../dtos/auth.dto.js";

const sessionNote =
  "Browsers receive httpOnly `accessToken` / `refreshToken` cookies; API clients can use the returned tokens as `Authorization: Bearer`.";

documentRoutes("Auth", [
  {
    method: "post",
    path: "/api/auth/register",
    summary: "Register a new account",
    description: "Creates an unverified user and emails a verification link (valid 24h).",
    auth: "public",
    body: authDto.register,
    responses: { 201: "Account created", 409: "Email already exists", 429: "Too many attempts" },
  },
  {
    method: "post",
    path: "/api/auth/login",
    summary: "Log in with email and password",
    description: `${sessionNote} After MAX_LOGIN_ATTEMPTS wrong passwords the account is locked for LOCKOUT_DURATION seconds.`,
    auth: "public",
    body: authDto.login,
    responses: {
      200: "Logged in",
      401: "Invalid email or password",
      403: "Account is deactivated",
      429: "Too many attempts / account temporarily locked",
    },
  },
  {
    method: "post",
    path: "/api/auth/forgot-password",
    summary: "Request a password reset email",
    description:
      "Always returns 200 (does not reveal whether the email exists). The emailed link is valid for 30 minutes and works once.",
    auth: "public",
    body: authDto.forgotPassword,
    responses: { 200: "Request accepted" },
  },
  {
    method: "post",
    path: "/api/auth/reset-password",
    summary: "Set a new password with a reset token",
    description: "Signs the user out of every device.",
    auth: "public",
    body: authDto.resetPassword,
    responses: { 200: "Password reset", 400: "Invalid, expired or already used reset link" },
  },
  {
    method: "get",
    path: "/api/auth/verify-email",
    summary: "Verify an email address",
    description:
      "Target of the link in the verification email. Browsers are redirected to the app's login page; JSON clients get a JSON response.",
    auth: "public",
    query: z.object({ token: z.string().describe("Token from the verification email") }),
    responses: {
      200: "Email verified",
      302: "Redirect to the frontend (browser requests)",
      400: "Invalid or expired link",
    },
  },
  {
    method: "post",
    path: "/api/auth/refresh-token",
    summary: "Rotate the access/refresh token pair",
    description:
      "Works with an expired access token. Reads the refresh token from the body or the `refreshToken` cookie. Re-using an old refresh token ends that session.",
    auth: "public",
    body: authDto.refreshToken,
    bodyOptional: true,
    responses: { 200: "New tokens issued", 401: "Invalid, revoked or expired refresh token" },
  },
  {
    method: "post",
    path: "/api/auth/logout",
    summary: "Log out of the current session",
    description:
      "Always succeeds; revokes the session identified by the cookies/token and clears cookies.",
    auth: "public",
    body: authDto.logout,
    bodyOptional: true,
    responses: { 200: "Logged out" },
  },
  {
    method: "get",
    path: "/api/auth/me",
    summary: "Current user's profile",
    auth: "user",
    responses: { 200: "Profile" },
  },
  {
    method: "post",
    path: "/api/auth/change-password",
    summary: "Change password",
    description: "Signs out every other device; the current session stays logged in.",
    auth: "user",
    body: authDto.changePassword,
    responses: {
      200: "Password changed",
      400: "Validation failed, wrong current password, or social-login account without a password",
    },
  },
  {
    method: "post",
    path: "/api/auth/logout-all",
    summary: "Log out of every device",
    auth: "user",
    responses: { 200: "All sessions ended" },
  },
]);
