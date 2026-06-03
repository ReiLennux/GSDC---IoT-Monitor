import { DeviceType, ReadingQuality, DeviceStatus } from '../domain/enums';

export interface SimulatedReading {
  deviceId: string;
  value: number;
  unit: string;
  quality: ReadingQuality;
  timestamp: string;
}

interface DeviceConfig {
  unit: string;
  min: number;
  max: number;
  criticalMax: number;
}

const sensorConfigs: Record<DeviceType, DeviceConfig> = {
  [DeviceType.TEMPERATURE]: { unit: '°C', min: 18, max: 45, criticalMax: 35 },
  [DeviceType.HUMIDITY]: { unit: '%', min: 20, max: 80, criticalMax: 70 },
  [DeviceType.POWER]: { unit: 'kW', min: 0, max: 100, criticalMax: 85 },
  [DeviceType.UPS]: { unit: '%', min: 0, max: 100, criticalMax: 80 },
  [DeviceType.COOLING]: { unit: 'L/min', min: 10, max: 150, criticalMax: 120 },
};

export class DeviceSimulator {
  private devices: Array<{ id: string; type: DeviceType; online: boolean }> = [];
  private anomalyProbability: number;

  constructor(anomalyProbability: number) {
    this.anomalyProbability = anomalyProbability;
  }

  setDevices(devices: Array<{ id: string; type: DeviceType }>) {
    this.devices = devices.map((d) => ({ ...d, online: true }));
  }

  getDevices() {
    return this.devices.map((d) => ({ id: d.id, type: d.type, status: d.online ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE }));
  }

  generateReadings(): SimulatedReading[] {
    return this.devices.map((device) => {
      const config = sensorConfigs[device.type];
      const now = new Date();

      let value: number;
      let quality: ReadingQuality;

      if (!device.online) {
        value = 0;
        quality = ReadingQuality.BAD;
      } else if (Math.random() < this.anomalyProbability) {
        value = config.criticalMax + Math.random() * 10;
        quality = ReadingQuality.UNCERTAIN;
      } else {
        value = config.min + Math.random() * (config.max - config.min);
        quality = ReadingQuality.GOOD;
      }

      return {
        deviceId: device.id,
        value: Math.round(value * 100) / 100,
        unit: config.unit,
        quality,
        timestamp: now.toISOString(),
      };
    });
  }

  simulateStatusChanges() {
    for (const device of this.devices) {
      if (Math.random() < 0.01) {
        device.online = !device.online;
      }
    }
  }
}
