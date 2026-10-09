import { Router } from 'express';
import { ProductsController } from './products.controller';

const router = Router();

router.get('/', ProductsController.get); // ?productLine=&productLine=&year=&month=

export default router;
