import { Component, inject, OnInit, OnDestroy, signal, computed, effect, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';

import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { DeviceService } from '../../../core/device';
import { IoTService } from '../../../core/iot.service';
import { DashboardStore } from '../../../state/dashboard.store';
import { ThemeService } from '../../../core/theme.service';
import { Device } from '../../../core/models/device.model';
import { Reading } from '../../../core/models/reading.model';
import { Alert } from '../../../core/models/alert.model';

interface ChartDataModel {
  name: string;
  series: { name: string; value: number }[];
}

type GroupBy = 'raw' | 'minute' | 'hour' | 'day' | 'week';

function groupReadings(readings: Reading[], groupBy: GroupBy): ChartDataModel[] {
  if (groupBy === 'raw') {
    return [{
      name: 'Historial',
      series: readings.slice().reverse().map(r => ({
        name: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: r.value,
      })),
    }];
  }

  const groups = new Map<string, { values: number[]; timestamps: string[] }>();

  for (const r of readings) {
    const date = new Date(r.timestamp);
    let key: string;

    switch (groupBy) {
      case 'minute':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        break;
      case 'hour':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
        break;
      case 'day':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        break;
      case 'week': {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
        break;
      }
      default:
        key = r.timestamp;
    }

    if (!groups.has(key)) groups.set(key, { values: [], timestamps: [] });
    groups.get(key)!.values.push(r.value);
    groups.get(key)!.timestamps.push(r.timestamp);
  }

  const entries = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return [
    {
      name: 'Promedio',
      series: entries.map(([name, g]) => ({
        name,
        value: Math.round((g.values.reduce((a, b) => a + b, 0) / g.values.length) * 100) / 100,
      })),
    },
    {
      name: 'Mínimo',
      series: entries.map(([name, g]) => ({
        name,
        value: Math.min(...g.values),
      })),
    },
    {
      name: 'Máximo',
      series: entries.map(([name, g]) => ({
        name,
        value: Math.max(...g.values),
      })),
    },
  ];
}

@Component({
  selector: 'app-device-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NgxChartsModule, CardModule, PanelModule, ButtonModule, TagModule, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './device-detail.html',
  styles: [`.opacity-40 { opacity: 0.4; }`],
})
export class DeviceDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private iotService = inject(IoTService);
  protected deviceService = inject(DeviceService);
  protected store = inject(DashboardStore);
  private themeService = inject(ThemeService);
  private cdr = inject(ChangeDetectorRef);

  deviceId = signal<string>('');
  device = signal<Device | null>(null);
  loading = signal<boolean>(true);
  deviceAlerts = signal<Alert[]>([]);
  alertsLoading = signal<boolean>(false);
  alertsCursor = signal<string | null>(null);
  showResolved = signal<boolean>(false);

  streamingData = signal<ChartDataModel[]>([{ name: 'Lecturas', series: [] }]);

  historyReadings = signal<Reading[]>([]);
  historyLoading = signal<boolean>(false);
  historyCursor = signal<string | null>(null);

  storeDevice = computed(() => this.store.devices().find(d => d.deviceId === this.deviceId()));

  liveReading = computed(() => this.storeDevice()?.lastReading ?? null);

  sortedAlerts = computed(() => {
    const alerts = this.deviceAlerts();
    if (!this.showResolved()) {
      return alerts.filter(a => !a.resolvedAt).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [...alerts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  stats = computed(() => {
    const readings = this.historyReadings();
    const dev = this.device();
    if (!dev) return null;
    const lastReading = this.liveReading();
    const values = readings.map(r => r.value);
    const min = readings.length ? Math.min(...values) : (lastReading?.value ?? null);
    const max = readings.length ? Math.max(...values) : (lastReading?.value ?? null);
    const avg = readings.length
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
      : (lastReading?.value ?? null);
    return {
      current: lastReading?.value ?? null,
      unit: lastReading?.unit ?? readings[0]?.unit ?? '',
      min,
      max,
      avg,
      count: readings.length,
    };
  });

  historyChartData = computed<ChartDataModel[]>(() => {
    const readings = this.historyReadings();
    if (!readings.length) return [{ name: 'Historial', series: [] }];
    return groupReadings(readings, 'raw');
  });

  colorScheme = computed<Color>(() => this.buildColorScheme());

  constructor() {
    effect(() => {
      this.themeService.isDark();
      this.colorScheme();
    });

    effect(() => {
      const id = this.deviceId();
      if (!id) return;
      const series = this.store.chartSeries()[id] || [];
      const live = this.liveReading();
      const unit = live?.unit ?? '';
      this.streamingData.set([{ name: `Lecturas (${unit})`, series: [...series] }]);
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.deviceId.set(id);

    this.iotService.socket.emit('subscribe:device', id);

    this.deviceService.getById(id).subscribe({
      next: (device) => {
        this.device.set(device);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });

    this.loadHistory();
    this.loadAlerts();
  }

  ngOnDestroy() {
    this.iotService.socket.emit('unsubscribe:device', this.deviceId());
  }

  loadAlerts(reset = true) {
    if (!this.deviceId()) return;
    if (reset) this.alertsCursor.set(null);
    this.alertsLoading.set(true);
    this.deviceService.getAlerts(this.deviceId(), 30, reset ? undefined : (this.alertsCursor() ?? undefined)).subscribe({
      next: (res) => {
        if (reset) {
          this.deviceAlerts.set(res.data);
        } else {
          this.deviceAlerts.update(curr => [...curr, ...res.data]);
        }
        this.alertsCursor.set(res.nextCursor);
        this.alertsLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.alertsLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  loadHistory() {
    if (!this.deviceId()) return;
    this.historyLoading.set(true);
    this.deviceService.getReadings(this.deviceId(), 50).subscribe({
      next: (res) => {
        this.historyReadings.set(res.data);
        this.historyCursor.set(res.nextCursor);
        this.historyLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.historyLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  loadMore() {
    const cursor = this.historyCursor();
    if (!cursor || !this.deviceId()) return;
    this.historyLoading.set(true);
    this.deviceService.getReadings(this.deviceId(), 50, cursor).subscribe({
      next: (res) => {
        this.historyReadings.update(curr => [...curr, ...res.data]);
        this.historyCursor.set(res.nextCursor);
        this.historyLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.historyLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  getSeverity(status: string) {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'info';
      case 'maintenance': return 'warn';
      case 'critical': return 'danger';
      default: return 'info';
    }
  }

  getAlertSeverity(severity: string) {
    switch (severity) {
      case 'critical': return 'danger';
      case 'warning': return 'warn';
      default: return 'info';
    }
  }

  acknowledge(id: string) {
    this.http.patch<Alert>(`${environment.apiUrl}/alerts/${id}/acknowledge`, {}).subscribe({
      next: (alert) => {
        this.deviceAlerts.update(alerts => alerts.map(a => a.alertId === alert.alertId ? { ...a, acknowledged: alert.acknowledged } : a));
        this.store.updateAlert(alert.alertId, { acknowledged: alert.acknowledged });
        this.cdr.markForCheck();
      },
    });
  }

  resolve(id: string) {
    this.http.patch<Alert>(`${environment.apiUrl}/alerts/${id}/resolve`, {}).subscribe({
      next: (alert) => {
        this.deviceAlerts.update(alerts => alerts.map(a => a.alertId === alert.alertId ? { ...a, acknowledged: alert.acknowledged, resolvedAt: alert.resolvedAt } : a));
        this.store.updateAlert(alert.alertId, { acknowledged: alert.acknowledged, resolvedAt: alert.resolvedAt });
        this.cdr.markForCheck();
      },
    });
  }

  formatAlertTime(createdAt: string): string {
    return new Date(createdAt).toLocaleString([], {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private buildColorScheme(): Color {
    return {
      name: 'dynamicScheme',
      selectable: true,
      group: ScaleType.Ordinal,
      domain: this.themeService.isDark() ? ['#00F2FE', '#4FACFE'] : ['#3B82F6', '#1D4ED8'],
    };
  }
}
