import { simConfig } from './config';
import { DeviceSimulator } from './device-simulator';
import { ApiClient } from './api-client';
import { MqttClient } from './mqtt-client';
import { logger } from '../utils/logger';

async function main() {
  logger.info(`IoT Simulator starting — ${simConfig.activeDevices} devices, ${simConfig.publishIntervalMs}ms interval, mode=${simConfig.mqttMode}`);

  const api = new ApiClient();
  const simulator = new DeviceSimulator(simConfig.anomalyProbability);

  let mqtt: MqttClient | null = null;
  if (simConfig.mqttMode === 'aws') {
    mqtt = new MqttClient(simConfig.iotEndpoint, simConfig.certPath);
    await mqtt.connect();
    logger.info(`MQTT client ready — endpoint: ${simConfig.iotEndpoint}`);
  }

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

        if (simConfig.mqttMode === 'aws' && mqtt) {
          const topic = `${simConfig.mqttTopicPrefix}/${device.id}/telemetry`;
          try {
            await mqtt.publish(topic, reading as unknown as Record<string, unknown>);
          } catch (err) {
            logger.error(`MQTT publish failed for ${device.id}`, err);
          }
        } else {
          await api.publishBatch([reading]);
        }
      }, intervalMs);

      timers.push(timer);
    };

    setTimeout(startTimer, initialDelay);
  }

  logger.info(`Started ${simulator.getDevices().length} independent device timers`);

  const cleanup = async () => {
    timers.forEach(clearInterval);
    if (mqtt) await mqtt.disconnect();
    logger.info('Simulator stopped');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((err) => {
  logger.error('Simulator failed', err);
  process.exit(1);
});
