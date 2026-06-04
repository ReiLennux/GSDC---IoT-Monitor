export type ReadingQuality = 'good' | 'uncertain' | 'bad';

export interface Reading {
  deviceId: string;
  value: number;
  unit: string;
  quality: ReadingQuality;
  timestamp: string;
}
