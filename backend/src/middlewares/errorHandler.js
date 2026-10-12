import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      status: "error",
      message: "ข้อมูลไม่ถูกต้อง",
      errors: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      status: "error",
      message: "ข้อมูลไม่ถูกต้อง",
      errors: err.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      })),
    });
  }

  // Upload errors from multer (file too large, too many files, ...).
  if (err.name === "MulterError") {
    return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      success: false,
      status: "error",
      message: err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message,
      code: err.code,
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
      ...(err.code && { code: err.code }),
    });
  }

  // Drizzle wraps driver errors (DrizzleQueryError); the Postgres code is on the cause.
  const pgCode = err.cause?.code ?? err.code;

  if (pgCode === "23505") {
    return res.status(409).json({
      success: false,
      status: "error",
      message: "ข้อมูลซ้ำกับที่มีอยู่ในระบบ",
      code: "DUPLICATE_ENTRY",
    });
  }
  if (pgCode === "23503") {
    return res.status(400).json({
      success: false,
      status: "error",
      message: "ไม่สามารถดำเนินการได้ เพราะมีข้อมูลที่เกี่ยวข้อง",
      code: "FOREIGN_KEY_VIOLATION",
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      status: "error",
      message: "Invalid token",
      code: "INVALID_TOKEN",
    });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      status: "error",
      message: "Token expired",
      code: "TOKEN_EXPIRED",
    });
  }

  res.status(500).json({
    success: false,
    status: "error",
    message: "เกิดข้อผิดพลาดภายในระบบ",
  });
};

export default errorHandler;
