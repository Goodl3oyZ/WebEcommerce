import { ApiError } from "../utils/ApiError.js";

// Define user roles
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MODERATOR: "moderator",
  USER: "user",
};

// Role hierarchy for permission checking
const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 4,
  [ROLES.ADMIN]: 3,
  [ROLES.MODERATOR]: 2,
  [ROLES.USER]: 1,
};

// Check if user has required role
const hasRole = (userRole, requiredRole) => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

// Middleware to check if user has required role
export const requireRole = (requiredRole) => {
  return (req, res, next) => {
    try {
      // Check if user exists in request (set by auth middleware)
      if (!req.user) {
        throw ApiError.unauthorized("Authentication required");
      }

      // Check if user has required role
      if (!hasRole(req.user.role, requiredRole)) {
        throw ApiError.forbidden("Insufficient permissions");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to check if user has any of the required roles
export const requireAnyRole = (requiredRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized("Authentication required");
      }

      const hasRequiredRole = requiredRoles.some((role) =>
        hasRole(req.user.role, role)
      );

      if (!hasRequiredRole) {
        throw ApiError.forbidden("Insufficient permissions");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to check if user is accessing their own resource
export const requireOwnership = (resourceIdField = "id") => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized("Authentication required");
      }

      // Allow super admin and admin to access any resource
      if (
        req.user.role === ROLES.SUPER_ADMIN ||
        req.user.role === ROLES.ADMIN
      ) {
        return next();
      }

      // Check if user is accessing their own resource
      const resourceId = req.params[resourceIdField];
      if (resourceId !== req.user.id) {
        throw ApiError.forbidden("You can only access your own resources");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to check if user has specific permission
export const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized("Authentication required");
      }

      // Check if user has the required permission
      if (!req.user.permissions?.includes(permission)) {
        throw ApiError.forbidden("Insufficient permissions");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to check if user has any of the required permissions
export const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized("Authentication required");
      }

      const hasRequiredPermission = permissions.some((permission) =>
        req.user.permissions?.includes(permission)
      );

      if (!hasRequiredPermission) {
        throw ApiError.forbidden("Insufficient permissions");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
