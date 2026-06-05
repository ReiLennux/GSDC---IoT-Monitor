export enum DeviceType {
  TEMPERATURE = 'temperature',
  HUMIDITY = 'humidity',
  POWER = 'power',
  UPS = 'ups',
  COOLING = 'cooling',
}

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
  CRITICAL = 'critical',
}

export enum ReadingQuality {
  GOOD = 'good',
  UNCERTAIN = 'uncertain',
  BAD = 'bad',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

export enum AlertType {
  THRESHOLD_EXCEEDED = 'threshold_exceeded',
  DEVICE_OFFLINE = 'device_offline',
  ANOMALY_DETECTED = 'anomaly_detected',
}

export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
  SYSTEM = 'system',
}