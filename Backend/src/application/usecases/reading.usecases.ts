import { v4 as uuid } from 'uuid';
import { ReadingRepository } from '../../domain/repositories/reading.repository';
import { DeviceRepository } from '../../domain/repositories/device.repository';
import { AlertRepository } from '../../domain/repositories/alert.repository';
import { Reading } from '../../domain/entities/reading.entity';
import { Alert } from '../../domain/entities/alert.entity';
import { AlertSeverity, AlertType, ReadingQuality, DeviceStatus, DeviceType } from '../../domain/enums';
import { BaseUseCase } from './base.usecase';
import { GetAllReadingsDto, AnalyticsDto, BatchReadingsDto } from '../dtos';
import { logger } from '../../utils/logger';

interface ReadingItem {
  deviceId: string; type?: string; value: number; unit: string;
  quality?: ReadingQuality; timestamp?: string;
}

export class ReadingUseCases extends BaseUseCase {
  constructor(
    private readingRepo: ReadingRepository,
    private deviceRepo: DeviceRepository,
    private alertRepo: AlertRepository,
    private onReadingReceived: (deviceId: string, reading: unknown) => void,
    private onAlertCreated: (alert: Alert) => void,
    private onDeviceStatusChanged?: (deviceId: string, status: DeviceStatus) => void,
  ) { super(); }

  async findAll(dto: GetAllReadingsDto) {
    if (dto.deviceId) {
      return this.readingRepo.findByDeviceId(dto.deviceId, dto.limit, dto.cursor);
    }
    return this.readingRepo.findAll(dto.limit, dto.cursor);
  }

  async analytics(dto: AnalyticsDto) {
    return this.readingRepo.getAnalytics(dto.hours || 1);
  }

  async publishBatch(dto: BatchReadingsDto) {
    const now = new Date();
    const items: Reading[] = dto.readings.map(r => ({
      deviceId: r.deviceId,
      type: (r.type || 'unknown') as DeviceType,
      value: r.value, unit: r.unit,
      quality: r.quality || ReadingQuality.GOOD,
      timestamp: r.timestamp || now.toISOString(),
    }));

    await this.readingRepo.createBatch(items);

    for (const reading of dto.readings) {
      this.onReadingReceived(reading.deviceId, reading);
      await this.evaluateThresholds(reading);
    }
  }

  private async evaluateThresholds(reading: ReadingItem) {
    try {
      const device = await this.deviceRepo.findById(reading.deviceId);
      if (!device) return;

      const severity = device.checkThresholds(reading.value);
      if (severity) {
        await this.createAlert(reading.deviceId, severity, reading.value);
        if (severity === AlertSeverity.CRITICAL && device.status !== DeviceStatus.CRITICAL) {
          await this.deviceRepo.updateStatus(reading.deviceId, DeviceStatus.CRITICAL);
          this.onDeviceStatusChanged?.(reading.deviceId, DeviceStatus.CRITICAL);
        }
      } else if (device.status === DeviceStatus.CRITICAL) {
        await this.deviceRepo.updateStatus(reading.deviceId, DeviceStatus.ONLINE);
        this.onDeviceStatusChanged?.(reading.deviceId, DeviceStatus.ONLINE);
      }
    } catch (error) {
      logger.error('Error evaluating thresholds', error);
    }
  }

  private async createAlert(deviceId: string, severity: AlertSeverity, value: number) {
    const alertId = uuid();
    const alert: Alert = {
      alertId, deviceId, severity,
      type: AlertType.THRESHOLD_EXCEEDED,
      message: `${severity === AlertSeverity.CRITICAL ? 'CRITICAL' : 'Warning'}: Device ${deviceId} value ${value}`,
      acknowledged: false, resolvedAt: null,
      createdAt: new Date().toISOString(),
    };

    await this.alertRepo.create(alert);
    this.onAlertCreated(alert);
  }
}
