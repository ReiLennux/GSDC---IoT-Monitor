import { DeviceType, ReadingQuality } from "../enums";

export interface Reading {
    deviceId: string;
    type: DeviceType;
    value: number;
    unit: string;
    quality: ReadingQuality;
    timestamp: string;
}