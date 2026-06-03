import { DeviceRepository } from '../../domain/repositories/device.repository';
import { ReadingRepository } from '../../domain/repositories/reading.repository';
import { AlertRepository } from '../../domain/repositories/alert.repository';

export class DashboardService {
  constructor(
    private deviceRepo: DeviceRepository,
    private readingRepo: ReadingRepository,
    private alertRepo: AlertRepository,
  ) {}

  async getOverview() {
    const devices = (await this.deviceRepo.query('DEVICE#', { limit: 500 })).data;
    const alerts = (await this.alertRepo.query('ALERT#', { limit: 50, reverse: true })).data;

    return {
      totalDevices: devices.length,
      onlineDevices: devices.filter(d => d.status === 'online').length,
      criticalDevices: devices.filter(d => d.status === 'critical').length,
      activeAlerts: alerts.filter(a => !a.acknowledged).length,
      recentAlerts: alerts.slice(0, 10),
    };
  }

  async getRackSummary(rackId: string) {
    const devices = await this.deviceRepo.findByRack(rackId);
    return { rack: rackId, deviceCount: devices.length, devices };
  }

  async getTrends(days = 7) {
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
      min: Math.min(...values),
      max: Math.max(...values),
      sampleCount: values.length,
    }));

    return { period: `${days}d`, from, to: now.toISOString(), trends };
  }
}