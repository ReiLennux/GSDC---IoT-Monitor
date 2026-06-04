import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { DashboardStore } from '../../../state/dashboard.store';
import { ThemeService } from '../../../core/theme.service';
import { DashboardService, RackSummary } from '../../../core/dashboard.service';
import {
  getAlertSeverityColor,
  getSeverityTag,
} from '../../../core/dashboard.utils';
import { RackMapCardComponent } from '../shared/rack-map-card/rack-map-card';

interface ChartDataModel {
  name: string;
  series: { name: string; value: number }[];
}

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardModule,
    TagModule,
    NgxChartsModule,
    SkeletonModule,
    RackMapCardComponent,
  ],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class Overview {
  readonly store = inject(DashboardStore);
  private themeService = inject(ThemeService);
  private dashboardService = inject(DashboardService);

  readonly getAlertSeverityColor = getAlertSeverityColor;
  readonly getSeverityTag = getSeverityTag;

  rackFilter = signal<string | null>(null);
  rackSummary = signal<RackSummary | null>(null);
  rackLoading = signal(false);
  chartData = signal<ChartDataModel[]>([]);
  colorScheme = signal<Color>(this.buildColorScheme());

  rackFilterOptions = computed(() => [
    { label: 'Todos los racks', value: null as string | null },
    ...this.store.racks().map((r) => ({ label: `Rack ${r.id}`, value: r.id })),
  ]);

  lastUpdatedLabel = computed(() => {
    const ts = this.store.lastUpdatedAt();
    if (!ts) return 'Sin lecturas en vivo aún';
    return `Última actualización: ${new Date(ts).toLocaleString()}`;
  });

  constructor() {
    effect(() => {
      this.themeService.isDark();
      this.colorScheme.set(this.buildColorScheme());
    });

    effect(() => {
      const agg = this.store.aggregateSeries();
      const result: ChartDataModel[] = [];

      const tempSeries = agg['temperatureAvg'];
      if (tempSeries?.length) {
        result.push({ name: 'Temperatura Promedio', series: [...tempSeries] });
      }

      const humSeries = agg['humidityAvg'];
      if (humSeries?.length) {
        result.push({ name: 'Humedad Promedio', series: [...humSeries] });
      }

      this.chartData.set(result.length ? result : []);
    });
  }

  onRackFilterChange(rackId: string | null) {
    this.rackFilter.set(rackId);
    this.rackSummary.set(null);

    if (!rackId) {
      this.rackLoading.set(false);
      return;
    }

    this.rackLoading.set(true);
    this.dashboardService.getRackSummary(rackId).subscribe({
      next: (summary) => {
        this.rackSummary.set(summary);
        this.rackLoading.set(false);
      },
      error: () => {
        this.rackLoading.set(false);
        this.rackSummary.set(null);
      },
    });
  }

  getDeviceName(deviceId: string): string {
    return this.store.devices().find(d => d.deviceId === deviceId)?.name ?? deviceId;
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
      domain: this.themeService.isDark()
        ? ['#00F2FE', '#FF6B6B']
        : ['#3B82F6', '#EF4444'],
    };
  }
}
