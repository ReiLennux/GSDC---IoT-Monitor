import { BaseRepository, PaginationResult } from './base.repository';
import { Reading } from '../entities/reading.entity';

export interface AnalyticsResult {
  type: string;
  count: number;
  avg: number;
  min: number;
  max: number;
}

export interface ReadingRepository extends BaseRepository<Reading> {
  findByDeviceId(deviceId: string, limit?: number, cursor?: string): Promise<PaginationResult<Reading>>;
  findAll(limit?: number, cursor?: string): Promise<PaginationResult<Reading>>;
  createBatch(readings: Reading[]): Promise<void>;
  getAnalytics(hours: number): Promise<AnalyticsResult[]>;
}