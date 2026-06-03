import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UserRole } from '../../domain/enums';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw { status: 401, message: 'Missing or invalid token' };
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw { status: 401, message: 'Invalid or expired token' };
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw { status: 401, message: 'Unauthenticated' };
    }
    if (!roles.includes(req.user.role)) {
      throw { status: 403, message: 'Forbidden: insufficient role' };
    }
    next();
  };
}
