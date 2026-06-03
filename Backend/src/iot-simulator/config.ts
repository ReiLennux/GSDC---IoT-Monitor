import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const simConfig = {
  mqttMode: (process.env.MQTT_MODE || 'local') as 'local' | 'aws',
  publishIntervalMs: parseInt(process.env.PUBLISH_INTERVAL_MS || '5000', 10),
  activeDevices: parseInt(process.env.ACTIVE_DEVICES || '500', 10),
  anomalyProbability: parseFloat(process.env.ANOMALY_PROBABILITY || '0.05'),
  mqttTopicPrefix: process.env.MQTT_TOPIC_PREFIX || 'dt/devices',
  iotEndpoint: process.env.IOT_ENDPOINT || '',
  certPath: process.env.CERT_PATH || './certs/',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  adminEmail: process.env.SIM_ADMIN_EMAIL || 'admin@iot.local',
  adminPassword: process.env.SIM_ADMIN_PASSWORD || 'Admin123!',
  deviceBatchConcurrency: parseInt(process.env.DEVICE_BATCH_CONCURRENCY || '10', 10),
};
