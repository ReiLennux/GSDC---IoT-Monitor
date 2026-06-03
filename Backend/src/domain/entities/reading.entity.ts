import { ReadingQuality } from "../enums";

export interface Reading {
    PK: string;
    SK: string;
    deviceId: string;
    value: number;
    unit: string;
    quality: ReadingQuality;
    timestamp: string;
    TTL: number;
}