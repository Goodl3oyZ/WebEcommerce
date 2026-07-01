export const ROLE_HIERARCHY = {
  super_admin: 4,
  admin: 3,
  moderator: 2,
  user: 1,
};

export const getHighestRole = (rolesArr) => {
  if (!rolesArr?.length) return "user";
  const sorted = rolesArr
    .map((r) => (typeof r === "string" ? r : r.role))
    .filter(Boolean)
    .sort((a, b) => (ROLE_HIERARCHY[b] || 0) - (ROLE_HIERARCHY[a] || 0));
  return sorted[0] || "user";
};

export const isAdminRole = (role) =>
  role === "admin" || role === "super_admin";
