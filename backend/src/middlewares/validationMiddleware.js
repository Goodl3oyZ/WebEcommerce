import { ZodError } from "zod";

export const validationMiddleware = (schema) => {
  return async (req, res, next) => {
    try {
      if (!schema || typeof schema.parseAsync !== "function") {
        throw new Error("Invalid or missing validation schema");
      }

      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors,
        });
      }
      next(error);
    }
  };
};
