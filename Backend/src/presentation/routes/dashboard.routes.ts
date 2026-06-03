import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { DashboardUseCases } from '../../application/usecases';
import { DeviceDynamoRepository } from '../../infrastructure/database/repositories/device.repository';
import { ReadingDynamoRepository } from '../../infrastructure/database/repositories/reading.repository';
import { AlertDynamoRepository } from '../../infrastructure/database/repositories/alert.repository';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

const deviceRepo = new DeviceDynamoRepository();
const readingRepo = new ReadingDynamoRepository();
const alertRepo = new AlertDynamoRepository();

const controller = new DashboardController(new DashboardUseCases(deviceRepo, readingRepo, alertRepo));

/**
 * @openapi
 * /api/v1/dashboard/overview:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get dashboard overview KPIs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalDevices: { type: integer }
 *                 onlineDevices: { type: integer }
 *                 criticalDevices: { type: integer }
 *                 activeAlerts: { type: integer }
 *                 recentAlerts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Alert'
 */
router.get('/overview', authenticate, controller.getOverview);

/**
 * @openapi
 * /api/v1/dashboard/rack/{rackId}:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get rack summary
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rackId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rack summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rack: { type: string }
 *                 deviceCount: { type: integer }
 *                 devices:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Device'
 */
router.get('/rack/:rackId', authenticate, controller.getRack);

/**
 * @openapi
 * /api/v1/dashboard/trends:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get dashboard trends
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *     responses:
 *       200:
 *         description: Trends data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period: { type: string }
 *                 from: { type: string }
 *                 to: { type: string }
 *                 trends:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type: { type: string }
 *                       avg: { type: number }
 *                       min: { type: number }
 *                       max: { type: number }
 *                       sampleCount: { type: integer }
 */
router.get('/trends', authenticate, controller.getTrends);

export default router;
