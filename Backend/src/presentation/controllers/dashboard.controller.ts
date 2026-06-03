import { Request, Response, NextFunction } from 'express';
import { DashboardUseCases } from '../../application/usecases';

export class DashboardController {
  constructor(private uc: DashboardUseCases) {}

  getOverview = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const overview = await this.uc.overview();
      res.json(overview);
    } catch (err) { next(err); }
  };

  getRack = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await this.uc.rackSummary({ rackId: req.params.rackId as string });
      res.json(summary);
    } catch (err) { next(err); }
  };

  getTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = Number(req.query.days) || 7;
      const trends = await this.uc.trends({ days });
      res.json(trends);
    } catch (err) { next(err); }
  };
}
