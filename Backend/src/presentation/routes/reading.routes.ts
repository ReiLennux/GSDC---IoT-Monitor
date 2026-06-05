import { Router } from 'express';
import { ReadingController } from '../controllers/reading.controller';
import { readingUseCases } from '../../container';
import { BatchReadingsDto } from '../../application/dtos';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateDto } from '../middleware/validate.middleware';
import { UserRole } from '../../domain/enums';

const router = Router();

const controller = new ReadingController(readingUseCases);

/**
 * @openapi
 * /api/v1/readings:
 *   get:
 *     tags: [Readings]
 *     summary: List readings (global or by device)
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
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               readings:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/BatchReadingInput'
 *     responses:
 *       201:
 *         description: Readings stored
 */
router.post('/batch', authenticate, authorize(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SYSTEM), validateDto(BatchReadingsDto), controller.createBatch);

/**
 * @openapi
 * /api/v1/readings/analytics:
 *   get:
 *     tags: [Readings]
 *     summary: Get reading analytics (avg, min, max per unit)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Time range in hours
 *     responses:
 *       200:
 *         description: Analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   unit: { type: string }
 *                   count: { type: integer }
 *                   avg: { type: number }
 *                   min: { type: number }
 *                   max: { type: number }
 */
router.get('/analytics', authenticate, controller.analytics);

export default router;
