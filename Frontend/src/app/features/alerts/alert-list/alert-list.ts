import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DashboardStore } from '../../../state/dashboard.store';
import { HttpClient } from '@angular/common/http';
import { Alert } from '../../../core/models/alert.model';

@Component({
  selector: 'app-alert-list',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ButtonModule],
  templateUrl: './alert-list.html',
  styles: [`
    .alert-pending { background: var(--surface-200); }
    .alert-acknowledged { background: transparent; }
    .alert-resolved { opacity: 0.4; }
    .alert-resolved td { text-decoration: line-through; }
  `]
})
export class AlertListComponent {
  store = inject(DashboardStore);
  private http = inject(HttpClient);

  getSeverity(severity: string) {
    switch (severity) {
      case 'critical': return 'danger';
      case 'warning': return 'warn';
      default: return 'info';
    }
  }

  acknowledge(id: string) {
    this.http.patch<Alert>(`/api/v1/alerts/${id}/acknowledge`, {}).subscribe({
      next: (alert) => this.store.updateAlert(alert.alertId, { acknowledged: alert.acknowledged }),
    });
  }

  resolve(id: string) {
    this.http.patch<Alert>(`/api/v1/alerts/${id}/resolve`, {}).subscribe({
      next: (alert) => this.store.updateAlert(alert.alertId, { acknowledged: alert.acknowledged, resolvedAt: alert.resolvedAt }),
    });
  }
}
