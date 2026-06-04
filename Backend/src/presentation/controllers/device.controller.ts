import { Request, Response, NextFunction } from 'express';
import { DeviceUseCases } from '../../application/usecases';

export class DeviceController {
  constructor(private uc: DeviceUseCases) {}

  findAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit, cursor, sortField, sortOrder } = req.query;
      const result = await this.uc.list({
        limit: Number(limit) || 10,
        cursor: cursor as string,
        sortField: sortField as string,
        sortOrder: Number(sortOrder)
      });
      res.json({
          data: result.data,
          nextCursor: result.nextCursor,
          total: result.total || result.data.length
      });
    } catch (err) { next(err); }
  };

  findById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const device = await this.uc.getById({ id: req.params.id as string });
      res.json(device);
    } catch (err) { next(err); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const device = await this.uc.create(req.body);
      res.status(201).json(device);
    } catch (err) { next(err); }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = { ...req.body, id: req.params.id };
      const device = await this.uc.update(dto);
      res.json(device);
    } catch (err) { next(err); }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const device = await this.uc.updateStatus({ id: req.params.id as string, ...req.body });
      res.json(device);
    } catch (err) { next(err); }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.uc.delete({ id: req.params.id as string });
      res.status(204).send();
    } catch (err) { next(err); }
  };

  getReadings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit, cursor } = req.query;
      const readings = await this.uc.getReadings({
        deviceId: req.params.id as string,
        limit: Number(limit) || 20,
        cursor: cursor as string,
      });
      res.json(readings);
    } catch (err) { next(err); }
  };

  getAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alerts = await this.uc.getAlerts({ deviceId: req.params.id as string });
      res.json(alerts);
    } catch (err) { next(err); }
  };

  getStatsSummary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.uc.stats();
      res.json(stats);
    } catch (err) { next(err); }
  };
}
