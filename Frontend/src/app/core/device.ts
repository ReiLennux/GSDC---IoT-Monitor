import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Device } from './models/device.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/devices';

  getAll(limit: number = 10, cursor?: string, sortField?: string, sortOrder?: number): Observable<{ data: Device[], nextCursor: string | null, total?: number }> {
    let url = `${this.apiUrl}?limit=${limit}`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
    if (sortField) url += `&sortField=${encodeURIComponent(sortField)}`;
    if (sortOrder !== undefined) url += `&sortOrder=${sortOrder}`;
    return this.http.get<{ data: Device[], nextCursor: string | null, total?: number }>(url);
  }

  create(device: Partial<Device>): Observable<Device> {
    return this.http.post<Device>(this.apiUrl, device);
  }

  update(id: string, device: Partial<Device>): Observable<Device> {
    return this.http.put<Device>(`${this.apiUrl}/${id}`, device);
  }

  updateStatus(id: string, status: string): Observable<Device> {
    return this.http.patch<Device>(`${this.apiUrl}/${id}/status`, { status });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getById(id: string): Observable<Device> {
    return this.http.get<Device>(`${this.apiUrl}/${id}`);
  }
}
