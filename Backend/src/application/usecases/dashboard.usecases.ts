import { DeviceRepository } from '../../domain/repositories/device.repository';
import { ReadingRepository } from '../../domain/repositories/reading.repository';
import { AlertRepository } from '../../domain/repositories/alert.repository';
import { kpiCache } from '../../infrastructure/cache/kpi-cache';
import { BaseUseCase } from './base.usecase';
import { GetRackSummaryDto, GetTrendsDto } from '../dtos';

export class DashboardUseCases extends BaseUseCase {
  constructor(
    private deviceRepo: DeviceRepository,
    private readingRepo: ReadingRepository,
    private alertRepo: AlertRepository,
  ) { super(); }

  async overview() {
    const cached = kpiCache.get('overview');
    if (cached) return cached;

    const devices = (await this.deviceRepo.query('DEVICE#', { limit: 500 })).data;
    const alerts = (await this.alertRepo.query('ALERT#', { limit: 50, reverse: true })).data;

    const result = {
      totalDevices: devices.length,
      onlineDevices: devices.filter(d => d.status === 'online').length,
      criticalDevices: devices.filter(d => d.status === 'critical').length,
      activeAlerts: alerts.filter(a => !a.acknowledged).length,
      recentAlerts: alerts.slice(0, 10),
    };

    kpiCache.set('overview', result);
    return result;
  }

  async rackSummary(dto: GetRackSummaryDto) {
    const key = `rack:${dto.rackId}`;
    const cached = kpiCache.get(key);
    if (cached) return cached;

    const devices = await this.deviceRepo.findByRack(dto.rackId);
    const result = { rack: dto.rackId, deviceCount: devices.length, devices };

    kpiCache.set(key, result);
    return result;
  }

  async trends(dto: GetTrendsDto) {
    const days = dto.days || 7;
    const key = `trends:${days}`;
    const cached = kpiCache.get(key);
    if (cached) return cached;

    const devices = (await this.deviceRepo.query('DEVICE#', { limit: 500 })).data;
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

    const readingsByType: Record<string, number[]> = {};
    for (const device of devices) {
      const readings = (await this.readingRepo.findByDeviceId(device.deviceId, 100)).data;
      const recent = readings.filter(r => r.timestamp >= from);
      if (recent.length > 0) {
        if (!readingsByType[device.type]) readingsByType[device.type] = [];
        readingsByType[device.type].push(...recent.map(r => r.value));
      }
    }

    const trends = Object.entries(readingsByType).map(([type, values]) => ({
      type,
      avg: values.reduce((a, b) => a + b, 0) / values.length || 0,
      min: Math.min(...values), max: Math.max(...values),
      sampleCount: values.length,
    }));

    const result = { period: `${days}d`, from, to: now.toISOString(), trends };
    kpiCache.set(key, result);
    return result;
  }
}
