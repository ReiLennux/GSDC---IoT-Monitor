import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return xss(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  return value;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) req.body = sanitizeValue(req.body) as typeof req.body;
  if (req.query) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(req.query)) {
      sanitized[key] = sanitizeValue(val);
    }
    req.query = sanitized as typeof req.query;
  }
  if (req.params) {
    const sanitized: Record<string, string> = {};
    for (const [key, val] of Object.entries(req.params)) {
      sanitized[key] = sanitizeValue(val) as string;
    }
    req.params = sanitized as typeof req.params;
  }
  next();
}
