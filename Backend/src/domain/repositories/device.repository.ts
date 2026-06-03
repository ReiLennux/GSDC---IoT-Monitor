import { BaseRepository } from './base.repository';
import { Device } from '../entities/device.entity';
import { DeviceStatus } from '../enums';

export interface DeviceRepository extends BaseRepository<Device> {
  findByStatus(status: DeviceStatus): Promise<Device[]>;
  findByRack(rackId: string): Promise<Device[]>;
  updateStatus(id: string, status: DeviceStatus): Promise<Device>;
}