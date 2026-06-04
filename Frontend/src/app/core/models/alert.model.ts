export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

export interface Alert {
  alertId: string;
  deviceId: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  acknowledged: boolean;
  resolvedAt: string | null;
  createdAt: string;
}
