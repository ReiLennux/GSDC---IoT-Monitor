import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { env } from '../../config/env';
import { UserRepository } from '../../domain/repositories/user.repository';
import { UserRole } from '../../domain/enums';
import { BaseUseCase } from './base.usecase';
import { RegisterDto, LoginDto, RefreshDto, LogoutDto, GetCurrentUserDto } from '../dtos';
import { logger } from '../../utils/logger';

export class AuthUseCases extends BaseUseCase {
  constructor(private userRepo: UserRepository) { super(); }

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) this.conflict('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const userId = uuid();
    const role = dto.role || UserRole.VIEWER;

    await this.userRepo.create({
      PK: `USER#${userId}`, SK: 'METADATA', GSI1PK: `EMAIL#${dto.email}`,
      userId, email: dto.email, passwordHash, role, isActive: true,
    });

    const accessToken = jwt.sign({ sub: userId, email: dto.email, role }, env.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sub: userId, email: dto.email, role }, env.jwtRefreshSecret, { expiresIn: '7d' });

    logger.info(`User registered: ${dto.email}`);
    return { user: { id: userId, email: dto.email, role }, tokens: { accessToken, refreshToken } };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) this.unauthorized('User not found');

    const valid = await bcrypt.compare(dto.password, user!.passwordHash);
    if (!valid) this.unauthorized('Invalid password');

    const accessToken = jwt.sign({ sub: user!.userId, email: user!.email, role: user!.role }, env.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sub: user!.userId, email: user!.email, role: user!.role }, env.jwtRefreshSecret, { expiresIn: '7d' });

    logger.info(`User logged in: ${dto.email}`);
    return { user: { id: user!.userId, email: user!.email, role: user!.role }, tokens: { accessToken, refreshToken } };
  }

  async refresh(dto: RefreshDto) {
    let payload: { sub: string; email: string; role: UserRole };
    try {
      payload = jwt.verify(dto.refreshToken, env.jwtRefreshSecret) as typeof payload;
    } catch {
      this.unauthorized('Invalid refresh token');
    }

    const user = await this.userRepo.findById(`USER#${payload!.sub}`, 'METADATA');
    if (!user || !user.isActive) this.unauthorized('User not found or inactive');

    const accessToken = jwt.sign({ sub: user!.userId, email: user!.email, role: user!.role }, env.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sub: user!.userId, email: user!.email, role: user!.role }, env.jwtRefreshSecret, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }

  async logout(dto: LogoutDto) {
    logger.info(`User logged out: ${dto.userId}`);
  }

  async getMe(dto: GetCurrentUserDto) {
    const user = await this.userRepo.findById(`USER#${dto.userId}`, 'METADATA');
    if (!user) return null;
    return { id: user.userId, email: user.email, role: user.role };
  }
}
