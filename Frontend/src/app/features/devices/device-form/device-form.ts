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
  templateUrl: './device-form.html',
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
