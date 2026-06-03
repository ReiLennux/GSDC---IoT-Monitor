import { Router } from 'express';
import { AlertController } from '../controllers/alert.controller';
import { AlertService } from '../../application/services/alert.service';
import { AlertDynamoRepository } from '../../infrastructure/database/repositories/alert.repository';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../../domain/enums';

const router = Router();

const alertRepo = new AlertDynamoRepository();
const alertService = new AlertService(alertRepo);
const controller = new AlertController(alertService);

router.get('/', authenticate, controller.findAll);
router.patch('/:id/acknowledge', authenticate, authorize(UserRole.ADMIN, UserRole.OPERATOR), controller.acknowledge);
router.patch('/:id/resolve', authenticate, authorize(UserRole.ADMIN, UserRole.OPERATOR), controller.resolve);

export default router;
