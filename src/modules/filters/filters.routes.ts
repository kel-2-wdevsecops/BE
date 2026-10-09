import { Router } from 'express';
import { FiltersController } from './filters.controller';

const router = Router();

router.get('/', FiltersController.get);

export default router;
