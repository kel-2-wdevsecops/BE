import { Router } from 'express';
import { CustomersController } from './customers.controller';

const router = Router();

router.get('/', CustomersController.get); // ?year=&continent=&country=

export default router;
