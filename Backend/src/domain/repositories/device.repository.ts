import { BaseRepository, PaginationResult, QueryOptions } from './base.repository';
import { Device } from '../entities/device.entity';
import { DeviceStatus } from '../enums';

export interface DeviceRepository extends BaseRepository<Device> {
  findById(id: string): Promise<Device | null>;
  update(id: string, data: Partial<Device>): Promise<Device>;
  delete(id: string): Promise<void>;
  query(options?: QueryOptions): Promise<PaginationResult<Device>>;
  findByStatus(status: DeviceStatus): Promise<Device[]>;
  findByRack(rackId: string): Promise<Device[]>;
  updateStatus(id: string, status: DeviceStatus): Promise<Device>;
}