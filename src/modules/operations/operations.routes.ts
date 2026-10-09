import { Router } from 'express';
import { OperationsController } from './operations.controller';

const router = Router();

router.get('/', OperationsController.get); // ?year=&status=

export default router;
