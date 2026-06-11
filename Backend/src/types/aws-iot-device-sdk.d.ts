declare module 'aws-iot-device-sdk' {
  interface DeviceOptions {
    host: string;
    clientId?: string;
    protocol?: 'mqtts' | 'mqtt';
    port?: number;
    caCert?: Buffer | string;
    clientCert?: Buffer | string;
    privateKey?: Buffer | string;
    debug?: boolean;
  }
  interface PublishOptions {
    qos?: 0 | 1 | 2;
  }
  interface DeviceClient {
    on(event: 'connect', callback: () => void): void;
    on(event: 'error', callback: (err: Error) => void): void;
    on(event: 'close', callback: () => void): void;
    on(event: 'offline', callback: () => void): void;
    publish(topic: string, message: string, options?: PublishOptions, callback?: (err?: Error) => void): void;
    end(force?: boolean): void;
  }
  export function device(options: DeviceOptions): DeviceClient;
}
