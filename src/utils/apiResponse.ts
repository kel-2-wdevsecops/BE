import { Response } from 'express';

export interface Meta {
  total:        number;
  per_page:     number;
  current_page: number;
  last_page:    number;
  from:         number | null;
  to:           number | null;
}

export interface ApiPayload<T> {
  success: boolean;
  message: string;
  data:    T | null;
  errors?: unknown;
  meta?:   Meta;
}

function send<T>(
  res:     Response,
  status:  number,
  payload: ApiPayload<T>,
): Response {
  return res.status(status).json(payload);
}

export const ApiResponse = {
  success<T>(res: Response, data: T, message = 'Success', status = 200): Response {
    return send(res, status, { success: true, message, data });
  },

  created<T>(res: Response, data: T, message = 'Data created successfully'): Response {
    return send(res, 201, { success: true, message, data });
  },

  paginated<T>(
    res:     Response,
    data:    T[],
    meta:    Meta,
    message = 'Success',
  ): Response {
    return res.status(200).json({ success: true, message, data, meta });
  },

  noContent(res: Response, message = 'Data deleted successfully'): Response {
    return send(res, 200, { success: true, message, data: null });
  },

  error(res: Response, message: string, status = 400, errors?: unknown): Response {
    return send(res, status, { success: false, message, data: null, errors });
  },

  notFound(res: Response, message = 'Data not found'): Response {
    return send(res, 404, { success: false, message, data: null });
  },

  unauthorized(res: Response, message = 'Unauthenticated'): Response {
    return send(res, 401, { success: false, message, data: null });
  },

  forbidden(res: Response, message = 'Access denied'): Response {
    return send(res, 403, { success: false, message, data: null });
  },

  validationError(res: Response, errors: unknown, message = 'Validation failed'): Response {
    return send(res, 422, { success: false, message, data: null, errors });
  },

  serverError(res: Response, message = 'Internal server error'): Response {
    return send(res, 500, { success: false, message, data: null });
  },
};

/** Bangun pagination meta dari hasil Prisma count */
export function buildMeta(
  total:   number,
  page:    number,
  perPage: number,
): Meta {
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const from     = total === 0 ? null : (page - 1) * perPage + 1;
  const to       = total === 0 ? null : Math.min(page * perPage, total);
  return { total, per_page: perPage, current_page: page, last_page: lastPage, from, to };
}
