import { Router } from 'express';
import { OfficesController } from './offices.controller';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';

const router = Router();

// Baca: semua akun. Tulis: admin (sama untuk semua modul data).
router.use(authMiddleware);

router.get('/',         OfficesController.index);
router.get('/:code',    OfficesController.show);
router.post('/',        requireRole('admin'), OfficesController.store);
router.put('/:code',    requireRole('admin'), OfficesController.update);
router.delete('/:code', requireRole('admin'), OfficesController.destroy);

export default router;
