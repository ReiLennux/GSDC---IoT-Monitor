import { DeviceType, ReadingQuality, DeviceStatus } from '../domain/enums';

export interface SimulatedReading {
  deviceId: string;
  type: DeviceType;
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

// Los rangos normales (min–max) deben mantenerse dentro de los umbrales seguros
// para que solo el 5% de anomalías dispare alertas (según PRUEBA_TECNICA.md).
// criticalMax se alinea con el threshold crítico del dispositivo registrado en DEVICE_PLAN.
const sensorConfigs: Record<DeviceType, DeviceConfig> = {
  [DeviceType.TEMPERATURE]: { unit: '°C', min: 22, max: 32, criticalMax: 40 },
  [DeviceType.HUMIDITY]: { unit: '%', min: 30, max: 65, criticalMax: 80 },
  [DeviceType.POWER]: { unit: 'kW', min: 10, max: 75, criticalMax: 95 },
  [DeviceType.UPS]: { unit: '%', min: 25, max: 75, criticalMax: 80 },
  [DeviceType.COOLING]: { unit: 'L/min', min: 20, max: 110, criticalMax: 130 },
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

  private generateSingleReading(device: { id: string; type: DeviceType; online: boolean }): SimulatedReading {
    const config = sensorConfigs[device.type];
    const now = new Date();

    let value: number;
    let quality: ReadingQuality;

    if (!device.online) {
      value = Math.round(((config.min + config.max) / 2) * 100) / 100;
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
      type: device.type,
      value: Math.round(value * 100) / 100,
      unit: config.unit,
      quality,
      timestamp: now.toISOString(),
    };
  }

  generateReadings(): SimulatedReading[] {
    return this.devices.map((device) => this.generateSingleReading(device));
  }

  generateDeviceReading(deviceId: string): SimulatedReading | null {
    const device = this.devices.find((d) => d.id === deviceId);
    return device ? this.generateSingleReading(device) : null;
  }

  simulateStatusChanges() {
    for (const device of this.devices) {
      if (Math.random() < 0.01) {
        device.online = !device.online;
      }
    }
  }
}
