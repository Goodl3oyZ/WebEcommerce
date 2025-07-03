import { sanitize } from "class-sanitizer";
import { plainToClass } from "class-transformer";

export const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body) {
      Object.keys(req.body).forEach((key) => {
        if (typeof req.body[key] === "string") {
          // Remove HTML tags and special characters
          req.body[key] = req.body[key]
            .replace(/<[^>]*>/g, "") // Remove HTML tags
            .replace(/[^\w\s-]/g, "") // Remove special characters except spaces and hyphens
            .trim(); // Remove leading/trailing spaces
        }
      });
    }

    // Sanitize query parameters
    if (req.query) {
      Object.keys(req.query).forEach((key) => {
        if (typeof req.query[key] === "string") {
          req.query[key] = req.query[key]
            .replace(/<[^>]*>/g, "")
            .replace(/[^\w\s-]/g, "")
            .trim();
        }
      });
    }

    // Sanitize params
    if (req.params) {
      Object.keys(req.params).forEach((key) => {
        if (typeof req.params[key] === "string") {
          req.params[key] = req.params[key]
            .replace(/<[^>]*>/g, "")
            .replace(/[^\w\s-]/g, "")
            .trim();
        }
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
