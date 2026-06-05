import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { Device } from '../../../../core/models/device.model';
import { getDeviceStatusClass, STATUS_LEGEND } from '../../../../core/dashboard.utils';

export interface RackGroup {
  id: string;
  devices: Device[];
}

@Component({
  selector: 'app-rack-heatmap',
  standalone: true,
  imports: [CommonModule, RouterLink, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rack-heatmap.html',
  styleUrl: './rack-heatmap.scss',
})
export class RackHeatmapComponent {
  racks = input.required<RackGroup[]>();
  showLegend = input(true);

  readonly statusLegend = STATUS_LEGEND;
  readonly getDeviceStatusClass = getDeviceStatusClass;
}
