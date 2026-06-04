import { Component, inject, OnInit, signal, ChangeDetectionStrategy, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DashboardStore } from '../../../state/dashboard.store';
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
    ReactiveFormsModule,
    HasRoleDirective,
    DeviceFormComponent
  ],
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './device-list.html',
  styleUrl: './device-list.scss'
})
export class DeviceList implements OnInit, OnDestroy {
  @ViewChild('dt') dt!: Table;
  readonly store = inject(DashboardStore);
  private deviceService = inject(DeviceService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  searchControl = new FormControl('');
  private searchSubscription!: Subscription;

  deviceDialog = signal(false);
  editingDevice = signal<Device | null>(null);

  ngOnInit() {
      this.searchSubscription = this.searchControl.valueChanges
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe(value => {
            this.dt.filterGlobal(value, 'contains');
        });
  }

  ngOnDestroy() {
      if (this.searchSubscription) {
          this.searchSubscription.unsubscribe();
      }
  }

  loadDevicesLazy(event?: any) {
    const rows = event?.rows || 10;
    this.deviceService.getAll(rows).subscribe({
       next: (res) => {
              this.store.setDevices(res.data, res.total || res.data.length);
        },
        error: (err) => {
            console.error('Error:', err);
            this.messageService.add({severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los dispositivos'});
        }
    });
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
                this.loadDevicesLazy();
                this.deviceDialog.set(false);
                this.messageService.add({severity: 'success', summary: 'Éxito', detail: 'Dispositivo actualizado'});
            },
            error: () => this.messageService.add({severity: 'error', summary: 'Error', detail: 'No se pudo actualizar'})
        });
      } else {
        this.deviceService.create(payload).subscribe({
            next: () => {
                this.loadDevicesLazy();
                this.deviceDialog.set(false);
                this.messageService.add({severity: 'success', summary: 'Éxito', detail: 'Dispositivo creado'});
            },
            error: () => this.messageService.add({severity: 'error', summary: 'Error', detail: 'No se pudo guardar'})
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
                    this.loadDevicesLazy();
                    this.messageService.add({severity: 'success', summary: 'Éxito', detail: 'Dispositivo eliminado'});
                },
                error: () => this.messageService.add({severity: 'error', summary: 'Error', detail: 'No se pudo eliminar'})
            });
        }
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
