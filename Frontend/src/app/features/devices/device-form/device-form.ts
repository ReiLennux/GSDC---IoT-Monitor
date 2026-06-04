import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Device, DeviceType } from '../../../core/models/device.model';

@Component({
  selector: 'app-device-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule, SelectModule],
  template: `
    <p-dialog 
        [(visible)]="visible" 
        [breakpoints]="{ '960px': '75vw', '640px': '90vw' }"
        [style]="{ width: '600px' }" 
        [header]="isEdit ? 'Edit Device' : 'New Device'" 
        [modal]="true" 
        styleClass="p-fluid"
        (onHide)="onHide()">
        
        <ng-template pTemplate="content">
            <form [formGroup]="deviceForm" class="p-fluid">
                <div class="mb-3">
                    <h6 class="text-primary font-bold mb-1 text-sm uppercase">Información Básica</h6>
                    <div class="grid formgrid">
                        <div class="field col-12 md:col-6 mb-2">
                            <label for="name" class="font-semibold text-sm">Nombre</label>
                            <input pInputText id="name" formControlName="name" placeholder="Ej. Temp-01" class="w-full" />
                        </div>
                        <div class="field col-12 md:col-6 mb-2">
                            <label for="type" class="font-semibold text-sm">Tipo de Sensor</label>
                            <p-select id="type" [options]="deviceTypes" formControlName="type" optionLabel="label" optionValue="value" placeholder="Seleccionar" class="w-full"></p-select>
                        </div>
                    </div>
                </div>

                <div class="mb-3">
                    <h6 class="text-primary font-bold mb-1 text-sm uppercase">Ubicación</h6>
                    <div class="grid formgrid">
                        <div class="field col-12 md:col-4 mb-2"><label for="rack" class="font-semibold text-sm">Rack</label><input pInputText id="rack" formControlName="rack" class="w-full" /></div>
                        <div class="field col-12 md:col-4 mb-2"><label for="position" class="font-semibold text-sm">Posición</label><input pInputText id="position" formControlName="position" class="w-full" /></div>
                        <div class="field col-12 md:col-4 mb-2"><label for="floor" class="font-semibold text-sm">Piso</label><input pInputText type="number" id="floor" formControlName="floor" class="w-full" /></div>
                    </div>
                </div>

                <div class="mb-3">
                    <h6 class="text-primary font-bold mb-1 text-sm uppercase">Metadatos</h6>
                    <div class="grid formgrid">
                        <div class="field col-12 md:col-6 mb-2"><label for="manufacturer" class="font-semibold text-sm">Fabricante</label><input pInputText id="manufacturer" formControlName="manufacturer" class="w-full" /></div>
                        <div class="field col-12 md:col-6 mb-2"><label for="model" class="font-semibold text-sm">Modelo</label><input pInputText id="model" formControlName="model" class="w-full" /></div>
                        <div class="field col-12 mb-0"><label for="firmwareVersion" class="font-semibold text-sm">Versión Firmware</label><input pInputText id="firmwareVersion" formControlName="firmwareVersion" class="w-full" /></div>
                    </div>
                </div>
                
                <div class="mb-0">
                    <h6 class="text-primary font-bold mb-1 text-sm uppercase">Umbrales</h6>
                    <div class="grid formgrid">
                        <div class="field col-6 md:col-3 mb-0"><label for="min" class="font-semibold text-sm">Min</label><input pInputText type="number" id="min" formControlName="min" class="w-full" /></div>
                        <div class="field col-6 md:col-3 mb-0"><label for="max" class="font-semibold text-sm">Max</label><input pInputText type="number" id="max" formControlName="max" class="w-full" /></div>
                        <div class="field col-6 md:col-3 mb-0"><label for="criticalMin" class="font-semibold text-sm">Crit Min</label><input pInputText type="number" id="criticalMin" formControlName="criticalMin" class="w-full" /></div>
                        <div class="field col-6 md:col-3 mb-0"><label for="criticalMax" class="font-semibold text-sm">Crit Max</label><input pInputText type="number" id="criticalMax" formControlName="criticalMax" class="w-full" /></div>
                    </div>
                </div>
            </form>
        </ng-template>

        <ng-template pTemplate="footer">
            <div class="flex justify-content-end gap-2">
                <p-button label="Cancelar" icon="pi pi-times" [text]="true" (onClick)="onHide()"></p-button>
                <p-button label="Guardar" icon="pi pi-check" (onClick)="save()" [disabled]="deviceForm.invalid"></p-button>
            </div>
        </ng-template>
    </p-dialog>
  `
})
export class DeviceFormComponent implements OnInit {
  @Input() visible = false;
  @Input() device: Device | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saveDevice = new EventEmitter<Partial<Device>>();

  fb = inject(FormBuilder);
  deviceForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    type: ['', Validators.required],
    rack: ['', Validators.required],
    position: ['', Validators.required],
    floor: [1, [Validators.required, Validators.min(1)]],
    manufacturer: [''],
    model: [''],
    firmwareVersion: [''],
    min: [0],
    max: [100],
    criticalMin: [0],
    criticalMax: [100]
  });

  deviceTypes = [
    { label: 'Temperatura', value: 'temperature' },
    { label: 'Humedad', value: 'humidity' },
    { label: 'Energía', value: 'power' },
    { label: 'UPS', value: 'ups' },
    { label: 'Enfriamiento', value: 'cooling' }
  ];

  get isEdit() { return !!this.device; }

  ngOnInit() {
    this.resetForm();
  }

  ngOnChanges() {
    if (this.device) {
        this.deviceForm.patchValue({
            name: this.device.name,
            type: this.device.type,
            rack: this.device.location?.rack,
            position: this.device.location?.position,
            floor: this.device.location?.floor,
            manufacturer: this.device.metadata?.manufacturer,
            model: this.device.metadata?.model,
            firmwareVersion: this.device.metadata?.firmwareVersion,
            min: this.device.thresholds?.min,
            max: this.device.thresholds?.max,
            criticalMin: this.device.thresholds?.criticalMin,
            criticalMax: this.device.thresholds?.criticalMax
        });
    } else {
        this.resetForm();
    }
  }

  resetForm() {
    this.deviceForm.reset({ floor: 1, min: 0, max: 100, criticalMin: 0, criticalMax: 100 });
  }

  onHide() {
    this.visibleChange.emit(false);
  }

  save() {
    if (this.deviceForm.valid) {
      const payload: Partial<Device> = {
        name: this.deviceForm.value.name as string,
        type: this.deviceForm.value.type as any,
        location: {
            rack: this.deviceForm.value.rack as string,
            position: this.deviceForm.value.position as string,
            floor: this.deviceForm.value.floor as number
        },
        metadata: {
            manufacturer: this.deviceForm.value.manufacturer as string,
            model: this.deviceForm.value.model as string,
            firmwareVersion: this.deviceForm.value.firmwareVersion as string
        },
        thresholds: {
            min: this.deviceForm.value.min as number,
            max: this.deviceForm.value.max as number,
            criticalMin: this.deviceForm.value.criticalMin as number,
            criticalMax: this.deviceForm.value.criticalMax as number
        }
      };
      this.saveDevice.emit(payload);
    }
  }
}
