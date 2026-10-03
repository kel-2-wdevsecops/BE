import { Router } from 'express';
import { UsersController } from './users.controller';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { sensitiveActionLimiter } from '../../middleware/rateLimit.middleware';

const router = Router();

// Kelola akun login API: admin saja.
router.use(authMiddleware, requireRole('admin'));

router.get('/',       UsersController.index);
router.get('/:id',    UsersController.show);
router.post('/',      sensitiveActionLimiter, UsersController.store);
router.put('/:id',    sensitiveActionLimiter, UsersController.update);
router.delete('/:id', sensitiveActionLimiter, UsersController.destroy);

export default router;
