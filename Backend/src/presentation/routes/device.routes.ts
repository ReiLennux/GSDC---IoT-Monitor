import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller';
import { DeviceUseCases } from '../../application/usecases';
import { CreateDeviceDto, UpdateDeviceDto, UpdateStatusDto } from '../../application/dtos';
import { DeviceDynamoRepository } from '../../infrastructure/database/repositories/device.repository';
import { ReadingDynamoRepository } from '../../infrastructure/database/repositories/reading.repository';
import { AlertDynamoRepository } from '../../infrastructure/database/repositories/alert.repository';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateDto } from '../middleware/validate.middleware';
import { UserRole } from '../../domain/enums';

const router = Router();

const deviceRepo = new DeviceDynamoRepository();
const readingRepo = new ReadingDynamoRepository();
const alertRepo = new AlertDynamoRepository();

const controller = new DeviceController(new DeviceUseCases(deviceRepo, readingRepo, alertRepo));

/**
 * @openapi
 * /api/v1/devices/stats/summary:
 *   get:
 *     tags: [Devices]
 *     summary: Get device statistics summary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Device statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer }
 *                 online: { type: integer }
 *                 offline: { type: integer }
 *                 critical: { type: integer }
 *                 maintenance: { type: integer }
 */
router.get('/stats/summary', authenticate, controller.getStatsSummary);

/**
 * @openapi
 * /api/v1/devices:
 *   get:
 *     tags: [Devices]
 *     summary: List all devices
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Device'
 *                 nextCursor:
 *                   type: string
 *                   nullable: true
 *   post:
 *     tags: [Devices]
 *     summary: Create a new device
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDeviceInput'
 *     responses:
 *       201:
 *         description: Device created
 *       403:
 *         description: Forbidden
 */
router.get('/', authenticate, controller.findAll);
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.OPERATOR), validateDto(CreateDeviceDto), controller.create);

/**
 * @openapi
 * /api/v1/devices/{id}:
 *   get:
 *     tags: [Devices]
 *     summary: Get device by ID
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
 *         description: Device found
 *       404:
 *         description: Device not found
 *   put:
 *     tags: [Devices]
 *     summary: Update device
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDeviceInput'
 *     responses:
 *       200:
 *         description: Device updated
 *   delete:
 *     tags: [Devices]
 *     summary: Delete device
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Device deleted
 *       403:
 *         description: Forbidden
 */
router.get('/:id', authenticate, controller.findById);
router.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.OPERATOR), validateDto(UpdateDeviceDto), controller.update);

/**
 * @openapi
 * /api/v1/devices/{id}/status:
 *   patch:
 *     tags: [Devices]
 *     summary: Update device status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [online, offline, maintenance, critical]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', authenticate, authorize(UserRole.ADMIN, UserRole.OPERATOR), validateDto(UpdateStatusDto), controller.updateStatus);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), controller.delete);

/**
 * @openapi
 * /api/v1/devices/{id}/readings:
 *   get:
 *     tags: [Devices]
 *     summary: Get device readings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Page size
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Pagination cursor
 *     responses:
 *       200:
 *         description: List of readings
 */
router.get('/:id/readings', authenticate, controller.getReadings);

/**
 * @openapi
 * /api/v1/devices/{id}/alerts:
 *   get:
 *     tags: [Devices]
 *     summary: Get device alerts
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
 *         description: List of alerts
 */
router.get('/:id/alerts', authenticate, controller.getAlerts);

export default router;
