import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller';
import { DeviceService } from '../../application/services/device.service';
import { ReadingService } from '../../application/services/reading.service';
import { AlertService } from '../../application/services/alert.service';
import { DeviceDynamoRepository } from '../../infrastructure/database/repositories/device.repository';
import { ReadingDynamoRepository } from '../../infrastructure/database/repositories/reading.repository';
import { AlertDynamoRepository } from '../../infrastructure/database/repositories/alert.repository';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateDto } from '../middleware/validate.middleware';
import { CreateDeviceDto, UpdateDeviceDto, UpdateStatusDto } from '../validators/device.dto';
import { UserRole } from '../../domain/enums';

const router = Router();

const deviceRepo = new DeviceDynamoRepository();
const readingRepo = new ReadingDynamoRepository();
const alertRepo = new AlertDynamoRepository();
const deviceService = new DeviceService(deviceRepo);
const readingService = new ReadingService(readingRepo, deviceRepo, alertRepo);
const alertService = new AlertService(alertRepo);
const controller = new DeviceController(deviceService, readingService, alertService);

router.get('/stats/summary', authenticate, controller.getStatsSummary);
router.get('/', authenticate, controller.findAll);
router.get('/:id', authenticate, controller.findById);
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.OPERATOR), validateDto(CreateDeviceDto), controller.create);
router.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.OPERATOR), validateDto(UpdateDeviceDto), controller.update);
router.patch('/:id/status', authenticate, authorize(UserRole.ADMIN, UserRole.OPERATOR), validateDto(UpdateStatusDto), controller.updateStatus);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), controller.delete);
router.get('/:id/readings', authenticate, controller.getReadings);
router.get('/:id/alerts', authenticate, controller.getAlerts);

export default router;
