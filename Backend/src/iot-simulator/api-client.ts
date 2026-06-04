import { simConfig } from './config';
import { logger } from '../utils/logger';
import { DeviceType } from '../domain/enums';
import type { SimulatedReading } from './device-simulator';

type AuthTokens = { accessToken: string; refreshToken: string };

interface RegisteredDevice {
  id: string;
  type: DeviceType;
}

const RACKS = Array.from({ length: 50 }, (_, i) => `RACK-${i + 1}`);
const FLOORS = [1, 2, 3, 4, 5];

type DevicePlan = { type: DeviceType; count: number; unit: string; min: number; max: number; criticalMin: number; criticalMax: number };
interface DeviceInput {
  plan: DevicePlan;
  rack: string;
  floor: number;
  position: string;
  deviceIndex: number;
}

const DEVICE_PLAN: DevicePlan[] = [
  { type: DeviceType.TEMPERATURE, count: 150, unit: '°C', min: 10, max: 35, criticalMin: 0, criticalMax: 40 },
  { type: DeviceType.HUMIDITY, count: 100, unit: '%', min: 20, max: 70, criticalMin: 10, criticalMax: 80 },
  { type: DeviceType.POWER, count: 100, unit: 'kW', min: 0, max: 85, criticalMin: 0, criticalMax: 95 },
  { type: DeviceType.UPS, count: 75, unit: '%', min: 20, max: 100, criticalMin: 10, criticalMax: 80 },
  { type: DeviceType.COOLING, count: 75, unit: 'L/min', min: 5, max: 120, criticalMin: 2, criticalMax: 130 },
];

export class ApiClient {
  private accessToken: string = '';
  private refreshToken: string = '';
  private devices: RegisteredDevice[] = [];

  async login(): Promise<void> {
    const res = await fetch(`${simConfig.backendUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: simConfig.adminEmail, password: simConfig.adminPassword }),
    });

    if (!res.ok) {
      throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json() as { tokens: AuthTokens };
    this.accessToken = data.tokens.accessToken;
    this.refreshToken = data.tokens.refreshToken;
    logger.info('Authenticated as admin');
  }

  private async refreshAuth(): Promise<void> {
    const res = await fetch(`${simConfig.backendUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!res.ok) {
      logger.error(`Token refresh failed: ${res.status} — re-authenticating`);
      await this.login();
      return;
    }

    const data = await res.json() as { accessToken: string; refreshToken: string };
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    logger.info('Token refreshed');
  }

  async registerDevices(): Promise<RegisteredDevice[]> {
    logger.info(`Registering ${simConfig.activeDevices} devices...`);

    let deviceIndex = 0;
    let rackIndex = 0;
    const allDevices: DeviceInput[] = [];

    for (const plan of DEVICE_PLAN) {
      const count = Math.round((plan.count / 500) * simConfig.activeDevices);
      for (let i = 0; i < count; i++) {
        const rack = RACKS[rackIndex % RACKS.length];
        const floor = FLOORS[deviceIndex % FLOORS.length];
        const position = `U-${(deviceIndex % 42) + 1}`;

        allDevices.push({ plan, rack, floor, position, deviceIndex });
        deviceIndex++;
        if (deviceIndex % 10 === 0) rackIndex++;
      }
    }

    this.devices = [];
    const batchSize = simConfig.deviceBatchConcurrency;

    for (let i = 0; i < allDevices.length; i += batchSize) {
      const batch = allDevices.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((d) => this.createDevice(d))
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          this.devices.push(result.value);
        }
      }

      if ((i + batchSize) % 100 < batchSize) {
        logger.info(`Registered ${this.devices.length}/${simConfig.activeDevices} devices`);
      }
    }

    logger.info(`Registration complete: ${this.devices.length} devices`);
    return this.devices;
  }

  getDevices(): RegisteredDevice[] {
    return this.devices;
  }

  async publishBatch(readings: SimulatedReading[]): Promise<void> {
    const doPublish = async () => {
      const res = await fetch(`${simConfig.backendUrl}/api/v1/readings/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ readings }),
      });
      return res;
    };

    try {
      let res = await doPublish();

      if (res.status === 401) {
        logger.warn('Token expired, refreshing...');
        await this.refreshAuth();
        res = await doPublish();
      }

      if (!res.ok) {
        const text = await res.text();
        logger.error(`Batch publish failed: ${res.status} ${text}`);
      }
    } catch (error) {
      logger.error('Batch publish error', error);
    }
  }

  private async createDevice(input: DeviceInput): Promise<RegisteredDevice> {
    const { plan, rack, floor, position, deviceIndex } = input;
    const name = `${plan.type}-${String(deviceIndex).padStart(4, '0')}`;

    const body = {
      name,
      type: plan.type,
      location: { rack, position, floor },
      thresholds: { min: plan.min, max: plan.max, criticalMin: plan.criticalMin, criticalMax: plan.criticalMax },
      metadata: { manufacturer: 'IoT-Sim', model: `Model-${plan.type}`, firmwareVersion: '1.0.0' },
    };

    const res = await fetch(`${simConfig.backendUrl}/api/v1/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Create device failed: ${res.status} ${await res.text()}`);
    }

    const device = await res.json() as { deviceId: string; type: DeviceType };
    return { id: device.deviceId, type: device.type };
  }
}
