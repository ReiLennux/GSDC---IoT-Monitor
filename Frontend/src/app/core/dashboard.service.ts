import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Alert } from './models/alert.model';
import { Device } from './models/device.model';

export interface RackSummary {
  rack: string;
  deviceCount: number;
  devices: Device[];
}

type RackSummaryApi = Omit<RackSummary, 'devices'> & {
  devices: (Device & { PK?: string; SK?: string })[];
};

export interface DashboardOverview {
  totalDevices: number;
  onlineDevices: number;
  criticalDevices: number;
  activeAlerts: number;
  recentAlerts: Alert[];
}

export interface AnalyticsUnitSummary {
  type: string;
  count: number;
  avg: number;
  min: number;
  max: number;
}

export interface DashboardTrends {
  period: string;
  from: string;
  to: string;
  trends: {
    type: string;
    avg: number;
    min: number;
    max: number;
    sampleCount: number;
  }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getOverview(): Observable<DashboardOverview> {
    return this.http.get<DashboardOverview>('/api/v1/dashboard/overview');
  }

  getRackSummary(rackId: string): Observable<RackSummary> {
    return this.http
      .get<RackSummaryApi>(`/api/v1/dashboard/rack/${encodeURIComponent(rackId)}`)
      .pipe(
        map((res) => ({
          rack: res.rack,
          deviceCount: res.deviceCount,
          devices: res.devices.map((d) => {
            const { PK, SK, ...device } = d;
            return device as Device;
          }),
        }))
      );
  }

  getTrends(days: number): Observable<DashboardTrends> {
    return this.http.get<DashboardTrends>('/api/v1/dashboard/trends', {
      params: new HttpParams().set('days', String(days)),
    });
  }

  getAnalytics(hours: number): Observable<AnalyticsUnitSummary[]> {
    return this.http.get<AnalyticsUnitSummary[]>('/api/v1/readings/analytics', {
      params: new HttpParams().set('hours', String(hours)),
    });
  }
}
