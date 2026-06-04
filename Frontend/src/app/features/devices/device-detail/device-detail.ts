import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DeviceService } from '../../../core/device';
import { Device } from '../../../core/models/device.model';

@Component({
  selector: 'app-device-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NgxChartsModule, CardModule, PanelModule, ButtonModule, TagModule],
  templateUrl: './device-detail.html',
})
export class DeviceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private deviceService = inject(DeviceService);
  
  device = signal<Device | null>(null);
  loading = signal<boolean>(true);

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.deviceService.getById(id).subscribe(device => {
        this.device.set(device);
        this.loading.set(false);
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
}
