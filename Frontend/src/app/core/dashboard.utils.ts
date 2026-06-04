import { AlertSeverity } from './models/alert.model';
import { DeviceStatus } from './models/device.model';

export function getDeviceStatusClass(status: DeviceStatus | string): Record<string, boolean> {
  return {
    'status-online': status === 'online',
    'status-offline': status === 'offline',
    'status-maintenance': status === 'maintenance',
    'status-critical': status === 'critical',
  };
}

export function getAlertSeverityColor(severity: AlertSeverity | string): string {
  switch (severity) {
    case 'critical':
    case 'emergency':
      return 'text-red-500';
    case 'warning':
      return 'text-orange-500';
    default:
      return 'text-blue-500';
  }
}

export function getSeverityTag(
  severity: AlertSeverity | string
): 'success' | 'info' | 'warn' | 'danger' {
  switch (severity) {
    case 'emergency':
    case 'critical':
      return 'danger';
    case 'warning':
      return 'warn';
    case 'info':
      return 'info';
    default:
      return 'success';
  }
}

export const STATUS_LEGEND: { status: DeviceStatus; label: string; class: string }[] = [
  { status: 'online', label: 'Online', class: 'status-online' },
  { status: 'offline', label: 'Offline', class: 'status-offline' },
  { status: 'maintenance', label: 'Mantenimiento', class: 'status-maintenance' },
  { status: 'critical', label: 'Crítico', class: 'status-critical' },
];
