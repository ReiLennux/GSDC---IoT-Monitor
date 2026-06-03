import { AlertRepository } from '../../domain/repositories/alert.repository';
import { emitAlertResolved } from '../../infrastructure/websocket/socket';
import { kpiCache } from '../../infrastructure/cache/kpi-cache';

export class AlertService {
  constructor(private alertRepo: AlertRepository) {}

  async findAll() {
    return this.alertRepo.query('ALERT#', { limit: 100, reverse: true });
  }

  async findByDeviceId(deviceId: string) {
    return this.alertRepo.findByDeviceId(deviceId);
  }

  async acknowledge(id: string) {
    const alert = await this.alertRepo.acknowledge(id);
    emitAlertResolved(id);
    kpiCache.del('overview');
    return alert;
  }

  async resolve(id: string) {
    const alert = await this.alertRepo.resolve(id);
    emitAlertResolved(id);
    kpiCache.del('overview');
    return alert;
  }
}
