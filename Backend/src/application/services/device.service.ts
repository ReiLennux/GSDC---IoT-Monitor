import { v4 as uuid } from 'uuid';
import { DeviceRepository } from '../../domain/repositories/device.repository';
import { Device } from '../../domain/entities/device.entity';
import { DeviceStatus, DeviceType } from '../../domain/enums';
import { emitDeviceStatus } from '../../infrastructure/websocket/socket';
import { kpiCache } from '../../infrastructure/cache/kpi-cache';

interface CreateDeviceInput {
  name: string;
  type: DeviceType;
  location: { rack: string; position: string; floor: number };
  thresholds?: { min?: number; max?: number; criticalMin?: number; criticalMax?: number };
  metadata?: { manufacturer: string; model: string; firmwareVersion: string };
}

export class DeviceService {
  constructor(private deviceRepo: DeviceRepository) {}

  async findAll() {
    return this.deviceRepo.query('DEVICE#', { limit: 500 });
  }

  async findById(id: string) {
    const device = await this.deviceRepo.findById(`DEVICE#${id}`, 'METADATA');
    if (!device) throw { status: 404, message: 'Device not found' };
    return device;
  }

  async create(input: CreateDeviceInput) {
    const deviceId = uuid();
    const now = new Date().toISOString();
    const device: Device = {
      PK: `DEVICE#${deviceId}`,
      SK: 'METADATA',
      deviceId,
      name: input.name,
      type: input.type,
      location: input.location,
      status: DeviceStatus.ONLINE,
      thresholds: {
        min: input.thresholds?.min ?? 0,
        max: input.thresholds?.max ?? 100,
        criticalMin: input.thresholds?.criticalMin ?? 0,
        criticalMax: input.thresholds?.criticalMax ?? 100,
      },
      metadata: input.metadata || { manufacturer: '', model: '', firmwareVersion: '' },
      createdAt: now,
      updatedAt: now,
    };
    const result = this.deviceRepo.create(device);
    kpiCache.del('overview');
    return result;
  }

  async update(id: string, data: Partial<Device>) {
    await this.findById(id);
    const result = this.deviceRepo.update(`DEVICE#${id}`, 'METADATA', {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    kpiCache.del('overview');
    return result;
  }

  async updateStatus(id: string, status: DeviceStatus) {
    await this.findById(id);
    const device = await this.deviceRepo.updateStatus(id, status);
    emitDeviceStatus(id, status);
    kpiCache.del('overview');
    return device;
  }

  async delete(id: string) {
    await this.findById(id);
    await this.deviceRepo.delete(`DEVICE#${id}`, 'METADATA');
    kpiCache.del('overview');
  }

  async getStatsSummary() {
    const devices = (await this.deviceRepo.query('DEVICE#', { limit: 500 })).data;
    return {
      total: devices.length,
      online: devices.filter(d => d.status === DeviceStatus.ONLINE).length,
      offline: devices.filter(d => d.status === DeviceStatus.OFFLINE).length,
      critical: devices.filter(d => d.status === DeviceStatus.CRITICAL).length,
      maintenance: devices.filter(d => d.status === DeviceStatus.MAINTENANCE).length,
    };
  }
}