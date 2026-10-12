import { validate as isUuid } from "uuid";
import { ApiError } from "../utils/ApiError.js";

/**
 * router.param handler: a malformed id can never match a row, so answer 404
 * instead of letting Postgres raise "invalid input syntax for type uuid" (500).
 *   router.param("userId", uuidParam("User not found"));
 */
export const uuidParam = (notFoundMessage = "Resource not found") => (req, res, next, value) =>
  isUuid(value) ? next() : next(ApiError.notFound(notFoundMessage));
