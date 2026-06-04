import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export interface AcknowledgeAlertHandler {
  (alertId: string): Promise<unknown>;
}

export interface SocketHandlers {
  acknowledgeAlert: AcknowledgeAlertHandler;
}

let io: Server;

export function initSocketServer(httpServer: HttpServer, handlers?: SocketHandlers): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);

    socket.on('subscribe:device', (deviceId: string) => {
      socket.join(`device:${deviceId}`);
      logger.debug(`Client ${socket.id} subscribed to device:${deviceId}`);
    });

    socket.on('subscribe:rack', (rackId: string) => {
      socket.join(`rack:${rackId}`);
      logger.debug(`Client ${socket.id} subscribed to rack:${rackId}`);
    });

    socket.on('unsubscribe:device', (deviceId: string) => {
      socket.leave(`device:${deviceId}`);
    });

    socket.on('acknowledge:alert', async (data: { alertId: string; token: string }) => {
      try {
        if (!data.token) {
          socket.emit('acknowledge:alert:error', { message: 'Missing token' });
          return;
        }
        const payload = jwt.verify(data.token, env.jwtSecret) as { sub: string };
        if (!payload?.sub) {
          socket.emit('acknowledge:alert:error', { message: 'Invalid token' });
          return;
        }
        if (!handlers?.acknowledgeAlert) {
          socket.emit('acknowledge:alert:error', { message: 'Handler not available' });
          return;
        }
        const alert = await handlers.acknowledgeAlert(data.alertId);
        socket.emit('acknowledge:alert:done', alert);
      } catch {
        socket.emit('acknowledge:alert:error', { message: 'Failed to acknowledge alert' });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`WebSocket client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

export function emitDeviceReading(deviceId: string, reading: unknown): void {
  getIO().emit('device:reading', { deviceId, reading });
  getIO().emit('dashboard:update', { type: 'reading', deviceId });
}

export function emitDeviceStatus(deviceId: string, status: string): void {
  getIO().emit('device:status', { deviceId, status });
}

export function emitAlertNew(alert: unknown): void {
  const a = alert as { deviceId?: string };
  if (a?.deviceId) {
    getIO().to(`device:${a.deviceId}`).emit('alert:new', alert);
  }
  getIO().emit('alert:new', alert);
}

export function emitAlertResolved(alertId: string): void {
  getIO().emit('alert:resolved', { alertId });
}
