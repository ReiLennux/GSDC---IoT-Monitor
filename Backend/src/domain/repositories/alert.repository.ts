import { BaseRepository } from './base.repository';
import { Alert } from '../entities/alert.entity';

export interface AlertRepository extends BaseRepository<Alert> {
  findByDeviceId(deviceId: string): Promise<Alert[]>;
  acknowledge(id: string): Promise<Alert>;
  resolve(id: string): Promise<Alert>;
}