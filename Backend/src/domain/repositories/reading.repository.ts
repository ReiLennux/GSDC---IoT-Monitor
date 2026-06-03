import { BaseRepository } from './base.repository';
import { Reading } from '../entities/reading.entity';

export interface ReadingRepository extends BaseRepository<Reading> {
  findByDeviceId(deviceId: string, limit?: number, cursor?: string): Promise<{ data: Reading[]; nextCursor: string | null }>;
  findAll(limit?: number, cursor?: string): Promise<{ data: Reading[]; nextCursor: string | null }>;
  createBatch(readings: Reading[]): Promise<void>;
}