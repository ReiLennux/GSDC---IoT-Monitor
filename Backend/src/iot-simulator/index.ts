import { simConfig } from './config';
import { DeviceSimulator } from './device-simulator';
import { ApiClient } from './api-client';
import { logger } from '../utils/logger';

async function main() {
  logger.info(`IoT Simulator starting — ${simConfig.activeDevices} devices, ${simConfig.publishIntervalMs}ms interval`);

  const api = new ApiClient();
  const simulator = new DeviceSimulator(simConfig.anomalyProbability);

  await api.login();

  const devices = await api.registerDevices();
  simulator.setDevices(devices);
  logger.info(`Simulating ${simulator.getDevices().length} registered devices`);

  const timers: ReturnType<typeof setInterval>[] = [];
  const MIN_INTERVAL = 5000;
  const MAX_INTERVAL = 10000;

  for (const device of simulator.getDevices()) {
    const intervalMs = MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL);
    const initialDelay = Math.random() * MAX_INTERVAL;

    const startTimer = () => {
      const timer = setInterval(async () => {
        simulator.simulateStatusChanges();
        const reading = simulator.generateDeviceReading(device.id);
        if (!reading) return;

        if (simConfig.mqttMode === 'local') {
          await api.publishBatch([reading]);
        } else {
          logger.warn('MQTT mode not implemented yet');
        }
      }, intervalMs);

      timers.push(timer);
    };

    setTimeout(startTimer, initialDelay);
  }

  logger.info(`Started ${simulator.getDevices().length} independent device timers`);

  process.on('SIGINT', () => {
    timers.forEach(clearInterval);
    logger.info('Simulator stopped');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    timers.forEach(clearInterval);
    logger.info('Simulator stopped');
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error('Simulator failed', err);
  process.exit(1);
});
