import { ReadingQuality } from "../enums";

export interface Reading {
    deviceId: string;
    value: number;
    unit: string;
    quality: ReadingQuality;
    timestamp: string;
}