export const ADMIN_ROLES = ["admin", "super_admin"];

export function isAdmin(user) {
  return Boolean(user?.role && ADMIN_ROLES.includes(user.role));
}
