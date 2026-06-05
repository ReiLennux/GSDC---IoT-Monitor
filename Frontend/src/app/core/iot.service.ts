import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { retry, timer, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { DashboardStore } from '../state/dashboard.store';
import { Device, DeviceStatus } from './models/device.model';
import { Alert } from './models/alert.model';
import { AlertSoundService } from './alert-sound.service';

@Injectable({ providedIn: 'root' })
export class IoTService {
  private http = inject(HttpClient);
  private store = inject(DashboardStore);
  private alertSound = inject(AlertSoundService);
  socket!: Socket;

  initializeData() {
    this.store.setLoading(true);

    this.http.get<{ data: Device[]; total?: number }>(`${environment.apiUrl}/devices`, {
      params: new HttpParams().set('limit', '500'),
    }).pipe(
      retry({ count: 3, delay: (_, retryCount) => timer(1000 * 2 ** retryCount) }),
      catchError(() => {
        console.warn('IoTService: fallback devices empty');
        return of({ data: [], total: 0 });
      }),
    ).subscribe(devices => {
      this.store.setDevices(devices.data, devices.total ?? devices.data.length);
      this.loadedDevices = true;
      this.tryComplete();
    });

    this.http.get<{ data: Alert[] }>(`${environment.apiUrl}/alerts`, { params: new HttpParams().set('limit', '500') }).pipe(
      retry({ count: 3, delay: (_, retryCount) => timer(1000 * 2 ** retryCount) }),
      catchError(() => {
        console.warn('IoTService: fallback alerts empty');
        return of({ data: [] });
      }),
    ).subscribe(alerts => {
      this.store.setAlerts(alerts.data);
      this.loadedAlerts = true;
      this.tryComplete();
    });

    this.connectWebSocket();
  }

  private loadedDevices = false;
  private loadedAlerts = false;

  private tryComplete() {
    if (this.loadedDevices && this.loadedAlerts) {
      this.store.setLoading(false);
    }
  }

  private connectWebSocket() {
    this.socket = io(environment.socketUrl, {
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

    this.socket.on('alert:resolved', (data: { alertId: string }) => {
      this.store.updateAlert(data.alertId, { resolvedAt: new Date().toISOString(), acknowledged: true });
    });

  }

  disconnect() {
    if (this.socket) this.socket.disconnect();
  }
}
