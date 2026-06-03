import { BaseRepository } from "./base.repository";
import { User } from "../entities/user.entity";

export interface RefreshTokenRecord {
    PK: string;
    SK: string;
    GSI1PK: string;
    GSI1SK: string;
    userId: string;
    jti: string;
    isValid: boolean;
    TTL: number;
}

export interface UserRepository extends BaseRepository<User> {
    findByEmail(email: string): Promise<User | null>;
    saveRefreshToken(userId: string, jti: string, expiresAt: number): Promise<void>;
    findRefreshToken(jti: string): Promise<RefreshTokenRecord | null>;
    invalidateRefreshToken(jti: string): Promise<void>;
    invalidateAllUserTokens(userId: string): Promise<void>;
}