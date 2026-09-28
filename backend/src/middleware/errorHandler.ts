import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found'));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong on our side';

  if (err instanceof AppError) {
    ({ status, code, message } = err);
  } else if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR';
    message = err.code === 'LIMIT_FILE_SIZE' ? `File exceeds the ${env.MAX_UPLOAD_MB} MB limit` : 'Invalid upload. Send a single PDF in the "file" field.';
  } else if ((err as { type?: string })?.type === 'entity.parse.failed') {
    status = 400; code = 'INVALID_JSON'; message = 'Request body is not valid JSON';
  } else {
    console.error('[unhandled]', err);
  }
  res.status(status).json({ success: false, error: { code, message } });
}
