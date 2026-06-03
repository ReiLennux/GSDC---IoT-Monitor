import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  if (status === 500) {
    logger.error(err);
  }

  res.status(status).json({
    error: { status, message },
  });
}
