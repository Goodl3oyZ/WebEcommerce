import { z } from "zod";
import { documentRoutes } from "./registry.js";
import { userDto, ROLE_VALUES } from "../dtos/user.dto.js";
import { paginationQuery } from "./common.js";

const adminNote =
  "Only a super_admin can create, promote, demote or deactivate admin/super_admin accounts. Nobody can change their own role or status.";

documentRoutes("Users", [
  {
    method: "get",
    path: "/api/users/profile",
    summary: "Current user's profile with order/address stats",
    auth: "user",
    responses: { 200: "Profile" },
  },
  {
    method: "put",
    path: "/api/users/profile",
    summary: "Update name/phone and optionally upload an avatar",
    description:
      "multipart/form-data. Avatar: JPEG/PNG/GIF/WebP up to 5 MB. Email cannot be changed here.",
    auth: "user",
    body: userDto.updateProfile,
    bodyType: "multipart",
    fileField: "avatar",
    responses: { 200: "Updated profile", 413: "File is too large" },
  },
  {
    method: "delete",
    path: "/api/users/profile/image",
    summary: "Remove the current user's avatar",
    auth: "user",
    responses: { 200: "Avatar removed", 404: "No avatar set" },
  },
  {
    method: "get",
    path: "/api/users/preferences",
    summary: "Current user's preferences (defaults if never saved)",
    auth: "user",
    responses: { 200: "Preferences" },
  },
  {
    method: "put",
    path: "/api/users/preferences",
    summary: "Update preferences",
    auth: "user",
    body: userDto.updatePreferences,
    responses: { 200: "Saved preferences" },
  },
  {
    method: "get",
    path: "/api/users/orders",
    summary: "Current user's orders (paginated)",
    auth: "user",
    query: paginationQuery,
    responses: { 200: "Orders and pagination" },
  },
  {
    method: "get",
    path: "/api/users/points",
    summary: "Current user's loyalty points balance",
    auth: "user",
    responses: { 200: "Points balance" },
  },
  {
    method: "get",
    path: "/api/users/points/history",
    summary: "Current user's points history (paginated)",
    auth: "user",
    query: paginationQuery,
    responses: { 200: "History and pagination" },
  },
  {
    method: "get",
    path: "/api/users",
    summary: "List users",
    auth: "admin",
    query: paginationQuery.extend({
      search: z.string().optional().describe("Matches name or email"),
      role: z.enum(ROLE_VALUES).optional(),
      isActive: z.enum(["true", "false"]).optional(),
    }),
    responses: { 200: "Users and pagination" },
  },
  {
    method: "post",
    path: "/api/users",
    summary: "Create a user",
    description: adminNote,
    auth: "admin",
    body: userDto.adminCreateUser,
    responses: { 201: "User created", 409: "Email already in use" },
  },
  {
    method: "post",
    path: "/api/users/create",
    summary: "Create a user (alias of POST /api/users)",
    deprecated: true,
    auth: "admin",
    body: userDto.adminCreateUser,
    responses: { 201: "User created", 409: "Email already in use" },
  },
  {
    method: "get",
    path: "/api/users/:userId/orders",
    summary: "A user's orders (paginated)",
    auth: "admin",
    query: paginationQuery,
    responses: { 200: "Orders and pagination", 404: "User not found" },
  },
  {
    method: "patch",
    path: "/api/users/:userId/status",
    summary: "Activate or deactivate a user",
    description: `${adminNote} Deactivating signs the user out everywhere.`,
    auth: "admin",
    body: userDto.setUserActive,
    responses: { 200: "Updated user", 404: "User not found" },
  },
  {
    method: "get",
    path: "/api/users/:userId",
    summary: "Get a user",
    auth: "admin",
    responses: { 200: "User", 404: "User not found" },
  },
  {
    method: "put",
    path: "/api/users/:userId/role",
    summary: "Change a user's role",
    description: adminNote,
    auth: "admin",
    body: userDto.updateRole,
    responses: { 200: "Updated user", 404: "User not found" },
  },
]);
