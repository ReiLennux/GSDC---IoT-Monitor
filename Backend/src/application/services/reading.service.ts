import { v4 as uuid } from 'uuid';
import { ReadingRepository } from '../../domain/repositories/reading.repository';
import { DeviceRepository } from '../../domain/repositories/device.repository';
import { AlertRepository } from '../../domain/repositories/alert.repository';
import { Reading } from '../../domain/entities/reading.entity';
import { Alert } from '../../domain/entities/alert.entity';
import { ReadingQuality, AlertSeverity, AlertType } from '../../domain/enums';
import { emitDeviceReading, emitAlertNew } from '../../infrastructure/websocket/socket';
import { logger } from '../../utils/logger';

interface IncomingReading {
  deviceId: string;
  value: number;
  unit: string;
  quality?: ReadingQuality;
  timestamp?: string;
}

export class ReadingService {
  constructor(
    private readingRepo: ReadingRepository,
    private deviceRepo: DeviceRepository,
    private alertRepo?: AlertRepository,
  ) {}

  async findByDeviceId(deviceId: string, limit?: number, cursor?: string) {
    return this.readingRepo.findByDeviceId(deviceId, limit, cursor);
  }

  async createBatch(readings: IncomingReading[]) {
    const now = new Date();
    const items: Reading[] = readings.map(r => ({
      PK: `DEVICE#${r.deviceId}`,
      SK: `READING#${r.timestamp || now.toISOString()}`,
      deviceId: r.deviceId,
      value: r.value,
      unit: r.unit,
      quality: r.quality || ReadingQuality.GOOD,
      timestamp: r.timestamp || now.toISOString(),
      TTL: Math.floor(now.getTime() / 1000) + 30 * 24 * 60 * 60,
    }));

    await this.readingRepo.createBatch(items);

    for (const reading of readings) {
      emitDeviceReading(reading.deviceId, reading);
      await this.evaluateThresholds(reading);
    }
  }

  private async evaluateThresholds(reading: IncomingReading) {
    try {
      const device = await this.deviceRepo.findById(`DEVICE#${reading.deviceId}`, 'METADATA');
      if (!device) return;

      const { thresholds } = device;
      if (reading.value >= thresholds.criticalMax || reading.value <= thresholds.criticalMin) {
        await this.createAlert(reading.deviceId, AlertSeverity.CRITICAL, reading.value);
      } else if (reading.value >= thresholds.max || reading.value <= thresholds.min) {
        await this.createAlert(reading.deviceId, AlertSeverity.WARNING, reading.value);
      }
    } catch (error) {
      logger.error('Error evaluating thresholds', error);
    }
  }

  private async createAlert(deviceId: string, severity: AlertSeverity, value: number) {
    if (!this.alertRepo) return;

    const alertId = uuid();
    const alert: Alert = {
      PK: `ALERT#${alertId}`,
      SK: 'METADATA',
      GSI1PK: `DEVICE#${deviceId}`,
      alertId,
      deviceId,
      severity,
      type: AlertType.THRESHOLD_EXCEEDED,
      message: `${severity === AlertSeverity.CRITICAL ? 'CRITICAL' : 'Warning'}: Device ${deviceId} value ${value}`,
      acknowledged: false,
      resolvedAt: null,
      createdAt: new Date().toISOString(),
    };

    await this.alertRepo.create(alert);
    emitAlertNew(alert);
  }
}
