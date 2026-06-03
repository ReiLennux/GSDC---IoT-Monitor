import { v4 as uuid } from 'uuid';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ReadingRepository } from '../../domain/repositories/reading.repository';
import { DeviceRepository } from '../../domain/repositories/device.repository';
import { AlertRepository } from '../../domain/repositories/alert.repository';
import { Reading } from '../../domain/entities/reading.entity';
import { Alert } from '../../domain/entities/alert.entity';
import { AlertSeverity, AlertType, ReadingQuality } from '../../domain/enums';
import { emitDeviceReading, emitAlertNew } from '../../infrastructure/websocket/socket';
import { docClient } from '../../infrastructure/database/dynamodb';
import { env } from '../../config/env';
import { BaseUseCase } from './base.usecase';
import { GetAllReadingsDto, AnalyticsDto, BatchReadingsDto } from '../dtos';
import { logger } from '../../utils/logger';

interface ReadingItem {
  deviceId: string; value: number; unit: string;
  quality?: ReadingQuality; timestamp?: string;
}

export class ReadingUseCases extends BaseUseCase {
  constructor(
    private readingRepo: ReadingRepository,
    private deviceRepo: DeviceRepository,
    private alertRepo: AlertRepository,
  ) { super(); }

  async findAll(dto: GetAllReadingsDto) {
    return this.readingRepo.findAll(dto.limit, dto.cursor);
  }

  async analytics(dto: AnalyticsDto) {
    const hours = dto.hours || 1;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const result = await docClient.send(new ScanCommand({
      TableName: env.dynamodbTableName,
      FilterExpression: 'begins_with(SK, :prefix) AND SK >= :since',
      ExpressionAttributeValues: {
        ':prefix': 'READING#',
        ':since': `READING#${since}`,
      },
      Limit: 1000,
    }));

    const readings = (result.Items || []) as Reading[];
    const byUnit: Record<string, { values: number[]; count: number }> = {};

    for (const r of readings) {
      if (!byUnit[r.unit]) byUnit[r.unit] = { values: [], count: 0 };
      byUnit[r.unit].values.push(r.value);
      byUnit[r.unit].count++;
    }

    return Object.entries(byUnit).map(([unit, data]) => {
      const sorted = [...data.values].sort((a, b) => a - b);
      return {
        unit, count: data.count,
        avg: Math.round((data.values.reduce((s, v) => s + v, 0) / data.values.length) * 100) / 100,
        min: sorted[0], max: sorted[sorted.length - 1],
      };
    });
  }

  async publishBatch(dto: BatchReadingsDto) {
    const now = new Date();
    const items: Reading[] = dto.readings.map(r => ({
      PK: `DEVICE#${r.deviceId}`,
      SK: `READING#${r.timestamp || now.toISOString()}`,
      deviceId: r.deviceId, value: r.value, unit: r.unit,
      quality: r.quality || ReadingQuality.GOOD,
      timestamp: r.timestamp || now.toISOString(),
      TTL: Math.floor(now.getTime() / 1000) + 30 * 24 * 60 * 60,
    }));

    await this.readingRepo.createBatch(items);

    for (const reading of dto.readings) {
      emitDeviceReading(reading.deviceId, reading);
      await this.evaluateThresholds(reading);
    }
  }

  private async evaluateThresholds(reading: ReadingItem) {
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
    const alertId = uuid();
    const alert: Alert = {
      PK: `ALERT#${alertId}`, SK: 'METADATA', GSI1PK: `DEVICE#${deviceId}`,
      alertId, deviceId, severity,
      type: AlertType.THRESHOLD_EXCEEDED,
      message: `${severity === AlertSeverity.CRITICAL ? 'CRITICAL' : 'Warning'}: Device ${deviceId} value ${value}`,
      acknowledged: false, resolvedAt: null,
      createdAt: new Date().toISOString(),
    };

    await this.alertRepo.create(alert);
    emitAlertNew(alert);
  }
}
