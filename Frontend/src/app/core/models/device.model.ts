export type DeviceType = 'temperature' | 'humidity' | 'power' | 'ups' | 'cooling';
export type DeviceStatus = 'online' | 'offline' | 'maintenance' | 'critical';

export interface Location {
  rack: string;
  position: number;
  floor: number;
}

export interface Threshold {
  min: number;
  max: number;
  criticalMin: number;
  criticalMax: number;
}

export interface Metadata {
  manufacturer: string;
  model: string;
  firmwareVersion: string;
}

export interface Device {
  deviceId: string;
  name: string;
  type: DeviceType;
  location: Location;
  status: DeviceStatus;
  thresholds: Threshold;
  metadata: Metadata;
  createdAt: string;
  updatedAt: string;
  lastReading?: {
    value: number;
    unit: string;
  }
}
