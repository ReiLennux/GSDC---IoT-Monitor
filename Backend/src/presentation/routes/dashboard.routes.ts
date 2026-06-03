import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { DashboardService } from '../../application/services/dashboard.service';
import { DeviceDynamoRepository } from '../../infrastructure/database/repositories/device.repository';
import { ReadingDynamoRepository } from '../../infrastructure/database/repositories/reading.repository';
import { AlertDynamoRepository } from '../../infrastructure/database/repositories/alert.repository';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

const deviceRepo = new DeviceDynamoRepository();
const readingRepo = new ReadingDynamoRepository();
const alertRepo = new AlertDynamoRepository();
const dashboardService = new DashboardService(deviceRepo, readingRepo, alertRepo);
const controller = new DashboardController(dashboardService);

router.get('/overview', authenticate, controller.getOverview);
router.get('/rack/:rackId', authenticate, controller.getRack);
router.get('/trends', authenticate, controller.getTrends);

export default router;
