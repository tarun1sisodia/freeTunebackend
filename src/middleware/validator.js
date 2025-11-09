import { z } from "zod";
import ApiError from "../utils/apiError.js";

/**
 * Higher-order middleware for validating request payloads using a Zod schema.
 * - Keeps endpoints DRY and scalable.
 * - Consistent error structure, safe for production APIs.
 * - Only mutates validated fields if provided for safer downstream processing.
 * @param {z.ZodSchema} schema - Zod schema object, expects { body, query, params } keys.
 */
const validate = schema => {
  return (req, res, next) => {
    try {
      // Validate the incoming request
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!result.success) {
        // Zod validation errors are returned as a consistent, useful structure
        const errors = result.error.errors.map(err => ({
          field: err.path.length ? err.path.join(".") : "(root)",
          message: err.message,
        }));
        return next(new ApiError("Validation failed", 400, errors));
      }

      // Overwrite only if validated (avoid clobbering req.field with undefined)
      if ("body" in result.data) req.body = result.data.body;
      if ("query" in result.data) req.query = result.data.query;
      if ("params" in result.data) req.params = result.data.params;

      return next();
    } catch (err) {
      // Catch non-Zod errors (should be rare)
      return next(err);
    }
  };
};

export default validate;
