import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { RackHeatmapComponent, RackGroup } from '../rack-heatmap/rack-heatmap';
import { RackSummary } from '../../../../core/dashboard.service';
import { DeviceStatus } from '../../../../core/models/device.model';

export interface RackFilterOption {
  label: string;
  value: string | null;
}

@Component({
  selector: 'app-rack-map-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardModule,
    SelectModule,
    TableModule,
    TagModule,
    ButtonModule,
    SkeletonModule,
    RackHeatmapComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rack-map-card.html',
  styleUrl: './rack-map-card.scss',
})
export class RackMapCardComponent {
  racks = input.required<RackGroup[]>();
  loading = input(false);
  rackSummary = input<RackSummary | null>(null);
  showLegend = input(true);
  showFilter = input(false);
  rackFilterOptions = input<RackFilterOption[]>([]);
  rackFilter = input<string | null>(null);
  rackFilterChange = output<string | null>();

  headerTitle = computed(() =>
    this.rackSummary() ? `Rack ${this.rackSummary()!.rack}` : 'Mapa de estado por rack'
  );

  isDetailView = computed(() => !!this.rackSummary());

  onFilterChange(value: string | null) {
    this.rackFilterChange.emit(value);
  }

  countByStatus(summary: RackSummary, status: DeviceStatus): number {
    return summary.devices.filter((d) => d.status === status).length;
  }

  getSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'secondary';
      case 'maintenance':
        return 'warn';
      case 'critical':
        return 'danger';
      default:
        return 'info';
    }
  }
}
