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

  const interval = setInterval(async () => {
    simulator.simulateStatusChanges();
    const readings = simulator.generateReadings();
    logger.info(`Publishing ${readings.length} readings`);

    if (simConfig.mqttMode === 'local') {
      await api.publishBatch(readings);
    } else {
      logger.warn('MQTT mode not implemented yet');
    }
  }, simConfig.publishIntervalMs);

  process.on('SIGINT', () => {
    clearInterval(interval);
    logger.info('Simulator stopped');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    clearInterval(interval);
    logger.info('Simulator stopped');
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error('Simulator failed', err);
  process.exit(1);
});
