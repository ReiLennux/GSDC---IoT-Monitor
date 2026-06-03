import { Request, Response, NextFunction } from 'express';
import { ReadingUseCases } from '../../application/usecases';

export class ReadingController {
  constructor(private uc: ReadingUseCases) {}

  findAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { deviceId, limit, cursor } = req.query;
      const readings = await this.uc.findAll({
        deviceId: deviceId as string | undefined,
        limit: Number(limit) || 20,
        cursor: cursor as string,
      });
      res.json(readings);
    } catch (err) { next(err); }
  };

  createBatch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.uc.publishBatch(req.body);
      res.status(201).json({ message: 'Readings stored' });
    } catch (err) { next(err); }
  };

  analytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hours = Number(req.query.hours) || 1;
      const data = await this.uc.analytics({ hours });
      res.json(data);
    } catch (err) { next(err); }
  };
}
