import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { env } from '../../config/env';
import { UserRepository } from '../../domain/repositories/user.repository';
import { UserRole } from '../../domain/enums';
import { logger } from '../../utils/logger';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface RegisterInput {
  email: string;
  password: string;
  role?: UserRole;
}

interface LoginInput {
  email: string;
  password: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export class AuthService {
  constructor(private userRepo: UserRepository) {}

  private generateTokens(payload: JwtPayload): AuthTokens {
    const accessToken = jwt.sign(payload, env.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }

  async register(input: RegisterInput): Promise<{ user: { id: string; email: string; role: UserRole }; tokens: AuthTokens }> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw { status: 409, message: 'Email already registered' };
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const userId = uuid();
    const role = input.role || UserRole.VIEWER;

    const user = {
      PK: `USER#${userId}`,
      SK: 'METADATA',
      GSI1PK: `EMAIL#${input.email}`,
      userId,
      email: input.email,
      passwordHash,
      role,
      isActive: true,
    };

    await this.userRepo.create(user);
    const tokens = this.generateTokens({ sub: userId, email: input.email, role });

    logger.info(`User registered: ${input.email}`);
    return { user: { id: userId, email: input.email, role }, tokens };
  }

  async login(input: LoginInput): Promise<{ user: { id: string; email: string; role: UserRole }; tokens: AuthTokens }> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw { status: 401, message: 'User not found' };
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw { status: 401, message: 'Invalid password' };
    }

    const tokens = this.generateTokens({ sub: user.userId, email: user.email, role: user.role });
    logger.info(`User logged in: ${input.email}`);
    return { user: { id: user.userId, email: user.email, role: user.role }, tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, env.jwtRefreshSecret) as JwtPayload;
      const tokens = this.generateTokens({ sub: payload.sub, email: payload.email, role: payload.role });
      return tokens;
    } catch {
      throw { status: 401, message: 'Invalid refresh token' };
    }
  }

  async getMe(userId: string): Promise<{ id: string; email: string; role: UserRole } | null> {
    const user = await this.userRepo.findById(`USER#${userId}`, 'METADATA');
    if (!user) return null;
    return { id: user.userId, email: user.email, role: user.role };
  }
}