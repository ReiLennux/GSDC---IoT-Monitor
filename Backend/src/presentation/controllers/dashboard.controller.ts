import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../../application/services/dashboard.service';

export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  getOverview = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const overview = await this.dashboardService.getOverview();
      res.json(overview);
    } catch (err) {
      next(err);
    }
  };

  getRack = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await this.dashboardService.getRackSummary(req.params.rackId as string);
      res.json(summary);
    } catch (err) {
      next(err);
    }
  };

  getTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = Number(req.query.days) || 7;
      const trends = await this.dashboardService.getTrends(days);
      res.json(trends);
    } catch (err) {
      next(err);
    }
  };
}
