import { Router } from 'express';
import authRoutes from './auth.routes';
import deviceRoutes from './device.routes';
import readingRoutes from './reading.routes';
import alertRoutes from './alert.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/devices', deviceRoutes);
router.use('/readings', readingRoutes);
router.use('/alerts', alertRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
