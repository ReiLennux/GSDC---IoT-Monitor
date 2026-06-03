import { Router } from 'express';
import { AlertController } from '../controllers/alert.controller';
import { AlertUseCases } from '../../application/usecases';
import { AlertDynamoRepository } from '../../infrastructure/database/repositories/alert.repository';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../../domain/enums';

const router = Router();

const controller = new AlertController(new AlertUseCases(new AlertDynamoRepository()));

/**
 * @openapi
 * /api/v1/alerts:
 *   get:
 *     tags: [Alerts]
 *     summary: List all alerts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Alert'
 *                 nextCursor:
 *                   type: string
 *                   nullable: true
 */
router.get('/', authenticate, controller.findAll);

/**
 * @openapi
 * /api/v1/alerts/{id}/acknowledge:
 *   patch:
 *     tags: [Alerts]
 *     summary: Acknowledge an alert
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert acknowledged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Alert'
 *       403:
 *         description: Forbidden
 */
router.patch('/:id/acknowledge', authenticate, authorize(UserRole.ADMIN, UserRole.OPERATOR), controller.acknowledge);

/**
 * @openapi
 * /api/v1/alerts/{id}/resolve:
 *   patch:
 *     tags: [Alerts]
 *     summary: Resolve an alert
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert resolved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Alert'
 *       403:
 *         description: Forbidden
 */
router.patch('/:id/resolve', authenticate, authorize(UserRole.ADMIN, UserRole.OPERATOR), controller.resolve);

export default router;
