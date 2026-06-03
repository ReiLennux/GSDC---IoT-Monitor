import { Request, Response, NextFunction } from 'express';
import { AlertService } from '../../application/services/alert.service';

export class AlertController {
  constructor(private alertService: AlertService) {}

  findAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const alerts = await this.alertService.findAll();
      res.json(alerts);
    } catch (err) {
      next(err);
    }
  };

  acknowledge = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await this.alertService.acknowledge(req.params.id as string);
      res.json(alert);
    } catch (err) {
      next(err);
    }
  };

  resolve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await this.alertService.resolve(req.params.id as string);
      res.json(alert);
    } catch (err) {
      next(err);
    }
  };
}
