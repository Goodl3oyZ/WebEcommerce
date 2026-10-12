export class ApiError extends Error {
  constructor(statusCodeOrMessage, messageOrStatus, errors = null, code = null) {
    const statusFirst = typeof statusCodeOrMessage === "number";
    const statusCode = statusFirst
      ? statusCodeOrMessage
      : typeof messageOrStatus === "number"
        ? messageOrStatus
        : 500;
    const message = statusFirst
      ? messageOrStatus || "Error"
      : statusCodeOrMessage;

    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    if (code) this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors = null) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Resource conflict") {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = "Too many requests") {
    return new ApiError(429, message);
  }

  static internal(message = "Internal server error") {
    return new ApiError(500, message);
  }
}
