import { z } from 'zod';
import { AppError } from '../utils/errorHandler.js';

const validate = schema => {
  return (req, res, next) => {
    try {
      const validated = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      req.body = validated.body || req.body;
      req.query = validated.query || req.query;
      req.params = validated.params || req.params;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return next(new AppError('Validation failed', 400, errors));
      }
      next(error);
    }
  };
};

export default validate;
