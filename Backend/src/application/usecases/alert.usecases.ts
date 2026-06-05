import { AlertRepository } from '../../domain/repositories/alert.repository';
import { BaseUseCase } from './base.usecase';
import { ListAlertsDto, AcknowledgeAlertDto, ResolveAlertDto } from '../dtos';

export class AlertUseCases extends BaseUseCase {
  constructor(
    private alertRepo: AlertRepository,
    private onAlertResolved: (alertId: string) => void,
    private onOverviewInvalidated: () => void,
  ) { super(); }

  async list(dto: ListAlertsDto) {
    return this.alertRepo.query({ limit: dto.limit ?? 500, cursor: dto.cursor, reverse: true });
  }

  async acknowledge(dto: AcknowledgeAlertDto) {
    const alert = await this.alertRepo.acknowledge(dto.alertId);
    this.onAlertResolved(dto.alertId);
    this.onOverviewInvalidated();
    return alert;
  }

  async resolve(dto: ResolveAlertDto) {
    const alert = await this.alertRepo.resolve(dto.alertId);
    this.onAlertResolved(dto.alertId);
    this.onOverviewInvalidated();
    return alert;
  }
}
