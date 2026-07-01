import { ZodError } from "zod";

export const validationMiddleware = (schema, source = "body") => {
  return async (req, res, next) => {
    try {
      if (!schema || typeof schema.parseAsync !== "function") {
        throw new Error("Invalid or missing validation schema");
      }

      const data =
        source === "query"
          ? req.query
          : source === "params"
            ? req.params
            : req.body;

      const parsed = await schema.parseAsync(data);

      if (source === "query") {
        req.query = parsed;
      } else if (source === "params") {
        req.params = parsed;
      } else {
        req.body = parsed;
      }

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
