import { BaseRepository } from "./base.repository";
import { User } from "../entities/user.entity";

export interface RefreshTokenRecord {
    userId: string;
    jti: string;
    isValid: boolean;
    TTL: number;
}

export interface UserRepository extends BaseRepository<User> {
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    saveRefreshToken(userId: string, jti: string, ttl: number): Promise<void>;
    findRefreshToken(jti: string): Promise<RefreshTokenRecord | null>;
    invalidateRefreshToken(jti: string): Promise<void>;
    invalidateAllUserTokens(userId: string): Promise<void>;
}