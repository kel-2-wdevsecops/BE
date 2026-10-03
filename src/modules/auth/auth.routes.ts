import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import {
  authLimiter, loginAccountLimiter, refreshLimiter, sensitiveActionLimiter,
} from '../../middleware/rateLimit.middleware';

const router = Router();

// Public. Tidak ada register publik: akun dibuat admin lewat /users, akun
// admin pertama lewat `npm run db:seed`.
router.post('/login',   authLimiter, loginAccountLimiter, AuthController.login);
router.post('/refresh', refreshLimiter, AuthController.refresh);

// Protected
router.get('/me',       authMiddleware, AuthController.me);
router.post('/logout',  authMiddleware, AuthController.logout);
router.put('/password', authMiddleware, sensitiveActionLimiter, AuthController.changePassword);

export default router;
