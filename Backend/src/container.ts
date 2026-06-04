import { DeviceDynamoRepository } from './infrastructure/database/repositories/device.repository';
import { ReadingDynamoRepository } from './infrastructure/database/repositories/reading.repository';
import { AlertDynamoRepository } from './infrastructure/database/repositories/alert.repository';
import { UserDynamoRepository } from './infrastructure/database/repositories/user.repository';
import { BcryptHashService } from './infrastructure/security/bcrypt-hash.service';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';
import { env } from './config/env';
import { kpiCache } from './infrastructure/cache/kpi-cache';
import {
  AuthUseCases,
  DeviceUseCases,
  ReadingUseCases,
  AlertUseCases,
  DashboardUseCases,
} from './application/usecases';
import {
  emitAlertNew,
  emitAlertResolved,
  emitDeviceReading,
  emitDeviceStatus,
} from './infrastructure/websocket/socket';

// Repositories
export const deviceRepo = new DeviceDynamoRepository();
export const readingRepo = new ReadingDynamoRepository();
export const alertRepo = new AlertDynamoRepository();
export const userRepo = new UserDynamoRepository();

// Services
export const hashService = new BcryptHashService();
export const accessTokenService = new JwtTokenService(env.jwtSecret);
export const refreshTokenService = new JwtTokenService(env.jwtRefreshSecret);

// Use Cases
export const authUseCases = new AuthUseCases(
  userRepo,
  hashService,
  accessTokenService,
  refreshTokenService
);

export const alertUseCases = new AlertUseCases(
  alertRepo,
  (alertId) => emitAlertResolved(alertId),
  () => kpiCache.del('overview')
);

export const deviceUseCases = new DeviceUseCases(
  deviceRepo,
  readingRepo,
  alertRepo,
  (deviceId, status) => emitDeviceStatus(deviceId, status),
  () => kpiCache.del('overview')
);

export const readingUseCases = new ReadingUseCases(
  readingRepo,
  deviceRepo,
  alertRepo,
  (deviceId, reading) => emitDeviceReading(deviceId, reading),
  (alert) => emitAlertNew(alert),
  (deviceId, status) => emitDeviceStatus(deviceId, status),
);

export const dashboardUseCases = new DashboardUseCases(
  deviceRepo,
  readingRepo,
  alertRepo,
  kpiCache
);
