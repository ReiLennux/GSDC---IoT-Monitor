import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, retry, timer } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { DashboardStore } from '../state/dashboard.store';
import { Device, DeviceStatus } from './models/device.model';
import { Alert } from './models/alert.model';
import { AlertSoundService } from './alert-sound.service';

@Injectable({ providedIn: 'root' })
export class IoTService {
  private http = inject(HttpClient);
  private store = inject(DashboardStore);
  private alertSound = inject(AlertSoundService);
  private socket!: Socket;

  initializeData() {
    this.store.setLoading(true);

    const devices$ = this.http.get<{ data: Device[]; total?: number }>('/api/v1/devices', {
      params: new HttpParams().set('limit', '500'),
    }).pipe(retry({ count: 10, delay: (_, retryCount) => timer(500 * 2 ** retryCount) }));
    const alerts$ = this.http.get<{ data: Alert[] }>('/api/v1/alerts').pipe(retry({ count: 10, delay: (_, retryCount) => timer(500 * 2 ** retryCount) }));

    forkJoin({ devices: devices$, alerts: alerts$ }).subscribe({
      next: ({ devices, alerts }) => {
        this.store.setDevices(devices.data, devices.total ?? devices.data.length);
        this.store.setAlerts(alerts.data);
        this.store.setLoading(false);
      },
      error: () => this.store.setLoading(false),
    });

    this.connectWebSocket();
  }

  private connectWebSocket() {
    this.socket = io({
      path: '/socket.io',
      transports: ['websocket'],
    });

    this.socket.on('device:reading', (data: { deviceId: string; reading: { value: number; unit: string } }) => {
      this.store.updateDeviceReading(data.deviceId, data.reading);
    });

    this.socket.on('device:status', (data: { deviceId: string; status: DeviceStatus }) => {
      this.store.updateDeviceStatus(data.deviceId, data.status);
    });

    this.socket.on('alert:new', (alert: Alert) => {
      this.store.addAlert(alert);
      if (alert.severity === 'critical' || alert.severity === 'emergency') {
        this.alertSound.play();
      }
    });
  }

  disconnect() {
    if (this.socket) this.socket.disconnect();
  }
}
