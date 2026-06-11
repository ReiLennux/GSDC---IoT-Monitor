import { device } from 'aws-iot-device-sdk';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export class MqttClient {
  private client: ReturnType<typeof device> | null = null;
  private connected = false;

  constructor(
    private endpoint: string,
    private certPath: string,
  ) {}

  async connect(): Promise<void> {
    const caPath = path.join(this.certPath, 'AmazonRootCA1.pem');
    const certPath_ = path.join(this.certPath, 'certificate.pem');
    const keyPath = path.join(this.certPath, 'private.key');

    const ca = fs.readFileSync(caPath);
    const cert = fs.readFileSync(certPath_);
    const key = fs.readFileSync(keyPath);

    const clientId = `iot-gateway-${Math.random().toString(36).substring(2, 10)}`;

    this.client = device({
      host: this.endpoint,
      clientId,
      protocol: 'mqtts',
      port: 8883,
      caCert: ca,
      clientCert: cert,
      privateKey: key,
      debug: false,
    });

    return new Promise((resolve, reject) => {
      this.client!.on('connect', () => {
        this.connected = true;
        logger.info(`MQTT connected to ${this.endpoint}`);
        resolve();
      });

      this.client!.on('error', (err: Error) => {
        logger.error('MQTT error', err);
        if (!this.connected) reject(err);
      });

      this.client!.on('close', () => {
        this.connected = false;
        logger.warn('MQTT disconnected');
      });

      this.client!.on('offline', () => {
        this.connected = false;
        logger.warn('MQTT offline');
      });

      setTimeout(() => {
        if (!this.connected) reject(new Error('MQTT connection timeout'));
      }, 15000);
    });
  }

  async publish(topic: string, payload: Record<string, unknown>, qos: 0 | 1 | 2 = 1): Promise<void> {
    if (!this.client || !this.connected) {
      throw new Error('MQTT client not connected');
    }

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, JSON.stringify(payload), { qos }, (err?: Error) => {
        if (err) {
          logger.error(`MQTT publish failed: ${topic}`, err);
          reject(err);
        } else {
          logger.info(`MQTT published to ${topic} (qos=${qos})`);
          resolve();
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.end(true);
      this.client = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
