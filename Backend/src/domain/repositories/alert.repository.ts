import { BaseRepository, PaginationResult, QueryOptions } from './base.repository';
import { Alert } from '../entities/alert.entity';

export interface AlertRepository extends BaseRepository<Alert> {
  findById(id: string): Promise<Alert | null>;
  query(options?: QueryOptions): Promise<PaginationResult<Alert>>;
  findByDeviceId(deviceId: string, limit?: number, cursor?: string): Promise<PaginationResult<Alert>>;
  acknowledge(id: string): Promise<Alert>;
  resolve(id: string): Promise<Alert>;
}