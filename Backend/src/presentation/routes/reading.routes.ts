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

/**
 * @openapi
 * /api/v1/readings:
 *   get:
 *     tags: [Readings]
 *     summary: List readings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *         description: Filter by device
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of readings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reading'
 *                 nextCursor:
 *                   type: string
 *                   nullable: true
 */
router.get('/', authenticate, controller.findAll);

/**
 * @openapi
 * /api/v1/readings/batch:
 *   post:
 *     tags: [Readings]
 *     summary: Submit batch readings (IoT Gateway)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BatchReadingInput'
 *     responses:
 *       201:
 *         description: Readings stored
 */
router.post('/batch', authenticate, validateDto(BatchReadingDto), controller.createBatch);

export default router;
