import { AlertRepository } from '../../domain/repositories/alert.repository';
import { emitAlertResolved } from '../../infrastructure/websocket/socket';
import { kpiCache } from '../../infrastructure/cache/kpi-cache';
import { BaseUseCase } from './base.usecase';
import { ListAlertsDto, AcknowledgeAlertDto, ResolveAlertDto } from '../dtos';

export class AlertUseCases extends BaseUseCase {
  constructor(private alertRepo: AlertRepository) { super(); }

  async list(dto: ListAlertsDto) {
    return this.alertRepo.query('ALERT#', { limit: dto.limit ?? 100, reverse: true });
  }

  async acknowledge(dto: AcknowledgeAlertDto) {
    const alert = await this.alertRepo.acknowledge(dto.alertId);
    emitAlertResolved(dto.alertId);
    kpiCache.del('overview');
    return alert;
  }

  async resolve(dto: ResolveAlertDto) {
    const alert = await this.alertRepo.resolve(dto.alertId);
    emitAlertResolved(dto.alertId);
    kpiCache.del('overview');
    return alert;
  }
}
