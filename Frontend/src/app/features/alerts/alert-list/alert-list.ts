import { Component, inject, computed, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DashboardStore } from '../../../state/dashboard.store';
import { HttpClient } from '@angular/common/http';
import { Alert } from '../../../core/models/alert.model';

@Component({
  selector: 'app-alert-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TableModule, TagModule, ButtonModule, SelectButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private cdr = inject(ChangeDetectorRef);

  filterOptions = [
    { label: 'Todas', value: 'all' },
    { label: 'Pendientes', value: 'pending' },
    { label: 'Vistas', value: 'acknowledged' },
    { label: 'Corregidas', value: 'resolved' },
  ];

  filter = signal<'all' | 'pending' | 'acknowledged' | 'resolved'>('all');

  filteredAlerts = computed(() => {
    const f = this.filter();
    const alerts = this.store.alerts();
    switch (f) {
      case 'pending': return alerts.filter(a => !a.acknowledged && !a.resolvedAt);
      case 'acknowledged': return alerts.filter(a => a.acknowledged && !a.resolvedAt);
      case 'resolved': return alerts.filter(a => a.resolvedAt);
      default: return alerts;
    }
  });

  getSeverity(severity: string) {
    switch (severity) {
      case 'critical': return 'danger';
      case 'warning': return 'warn';
      default: return 'info';
    }
  }

  acknowledge(id: string) {
    this.http.patch<Alert>(`/api/v1/alerts/${id}/acknowledge`, {}).subscribe({
      next: (alert) => {
        this.store.updateAlert(alert.alertId, { acknowledged: alert.acknowledged });
        this.cdr.markForCheck();
      },
    });
  }

  resolve(id: string) {
    this.http.patch<Alert>(`/api/v1/alerts/${id}/resolve`, {}).subscribe({
      next: (alert) => {
        this.store.updateAlert(alert.alertId, { acknowledged: alert.acknowledged, resolvedAt: alert.resolvedAt });
        this.cdr.markForCheck();
      },
    });
  }
}
