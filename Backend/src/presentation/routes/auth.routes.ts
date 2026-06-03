import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../../application/services/auth.service';
import { UserDynamoRepository } from '../../infrastructure/database/repositories/user.repository';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimit } from '../middleware/rate-limit.middleware';
import { validateDto } from '../middleware/validate.middleware';
import { RegisterDto, LoginDto, RefreshDto } from '../validators/auth.dto';

const router = Router();

const userRepo = new UserDynamoRepository();
const authService = new AuthService(userRepo);
const controller = new AuthController(authService);

router.post('/register', authRateLimit, validateDto(RegisterDto), controller.register);
router.post('/login', authRateLimit, validateDto(LoginDto), controller.login);
router.post('/refresh', validateDto(RefreshDto), controller.refresh);
router.post('/logout', (_req, res) => res.json({ message: 'Logged out' }));
router.get('/me', authenticate, controller.me);

export default router;
