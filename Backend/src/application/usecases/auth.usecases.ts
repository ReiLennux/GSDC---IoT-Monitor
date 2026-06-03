import { v4 as uuid } from 'uuid';
import { UserRepository } from '../../domain/repositories/user.repository';
import { UserRole } from '../../domain/enums';
import { BaseUseCase } from './base.usecase';
import { RegisterDto, LoginDto, RefreshDto, LogoutDto, GetCurrentUserDto } from '../dtos';
import { logger } from '../../utils/logger';
import { HashService } from '../ports/hash-service';
import { TokenService } from '../ports/token-service';

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export class AuthUseCases extends BaseUseCase {
  constructor(
    private userRepo: UserRepository,
    private hashService: HashService,
    private accessTokenService: TokenService,
    private refreshTokenService: TokenService,
  ) { super(); }

  private generateTokens(userId: string, email: string, role: UserRole) {
    const jti = uuid();
    const accessToken = this.accessTokenService.sign({ sub: userId, email, role }, { expiresIn: ACCESS_EXPIRY });
    const refreshToken = this.refreshTokenService.sign({ sub: userId, email, role, jti }, { expiresIn: `${REFRESH_EXPIRY_SECONDS}s` });
    return { accessToken, refreshToken, jti };
  }

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) this.conflict('Email already registered');

    const passwordHash = await this.hashService.hash(dto.password);
    const userId = uuid();
    const role = dto.role || UserRole.VIEWER;

    await this.userRepo.create({
      userId, email: dto.email, passwordHash, role, isActive: true,
    });

    const { accessToken, refreshToken, jti } = this.generateTokens(userId, dto.email, role);
    const ttl = Math.floor(Date.now() / 1000) + REFRESH_EXPIRY_SECONDS;
    await this.userRepo.saveRefreshToken(userId, jti, ttl);

    logger.info(`User registered: ${dto.email}`);
    return { user: { id: userId, email: dto.email, role }, tokens: { accessToken, refreshToken } };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) this.unauthorized('User not found');

    const valid = await this.hashService.compare(dto.password, user!.passwordHash);
    if (!valid) this.unauthorized('Invalid password');

    const { accessToken, refreshToken, jti } = this.generateTokens(user!.userId, user!.email, user!.role);
    const ttl = Math.floor(Date.now() / 1000) + REFRESH_EXPIRY_SECONDS;
    await this.userRepo.saveRefreshToken(user!.userId, jti, ttl);

    logger.info(`User logged in: ${dto.email}`);
    return { user: { id: user!.userId, email: user!.email, role: user!.role }, tokens: { accessToken, refreshToken } };
  }

  async refresh(dto: RefreshDto) {
    let payload: { sub: string; email: string; role: UserRole; jti: string };
    try {
      payload = this.refreshTokenService.verify(dto.refreshToken);
    } catch {
      this.unauthorized('Invalid refresh token');
    }

    if (!payload!.jti) this.unauthorized('Invalid refresh token');

    const tokenRecord = await this.userRepo.findRefreshToken(payload!.jti);
    if (!tokenRecord || !tokenRecord.isValid) this.unauthorized('Refresh token has been revoked');

    const user = await this.userRepo.findById(payload!.sub);
    if (!user) this.unauthorized('User not found');
    if (!user.isActive) this.unauthorized('User account is inactive');

    await this.userRepo.invalidateRefreshToken(payload!.jti);

    const { accessToken, refreshToken, jti } = this.generateTokens(user.userId, user.email, user.role);
    const ttl = Math.floor(Date.now() / 1000) + REFRESH_EXPIRY_SECONDS;
    await this.userRepo.saveRefreshToken(user.userId, jti, ttl);

    return { accessToken, refreshToken };
  }


  async logout(dto: LogoutDto) {
    await this.userRepo.invalidateAllUserTokens(dto.userId);
    logger.info(`User logged out: ${dto.userId}`);
  }

  async getMe(dto: GetCurrentUserDto) {
    const user = await this.userRepo.findById(dto.userId);
    if (!user) return null;
    return { id: user.userId, email: user.email, role: user.role };
  }
}
