import {DeviceType, DeviceStatus} from "../enums"

export interface Location {
    rack: string;
    position: string;
    floor: number;
}

export interface Threshold {
    min?: number;
    max?: number;
    criticalMin?: number;
    criticalMax?: number;
}

export interface Metadata {
    manufacturer: string;
    model: string;
    firmwareVersion: string;
}

export interface Device {
    PK: string;
    SK: string;
    deviceId: string;
    name: string;
    type: DeviceType;
    location: Location;
    status: DeviceStatus;
    metadata: Metadata;
    thresholds: Threshold;
    createdAt: string;
    updatedAt: string;
}
