import {
  Component,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
  ViewChild,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Table, TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DeviceService } from '../../../core/device';
import { Device } from '../../../core/models/device.model';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { HasRoleDirective } from '../../../core/directives/has-role.directive';
import { DeviceFormComponent } from '../device-form/device-form';

@Component({
  selector: 'app-device-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    IconFieldModule,
    InputIconModule,
    ToastModule,
    ConfirmDialogModule,
    SelectModule,
    FormsModule,
    ReactiveFormsModule,
    HasRoleDirective,
    DeviceFormComponent,
  ],
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './device-list.html',
  styleUrl: './device-list.scss',
})
export class DeviceList implements OnInit, OnDestroy {
  @ViewChild('dt') dt!: Table;

  private route = inject(ActivatedRoute);
  private deviceService = inject(DeviceService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  devices = signal<Device[]>([]);
  totalRecords = signal(0);
  loading = signal(false);

  searchControl = new FormControl('');
  private searchSubscription!: Subscription;
  private searchTerm = '';
  private statusFilter: string | null = null;
  typeFilter = signal<string | null>(null);
  private lastLazyEvent: TableLazyLoadEvent = { first: 0, rows: 10 };
  private cursors: (string | null)[] = [];

  deviceDialog = signal(false);
  editingDevice = signal<Device | null>(null);

  statusOptions = [
    { label: 'Online', value: 'online' },
    { label: 'Offline', value: 'offline' },
    { label: 'Maintenance', value: 'maintenance' },
  ];

  ngOnInit() {
    this.statusFilter = this.route.snapshot.queryParamMap.get('status');

    this.searchSubscription = this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.searchTerm = (value ?? '').trim().toLowerCase();
        this.lastLazyEvent = { ...this.lastLazyEvent, first: 0 };
        this.loadDevicesLazy();
      });
  }

  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
  }

  loadDevicesLazy(event?: TableLazyLoadEvent) {
    if (event) {
      this.lastLazyEvent = {
        first: event.first ?? 0,
        rows: event.rows ?? this.lastLazyEvent.rows ?? 10,
        sortField: event.sortField,
        sortOrder: event.sortOrder,
      };
    }

    const e = this.lastLazyEvent;
    const rows = e.rows ?? 10;
    const first = e.first ?? 0;
    const sortField = typeof e.sortField === 'string' ? e.sortField : undefined;
    const sortOrder = e.sortOrder ?? undefined;

    const useClientPaging = this.searchTerm.length > 0 || !!this.statusFilter || !!this.typeFilter();

    this.loading.set(true);

    if (useClientPaging) {
      this.deviceService.getAll(1000, undefined, sortField, sortOrder).subscribe({
        next: (res) => {
          let items = res.data;
          if (this.statusFilter) {
            items = items.filter((d) => d.status === this.statusFilter);
          }
          if (this.typeFilter()) {
            items = items.filter((d) => d.type === this.typeFilter());
          }
          if (this.searchTerm) {
            items = items.filter((d) => this.matchesSearch(d, this.searchTerm));
          }
          this.devices.set(items.slice(first, first + rows));
          this.totalRecords.set(items.length);
          this.loading.set(false);
          this.cdr.markForCheck();
        },
        error: (err) => this.onLoadError(err),
      });
      return;
    }

    const pageIndex = first / rows;
    const cursor = this.cursors[pageIndex] ?? null;
    this.deviceService.getAll(rows, cursor ?? undefined, sortField, sortOrder).subscribe({
      next: (res) => {
        this.devices.set(res.data);
        this.totalRecords.set(res.total ?? res.data.length);
        this.cursors[pageIndex] = cursor;
        this.cursors[pageIndex + 1] = res.nextCursor;
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => this.onLoadError(err),
    });
  }

  private matchesSearch(device: Device, term: string): boolean {
    const haystack = [
      device.name,
      device.deviceId,
      device.type,
      device.location?.rack,
      device.metadata?.model,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  }

  private onLoadError(err: unknown) {
    console.error('Error:', err);
    this.loading.set(false);
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudieron cargar los dispositivos',
    });
    this.cdr.markForCheck();
  }

  private reloadTable() {
    this.loadDevicesLazy(this.lastLazyEvent);
  }

  openNew() {
    this.editingDevice.set(null);
    this.deviceDialog.set(true);
  }

  editDevice(device: Device) {
    this.editingDevice.set(device);
    this.deviceDialog.set(true);
  }

  onSaveDevice(payload: Partial<Device>) {
    if (this.editingDevice()) {
      this.deviceService.update(this.editingDevice()!.deviceId, payload).subscribe({
        next: () => {
          this.reloadTable();
          this.deviceDialog.set(false);
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Dispositivo actualizado' });
        },
        error: () =>
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' }),
      });
    } else {
      this.deviceService.create(payload).subscribe({
        next: () => {
          this.reloadTable();
          this.deviceDialog.set(false);
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Dispositivo creado' });
        },
        error: () =>
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar' }),
      });
    }
  }

  deleteDevice(device: Device) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de que deseas eliminar este dispositivo?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deviceService.delete(device.deviceId).subscribe({
          next: () => {
            this.reloadTable();
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Dispositivo eliminado' });
          },
          error: () =>
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' }),
        });
      },
    });
  }

  onTypeFilterChange(type: string | null) {
    this.typeFilter.set(type);
    this.lastLazyEvent = { ...this.lastLazyEvent, first: 0 };
    this.loadDevicesLazy();
  }

  onStatusChange(device: Device, newStatus: string) {
    if (device.status === newStatus) return;
    this.deviceService.updateStatus(device.deviceId, newStatus).subscribe({
      next: (updated) => {
        this.devices.update(list => list.map(d =>
          d.deviceId === device.deviceId ? { ...d, status: updated.status } : d
        ));
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `${device.name} → ${newStatus}`,
        });
        this.cdr.markForCheck();
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el estado',
        }),
    });
  }

  getSeverity(status: string) {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'info';
      case 'maintenance':
        return 'warn';
      case 'critical':
        return 'danger';
      default:
        return 'info';
    }
  }
}
