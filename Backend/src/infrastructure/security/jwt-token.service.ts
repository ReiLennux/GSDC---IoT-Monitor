import jwt, { type SignOptions } from 'jsonwebtoken';
import { TokenService } from '../../application/ports/token-service';
import { env } from '../../config/env';

export class JwtTokenService implements TokenService {
  private readonly secret: string;

  constructor(secret: string = env.jwtSecret) {
    this.secret = secret;
  }

  sign(payload: string | Buffer | object, options?: SignOptions): string {
    return jwt.sign(payload, this.secret, options);
  }

  verify<T>(token: string): T {
    return jwt.verify(token, this.secret) as T;
  }
}
