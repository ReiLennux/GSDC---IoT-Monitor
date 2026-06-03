import { Request, Response, NextFunction } from 'express';
import { AlertUseCases } from '../../application/usecases';

export class AlertController {
  constructor(private uc: AlertUseCases) {}

  findAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.uc.list({});
      res.json(result);
    } catch (err) { next(err); }
  };

  acknowledge = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await this.uc.acknowledge({ alertId: req.params.id as string });
      res.json(alert);
    } catch (err) { next(err); }
  };

  resolve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await this.uc.resolve({ alertId: req.params.id as string });
      res.json(alert);
    } catch (err) { next(err); }
  };
}
