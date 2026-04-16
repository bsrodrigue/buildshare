import { z } from 'zod';

// =============================================================================
// Atomic Primitives (The Building Blocks)
// =============================================================================

export const IdSchema = z.number();
export const DateTimeSchema = z.string(); // ISO String

export const PaginationSchema = z.object({
  current_page: z.number(),
  last_page: z.number(),
  total: z.number(),
  per_page: z.number(),
});

export const ContactSchema = z.object({
  id: IdSchema,
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string(),
  email: z.email().optional(),
  avatar_url: z.string().nullable().optional(),
});

export const AddressSchema = z.object({
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  city: z.string().optional(),
  zip_code: z.string().optional(),
});

export const LocationContactSchema = AddressSchema.extend({
  contact_name: z.string(),
  contact_phone: z.string().nullable(),
});

export const MediaSchema = z.object({
  uri: z.string(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
});

export const StatusSchema = z.object({
  value: z.string(),
  label: z.string(),
  color: z.string().optional(),
});

// =============================================================================
// Common Inference Types
// =============================================================================

export type Pagination = z.infer<typeof PaginationSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type Address = z.infer<typeof AddressSchema>;
export type Media = z.infer<typeof MediaSchema>;

export type ApiSuccessResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export const ApiErrorResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error_code: z.string().optional(),
  data: z.any().optional(),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export const ValidationErrorResponseSchema = z.object({
  message: z.string(),
  errors: z.record(z.string(), z.array(z.string())),
});

export type ValidationErrorResponse = z.infer<typeof ValidationErrorResponseSchema>;
