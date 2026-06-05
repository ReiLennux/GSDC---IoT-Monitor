import { Request, Response, NextFunction } from 'express';
import { AlertUseCases } from '../../application/usecases';

export class AlertController {
  constructor(private uc: AlertUseCases) {}

  findAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const cursor = req.query.cursor as string | undefined;
      const result = await this.uc.list({ limit, cursor });
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
