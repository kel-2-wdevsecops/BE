import { Router } from 'express';
import { InsightsController } from './insights.controller';

const router = Router();

router.get('/', InsightsController.get);

export default router;
