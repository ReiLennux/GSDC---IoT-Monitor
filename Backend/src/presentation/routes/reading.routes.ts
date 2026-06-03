import { Router } from 'express';
import { ReadingController } from '../controllers/reading.controller';
import { ReadingService } from '../../application/services/reading.service';
import { DeviceDynamoRepository } from '../../infrastructure/database/repositories/device.repository';
import { ReadingDynamoRepository } from '../../infrastructure/database/repositories/reading.repository';
import { AlertDynamoRepository } from '../../infrastructure/database/repositories/alert.repository';
import { authenticate } from '../middleware/auth.middleware';
import { validateDto } from '../middleware/validate.middleware';
import { BatchReadingDto } from '../validators/reading.dto';

const router = Router();

const deviceRepo = new DeviceDynamoRepository();
const readingRepo = new ReadingDynamoRepository();
const alertRepo = new AlertDynamoRepository();
const readingService = new ReadingService(readingRepo, deviceRepo, alertRepo);
const controller = new ReadingController(readingService);

router.get('/', authenticate, controller.findAll);
router.post('/batch', validateDto(BatchReadingDto), controller.createBatch);

export default router;
