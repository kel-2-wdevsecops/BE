import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { ProductsQuery } from './products.dto';
import { ProductsService } from './products.service';

export const ProductsController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    ApiResponse.cached(res, await ProductsService.get(ProductsQuery.parse(req.query)), 'Product performance');
  }),
};
