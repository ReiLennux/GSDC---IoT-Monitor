import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

interface HttpError {
  status?: number;
  message?: string;
}

export function errorHandler(err: HttpError, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  if (status === 500) {
    logger.error('Unhandled Error', err);
  }

  res.status(status).json({
    error: { status, message },
  });
}
