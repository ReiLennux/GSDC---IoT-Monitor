import { v4 as uuid } from 'uuid';
import { DeviceRepository } from '../../domain/repositories/device.repository';
import { ReadingRepository } from '../../domain/repositories/reading.repository';
import { AlertRepository } from '../../domain/repositories/alert.repository';
import { Device } from '../../domain/entities/device.entity';
import { DeviceStatus } from '../../domain/enums';
import { emitDeviceStatus } from '../../infrastructure/websocket/socket';
import { kpiCache } from '../../infrastructure/cache/kpi-cache';
import { BaseUseCase } from './base.usecase';
import {
  CreateDeviceDto, UpdateDeviceDto, UpdateStatusDto, DeleteDeviceDto,
  ListDevicesDto, GetDeviceDto, GetDeviceReadingsDto, GetDeviceAlertsDto,
} from '../dtos';

export class DeviceUseCases extends BaseUseCase {
  constructor(
    private deviceRepo: DeviceRepository,
    private readingRepo: ReadingRepository,
    private alertRepo: AlertRepository,
  ) { super(); }

  async create(dto: CreateDeviceDto): Promise<Device> {
    const deviceId = uuid();
    const now = new Date().toISOString();
    const device: Device = {
      PK: `DEVICE#${deviceId}`, SK: 'METADATA', deviceId,
      name: dto.name, type: dto.type, location: dto.location,
      status: DeviceStatus.ONLINE,
      thresholds: {
        min: dto.thresholds?.min ?? 0, max: dto.thresholds?.max ?? 100,
        criticalMin: dto.thresholds?.criticalMin ?? 0, criticalMax: dto.thresholds?.criticalMax ?? 100,
      },
      metadata: {
        manufacturer: dto.metadata?.manufacturer ?? '',
        model: dto.metadata?.model ?? '',
        firmwareVersion: dto.metadata?.firmwareVersion ?? '',
      },
      createdAt: now, updatedAt: now,
    };
    await this.deviceRepo.create(device);
    kpiCache.del('overview');
    return device;
  }

  async list(dto: ListDevicesDto) {
    return this.deviceRepo.query('DEVICE#', { limit: dto.limit ?? 500, cursor: dto.cursor });
  }

  async getById(dto: GetDeviceDto): Promise<Device> {
    const device = await this.deviceRepo.findById(`DEVICE#${dto.id}`, 'METADATA');
    if (!device) this.notFound('Device not found');
    return device!;
  }

  async update(dto: UpdateDeviceDto): Promise<Device> {
    const existing = await this.deviceRepo.findById(`DEVICE#${dto.id}`, 'METADATA');
    if (!existing) this.notFound('Device not found');

    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.location !== undefined) data.location = { ...existing.location, ...dto.location };
    if (dto.thresholds !== undefined) data.thresholds = { ...existing.thresholds, ...dto.thresholds };
    if (dto.metadata !== undefined) data.metadata = { ...existing.metadata, ...dto.metadata };

    const device = await this.deviceRepo.update(`DEVICE#${dto.id}`, 'METADATA', data as Partial<Device>);
    kpiCache.del('overview');
    return device;
  }

  async updateStatus(dto: UpdateStatusDto): Promise<Device> {
    const existing = await this.deviceRepo.findById(`DEVICE#${dto.id}`, 'METADATA');
    if (!existing) this.notFound('Device not found');

    const device = await this.deviceRepo.updateStatus(dto.id, dto.status);
    emitDeviceStatus(dto.id, dto.status);
    kpiCache.del('overview');
    return device;
  }

  async delete(dto: DeleteDeviceDto): Promise<void> {
    const existing = await this.deviceRepo.findById(`DEVICE#${dto.id}`, 'METADATA');
    if (!existing) this.notFound('Device not found');

    await this.deviceRepo.delete(`DEVICE#${dto.id}`, 'METADATA');
    kpiCache.del('overview');
  }

  async stats() {
    const devices = (await this.deviceRepo.query('DEVICE#', { limit: 500 })).data;
    return {
      total: devices.length,
      online: devices.filter(d => d.status === DeviceStatus.ONLINE).length,
      offline: devices.filter(d => d.status === DeviceStatus.OFFLINE).length,
      critical: devices.filter(d => d.status === DeviceStatus.CRITICAL).length,
      maintenance: devices.filter(d => d.status === DeviceStatus.MAINTENANCE).length,
    };
  }

  async getReadings(dto: GetDeviceReadingsDto) {
    return this.readingRepo.findByDeviceId(dto.deviceId, dto.limit, dto.cursor);
  }

  async getAlerts(dto: GetDeviceAlertsDto) {
    return this.alertRepo.findByDeviceId(dto.deviceId);
  }
}
