import { ApiError } from "./ApiError.js";

/** @deprecated Prefer ApiError — kept for legacy (message, statusCode) argument order */
export class AppError extends ApiError {
  constructor(message, statusCode = 500, errors = null, code = null) {
    super(statusCode, message, errors, code);
  }
}
