import { ZodError } from "zod";

export const validationMiddleware = (schema, source = "body") => {
  return async (req, res, next) => {
    try {
      if (!schema || typeof schema.parseAsync !== "function") {
        throw new Error("Invalid or missing validation schema");
      }

      // Express 5 leaves req.body undefined when a request has no body.
      // An empty query value (?category=) means "not set": forms send their
      // blank filters, and they must not fail uuid/enum/number validation.
      const data =
        source === "query"
          ? Object.fromEntries(Object.entries(req.query).filter(([, value]) => value !== ""))
          : source === "params"
            ? req.params
            : (req.body ?? {});

      const parsed = await schema.parseAsync(data);

      if (source === "query") {
        // req.query is a read-only getter in Express 5.
        Object.defineProperty(req, "query", { value: parsed, writable: true, configurable: true });
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
          success: false,
          status: "error",
          message: "ข้อมูลไม่ถูกต้อง (Validation failed)",
          errors,
        });
      }
      next(error);
    }
  };
};
