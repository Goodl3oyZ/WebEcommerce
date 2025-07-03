import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: "error",
      message: "Validation error",
      errors: err.errors,
    });
  }

  // Handle Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({
      status: "error",
      message: "Validation error",
      errors: err.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      })),
    });
  }

  // Handle custom API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
      ...(err.code && { code: err.code }),
    });
  }

  // Handle database errors
  if (err.code === "23505") {
    // Unique violation
    return res.status(409).json({
      status: "error",
      message: "Resource already exists",
      code: "DUPLICATE_ENTRY",
    });
  }
  if (err.code === "23503") {
    // Foreign key violation
    return res.status(400).json({
      status: "error",
      message: "Referenced resource does not exist",
      code: "FOREIGN_KEY_VIOLATION",
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      status: "error",
      message: "Invalid token",
      code: "INVALID_TOKEN",
    });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      status: "error",
      message: "Token expired",
      code: "TOKEN_EXPIRED",
    });
  }

  // Default error
  res.status(500).json({
    status: "error",
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
};

export default errorHandler;
