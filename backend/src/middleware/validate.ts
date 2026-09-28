import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

export const validate =
  (schema: ZodTypeAny, source: 'body' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message)).join('; ');
      return next(new AppError(400, 'VALIDATION_ERROR', message));
    }
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
