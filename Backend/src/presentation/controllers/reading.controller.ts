import { Request, Response, NextFunction } from 'express';
import { ReadingService } from '../../application/services/reading.service';

export class ReadingController {
  constructor(private readingService: ReadingService) {}

  findAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { deviceId, limit, cursor } = req.query;
      if (deviceId) {
        const readings = await this.readingService.findByDeviceId(
          deviceId as string,
          Number(limit) || 20,
          cursor as string,
        );
        return res.json(readings);
      }
      res.json({ data: [], nextCursor: null });
    } catch (err) {
      next(err);
    }
  };

  createBatch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.readingService.createBatch(req.body.readings || []);
      res.status(201).json({ message: 'Readings stored' });
    } catch (err) {
      next(err);
    }
  };

  analytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hours = Number(req.query.hours) || 1;
      const data = await this.readingService.analytics(hours);
      res.json(data);
    } catch (err) {
      next(err);
    }
  };
}
