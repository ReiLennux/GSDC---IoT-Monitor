import { Request, Response, NextFunction } from 'express';
import { DeviceService } from '../../application/services/device.service';
import { ReadingService } from '../../application/services/reading.service';
import { AlertService } from '../../application/services/alert.service';

export class DeviceController {
  constructor(
    private deviceService: DeviceService,
    private readingService?: ReadingService,
    private alertService?: AlertService,
  ) {}

  findAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.deviceService.findAll();
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const device = await this.deviceService.findById(req.params.id as string);
      res.json(device);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const device = await this.deviceService.create(req.body);
      res.status(201).json(device);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const device = await this.deviceService.update(req.params.id as string, req.body);
      res.json(device);
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const device = await this.deviceService.updateStatus(req.params.id as string, req.body.status);
      res.json(device);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.deviceService.delete(req.params.id as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  getReadings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { limit, cursor } = req.query;
      const readings = await this.readingService!.findByDeviceId(id, Number(limit) || 20, cursor as string);
      res.json(readings);
    } catch (err) {
      next(err);
    }
  };

  getAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alerts = await this.alertService!.findByDeviceId(req.params.id as string);
      res.json(alerts);
    } catch (err) {
      next(err);
    }
  };

  getStatsSummary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.deviceService.getStatsSummary();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  };
}
