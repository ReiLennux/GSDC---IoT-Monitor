import { Component, inject, OnInit, signal, computed, effect, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { DashboardStore } from '../../../state/dashboard.store';
import { ThemeService } from '../../../core/theme.service';
import {
  DashboardService,
  AnalyticsUnitSummary,
  DashboardTrends,
} from '../../../core/dashboard.service';
import { RackMapCardComponent } from '../shared/rack-map-card/rack-map-card';

type RangeKey = '1h' | '24h' | '7d' | '30d' | 'all';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgxChartsModule,
    CardModule,
    ButtonModule,
    SelectButtonModule,
    SkeletonModule,
    RackMapCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class Analytics implements OnInit {
  store = inject(DashboardStore);
  private themeService = inject(ThemeService);
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(true);
  range = signal<RangeKey>('24h');
  analyticsSummary = signal<AnalyticsUnitSummary[]>([]);
  trends = signal<DashboardTrends | null>(null);
  colorScheme = signal<Color>(this.buildColorScheme());
  pieColorScheme = signal<Color>(this.buildPieColorScheme());

  rangeOptions = [
    { label: '1 hora', value: '1h' as RangeKey },
    { label: '24 horas', value: '24h' as RangeKey },
    { label: '7 días', value: '7d' as RangeKey },
    { label: '30 días', value: '30d' as RangeKey },
    { label: 'Todo', value: 'all' as RangeKey },
  ];

  trendBarData = computed(() => {
    const trendData = this.trends()?.trends ?? [];
    if (trendData.length === 0) return [{ name: 'Sin datos', value: 0 }];
    return trendData.map((t) => ({
      name: this.typeLabel(t.type),
      value: Math.round(t.avg * 10) / 10,
    }));
  });

  barChartData = computed(() => {
    const fromStore = this.store.powerByRack();
    if (fromStore.length > 0) return fromStore;
    const tempByRack = this.store.racks().map((r) => ({
      name: `Rack ${r.id}`,
      value: r.devices.filter((d) => d.lastReading).length,
    }));
    return tempByRack.length ? tempByRack : [{ name: 'Sin datos', value: 0 }];
  });

  summaryCards = computed(() => this.analyticsSummary());

  pieChartData = computed(() => {
    const devices = this.store.devices();
    const counts: Record<string, number> = {};
    devices.forEach(d => {
      counts[d.type] = (counts[d.type] || 0) + 1;
    });
    const entries = Object.entries(counts).filter(([, v]) => v > 0);
    if (!entries.length) return [{ name: 'Sin datos', value: 0 }];
    return entries.map(([k, v]) => ({ name: this.typeLabel(k), value: v }));
  });

  constructor() {
    effect(() => {
      this.themeService.isDark();
      this.colorScheme.set(this.buildColorScheme());
      this.pieColorScheme.set(this.buildPieColorScheme());
    });
  }

  ngOnInit() {
    this.loadData();
  }

  onRangeChange(value: RangeKey) {
    this.range.set(value);
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    const hoursMap: Record<RangeKey, number> = { '1h': 1, '24h': 24, '7d': 168, '30d': 720, 'all': 0 };
    const hours = hoursMap[this.range()];
    const daysMap: Record<RangeKey, number> = { '1h': 1, '24h': 1, '7d': 7, '30d': 30, 'all': 365 };
    const days = daysMap[this.range()];

    this.dashboardService.getAnalytics(hours).subscribe({
      next: (data) => {
        this.analyticsSummary.set(data);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });

    this.dashboardService.getTrends(days).subscribe({
      next: (t) => {
        this.trends.set(t);
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck(),
    });
  }

  exportCSV() {
    const rows: string[] = ['type,count,avg,min,max'];
    this.analyticsSummary().forEach((r) => {
      rows.push(`${r.type},${r.count},${r.avg},${r.min},${r.max}`);
    });
    const trends = this.trends();
    if (trends) {
      rows.push('');
      rows.push('type,avg,min,max,sampleCount');
      trends.trends.forEach((t) => {
        rows.push(`${t.type},${t.avg},${t.min},${t.max},${t.sampleCount}`);
      });
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `analytics-${this.range()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      temperature: 'Temperatura',
      humidity: 'Humedad',
      power: 'Power',
      ups: 'UPS',
      cooling: 'Cooling',
    };
    return labels[type] || type;
  }

  private buildColorScheme(): Color {
    return {
      name: 'analyticsScheme',
      selectable: true,
      group: ScaleType.Ordinal,
      domain: this.themeService.isDark() ? ['#FF4081', '#00BCD4', '#7C4DFF'] : ['#5AA454', '#A10A28', '#3B82F6'],
    };
  }

  private buildPieColorScheme(): Color {
    return {
      name: 'pieScheme',
      selectable: true,
      group: ScaleType.Ordinal,
      domain: ['#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6', '#10B981'],
    };
  }
}
