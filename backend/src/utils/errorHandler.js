import { ApiError } from "./ApiError.js";

// Not found handler middleware
export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Not Found - ${req.originalUrl}`));
};
