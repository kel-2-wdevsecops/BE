import { Router } from 'express';
import { GrowthController } from './growth.controller';

const router = Router();

router.get('/', GrowthController.get); // ?year=

export default router;
