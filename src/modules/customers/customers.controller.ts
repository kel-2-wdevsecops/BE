import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { CustomersQuery } from './customers.dto';
import { CustomersService } from './customers.service';

export const CustomersController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    ApiResponse.cached(res, await CustomersService.get(CustomersQuery.parse(req.query)), 'Customers and sales team');
  }),
};
