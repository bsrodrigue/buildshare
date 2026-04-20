import { z } from 'zod';

/**
 * Field Error format
 */
export const FieldErrorSchema = z.object({
  message: z.string(),
  code: z.string().nullable().optional(),
});

export type FieldError = z.infer<typeof FieldErrorSchema>;

/**
 * Standard Server Error format
 */
export const ApiErrorSchema = z.object({
  code: z.string(), // Accept any string code from backend
  message: z.string(),
  fields: z.record(z.string(), z.array(FieldErrorSchema)).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * Standard API Response envelope
 */
export interface ApiResponse<T> {
  data: T;
  error?: ApiError;
}

/**
 * Custom Error class for Backend API issues (4xx, 5xx with structured body)
 */
export class BackendApiError extends Error {
  public code: string;
  public fields?: Record<string, FieldError[]>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'BackendApiError';
    this.code = error.code;
    this.fields = error.fields;
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      fields: this.fields,
    };
  }
}

/**
 * Custom Error class for connectivity or timeout issues
 */
export class NetworkError extends Error {
  constructor(message = 'Network request failed. Please check your connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Unified application error type to ensure "owned" error flows
 */
export type AppError = BackendApiError | NetworkError | Error;

/**
 * Standard Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  search?: string;
  pageSize?: number;
}

/**
 * Generic Paginated Response Schema function
 */
export const createPaginatedSchema = <T extends z.ZodType>(itemSchema: T) => {
  return z.object({
    count: z.number(),
    next: z.string().nullable().optional(),
    previous: z.string().nullable().optional(),
    results: z.array(itemSchema),
  });
};

export interface PaginatedResponse<T> {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}
