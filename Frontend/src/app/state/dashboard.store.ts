import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { computed } from '@angular/core';
import { Device, DeviceStatus } from '../core/models/device.model';
import { Alert } from '../core/models/alert.model';

export interface ChartPoint {
  name: string;
  value: number;
}

const MAX_CHART_POINTS = 20;

function getBucketKey(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function updateBucketSeries(series: ChartPoint[], values: number[], bucketKey: string): ChartPoint[] {
  if (!values.length) return series;
  const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  const last = series[series.length - 1];
  if (last && last.name === bucketKey) {
    const updated = [...series];
    updated[updated.length - 1] = { name: bucketKey, value: avg };
    return updated;
  }
  const updated = [...series, { name: bucketKey, value: avg }];
  if (updated.length > MAX_CHART_POINTS) updated.shift();
  return updated;
}

let _tempBucket: { key: string; values: number[]; series: ChartPoint[] } | null = null;
let _humBucket: { key: string; values: number[]; series: ChartPoint[] } | null = null;

export interface DashboardState {
  devices: Device[];
  totalRecords: number;
  alerts: Alert[];
  loading: boolean;
  lastUpdatedAt: string | null;
  chartSeries: Record<string, ChartPoint[]>;
  aggregateSeries: Record<string, ChartPoint[]>;
}

const initialState: DashboardState = {
  devices: [],
  totalRecords: 0,
  alerts: [],
  loading: false,
  lastUpdatedAt: null,
  chartSeries: {},
  aggregateSeries: {},
};

export const DashboardStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ devices, alerts, totalRecords }) => {
    const deviceList = computed(() => devices());
    const total = computed(() => totalRecords() || devices().length);

    return {
      totalDevices: total,
      onlineCount: computed(() => deviceList().filter((d) => d.status === 'online').length),
      offlineCount: computed(() => deviceList().filter((d) => d.status === 'offline').length),
      maintenanceCount: computed(() => deviceList().filter((d) => d.status === 'maintenance').length),
      criticalCount: computed(() => deviceList().filter((d) => d.status === 'critical').length),
      onlinePercent: computed(() => {
        const t = total();
        if (!t) return 0;
        return Math.round((deviceList().filter((d) => d.status === 'online').length / t) * 100);
      }),
      activeAlerts: computed(() => alerts().filter((a) => !a.acknowledged).length),
      recentAlerts: computed(() => alerts().filter((a) => !a.resolvedAt).slice(0, 30)),
      temperatureDevices: computed(() =>
        deviceList().filter((d) => d.type === 'temperature' || d.type === 'cooling')
      ),
      avgTemperature: computed(() => {
        const readings = deviceList()
          .filter((d) => (d.type === 'temperature' || d.type === 'cooling') && d.lastReading)
          .map((d) => d.lastReading!.value);
        if (!readings.length) return null;
        return Math.round((readings.reduce((a, b) => a + b, 0) / readings.length) * 10) / 10;
      }),
      avgHumidity: computed(() => {
        const readings = deviceList()
          .filter((d) => d.type === 'humidity' && d.lastReading)
          .map((d) => d.lastReading!.value);
        if (!readings.length) return null;
        return Math.round((readings.reduce((a, b) => a + b, 0) / readings.length) * 10) / 10;
      }),
      racks: computed(() => {
        const groups: Record<string, Device[]> = {};
        deviceList().forEach((d) => {
          const rackId = d.location?.rack || 'Unknown';
          if (!groups[rackId]) groups[rackId] = [];
          groups[rackId].push(d);
        });
        return Object.entries(groups)
          .map(([id, rackDevices]) => ({ id, devices: rackDevices }))
          .sort((a, b) => a.id.localeCompare(b.id));
      }),
      powerByRack: computed(() => {
        const groups: Record<string, number> = {};
        deviceList()
          .filter((d) => d.type === 'power' && d.lastReading)
          .forEach((d) => {
            const rackId = d.location?.rack || 'Unknown';
            groups[rackId] = (groups[rackId] || 0) + d.lastReading!.value;
          });
        return Object.entries(groups).map(([name, value]) => ({ name: `Rack ${name}`, value }));
      }),
    };
  }),
  withMethods((store) => ({
    setLoading(loading: boolean) {
      patchState(store, { loading });
    },
    setDevices(devices: Device[], totalRecords: number) {
      patchState(store, { devices, totalRecords });
    },
    setAlerts(alerts: Alert[]) {
      patchState(store, { alerts });
    },
    updateAlert(alertId: string, changes: Partial<Alert>) {
      const updated = store.alerts().map((a) =>
        a.alertId === alertId ? { ...a, ...changes } : a
      );
      patchState(store, { alerts: updated });
    },
    updateDeviceReading(deviceId: string, reading: { value: number; unit: string }) {
      const now = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const currentSeries = [...(store.chartSeries()[deviceId] || [])];
      currentSeries.push({ name: now, value: reading.value });
      if (currentSeries.length > MAX_CHART_POINTS) {
        currentSeries.shift();
      }

      const updatedDevices = store.devices().map((d) =>
        d.deviceId === deviceId ? { ...d, lastReading: reading } : d
      );

      const tempReadings = updatedDevices
        .filter((d) => (d.type === 'temperature' || d.type === 'cooling') && d.lastReading)
        .map((d) => d.lastReading!.value);
      const humReadings = updatedDevices
        .filter((d) => d.type === 'humidity' && d.lastReading)
        .map((d) => d.lastReading!.value);

      const bucketKey = getBucketKey(new Date());

      if (!_tempBucket || _tempBucket.key !== bucketKey) {
        _tempBucket = { key: bucketKey, values: [], series: [...(store.aggregateSeries()['temperatureAvg'] || [])] };
      }
      _tempBucket.values.push(...tempReadings);
      _tempBucket.series = updateBucketSeries(_tempBucket.series, _tempBucket.values, bucketKey);

      if (!_humBucket || _humBucket.key !== bucketKey) {
        _humBucket = { key: bucketKey, values: [], series: [...(store.aggregateSeries()['humidityAvg'] || [])] };
      }
      _humBucket.values.push(...humReadings);
      _humBucket.series = updateBucketSeries(_humBucket.series, _humBucket.values, bucketKey);

      patchState(store, {
        devices: updatedDevices,
        lastUpdatedAt: new Date().toISOString(),
        chartSeries: { ...store.chartSeries(), [deviceId]: currentSeries },
        aggregateSeries: { temperatureAvg: _tempBucket.series, humidityAvg: _humBucket.series },
      });
    },
    updateDeviceStatus(deviceId: string, status: DeviceStatus) {
      const updatedDevices = store.devices().map((d) =>
        d.deviceId === deviceId ? { ...d, status } : d
      );
      patchState(store, { devices: updatedDevices });
    },
    addAlert(alert: Alert) {
      patchState(store, { alerts: [alert, ...store.alerts()] });
    },
  }))
);
