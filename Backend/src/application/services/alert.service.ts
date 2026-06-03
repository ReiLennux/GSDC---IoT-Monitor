import { AlertRepository } from '../../domain/repositories/alert.repository';

export class AlertService {
  constructor(private alertRepo: AlertRepository) {}

  async findAll() {
    return this.alertRepo.query('ALERT#', { limit: 100, reverse: true });
  }

  async findByDeviceId(deviceId: string) {
    return this.alertRepo.findByDeviceId(deviceId);
  }

  async acknowledge(id: string) {
    return this.alertRepo.acknowledge(id);
  }

  async resolve(id: string) {
    return this.alertRepo.resolve(id);
  }
}