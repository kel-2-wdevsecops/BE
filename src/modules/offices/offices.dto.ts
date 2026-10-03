import { z } from 'zod';
import { optStr, str } from '../../utils/validators';

export const CreateOfficeDto = z.object({
  officeCode:   str(10),
  city:         str(50),
  phone:        str(50),
  addressLine1: str(50),
  addressLine2: optStr(50),
  state:        optStr(50),
  country:      str(50),
  postalCode:   str(15),
  territory:    str(10),
});

// Primary key tidak bisa diubah (dirujuk employees).
export const UpdateOfficeDto = CreateOfficeDto.omit({ officeCode: true }).partial();

export type CreateOfficeInput = z.infer<typeof CreateOfficeDto>;
export type UpdateOfficeInput = z.infer<typeof UpdateOfficeDto>;
