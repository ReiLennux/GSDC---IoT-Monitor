import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { DeviceService } from '../../../core/device';
import { DashboardStore } from '../../../state/dashboard.store';
import { ThemeService } from '../../../core/theme.service';
import { Device } from '../../../core/models/device.model';
import { Reading } from '../../../core/models/reading.model';

interface ChartDataModel {
  name: string;
  series: { name: string; value: number }[];
}

@Component({
  selector: 'app-device-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NgxChartsModule, CardModule, PanelModule, ButtonModule, TagModule, SkeletonModule],
  templateUrl: './device-detail.html',
})
export class DeviceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private deviceService = inject(DeviceService);
  private store = inject(DashboardStore);
  private themeService = inject(ThemeService);

  deviceId = signal<string>('');
  device = signal<Device | null>(null);
  loading = signal<boolean>(true);

  streamingData = signal<ChartDataModel[]>([{ name: 'Lecturas', series: [] }]);

  historyReadings = signal<Reading[]>([]);
  historyLoading = signal<boolean>(false);
  historyCursor = signal<string | null>(null);

  stats = computed(() => {
    const readings = this.historyReadings();
    const dev = this.device();
    if (!dev) return null;
    const values = readings.map(r => r.value);
    const min = readings.length ? Math.min(...values) : (dev.lastReading?.value ?? null);
    const max = readings.length ? Math.max(...values) : (dev.lastReading?.value ?? null);
    const avg = readings.length
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
      : (dev.lastReading?.value ?? null);
    return {
      current: dev.lastReading?.value ?? null,
      unit: dev.lastReading?.unit ?? readings[0]?.unit ?? '',
      min,
      max,
      avg,
      count: readings.length,
    };
  });

  historyChartData = computed<ChartDataModel[]>(() => {
    const readings = this.historyReadings();
    if (!readings.length) return [{ name: 'Historial', series: [] }];
    return [{
      name: 'Historial',
      series: readings.slice().reverse().map(r => ({
        name: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: r.value,
      })),
    }];
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
      const dev = this.device();
      const label = dev ? `${dev.name} (${dev.lastReading?.unit ?? ''})` : 'Lecturas';
      this.streamingData.set([{ name: label, series: [...series] }]);
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.deviceId.set(id);

    this.deviceService.getById(id).subscribe(device => {
      this.device.set(device);
      this.loading.set(false);
    });

    this.loadHistory();
  }

  loadHistory() {
    if (!this.deviceId()) return;
    this.historyLoading.set(true);
    this.deviceService.getReadings(this.deviceId(), 50).subscribe({
      next: (res) => {
        this.historyReadings.set(res.data);
        this.historyCursor.set(res.nextCursor);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
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
      },
      error: () => this.historyLoading.set(false),
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

  private buildColorScheme(): Color {
    return {
      name: 'dynamicScheme',
      selectable: true,
      group: ScaleType.Ordinal,
      domain: this.themeService.isDark() ? ['#00F2FE', '#4FACFE'] : ['#3B82F6', '#1D4ED8'],
    };
  }
}
