import {DeviceType, DeviceStatus, AlertSeverity} from "../enums"

export interface Location {
    rack: string;
    position: string;
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

export class Device {
    constructor(
        public readonly deviceId: string,
        public name: string,
        public type: DeviceType,
        public location: Location,
        public status: DeviceStatus,
        public thresholds: Threshold,
        public metadata: Metadata,
        public readonly createdAt: string,
        public updatedAt: string,
    ) {}

    public checkThresholds(value: number): AlertSeverity | null {
        const { criticalMax, criticalMin, max, min } = this.thresholds;

        if (value >= criticalMax || value <= criticalMin) {
            return AlertSeverity.CRITICAL;
        }

        if (value >= max || value <= min) {
            return AlertSeverity.WARNING;
        }

        return null;
    }

    public static create(data: Omit<Device, 'checkThresholds'>): Device {
        return new Device(
            data.deviceId,
            data.name,
            data.type,
            data.location,
            data.status,
            data.thresholds,
            data.metadata,
            data.createdAt,
            data.updatedAt
        );
    }
}
