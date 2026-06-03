import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger';

let io: Server;

export function initSocketServer(httpServer: HttpServer): Server {
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
  getIO().to(`device:${deviceId}`).emit('device:reading', { deviceId, reading });
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
