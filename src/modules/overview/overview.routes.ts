import { Router } from 'express';
import { OverviewController } from './overview.controller';

const router = Router();

router.get('/', OverviewController.get); // ?year=&month=&continent=&country=

export default router;
