import { ApiError } from "../utils/ApiError.js";

export const validatePasswordStrength = (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return next();
  }

  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasNoSpaces = !/\s/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!hasLowerCase) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!hasNumbers) {
    errors.push("Password must contain at least one number");
  }
  if (!hasSpecialChar) {
    errors.push("Password must contain at least one special character");
  }
  if (!hasNoSpaces) {
    errors.push("Password must not contain spaces");
  }

  if (errors.length > 0) {
    throw new ApiError(400, "Password validation failed", errors);
  }

  next();
};
