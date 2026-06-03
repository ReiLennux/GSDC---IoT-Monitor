import jwt from 'jsonwebtoken';
import { TokenService } from '../../application/ports/token-service';
import { env } from '../../config/env';

export class JwtTokenService implements TokenService {
  private readonly secret: string;

  constructor(secret: string = env.jwtSecret) {
    this.secret = secret;
  }

  sign(payload: any, options?: { expiresIn: string | number }): string {
    return jwt.sign(payload, this.secret, options as any);
  }

  verify<T>(token: string): T {
    return jwt.verify(token, this.secret) as T;
  }
}
