import { z } from 'zod';

/**
 * User Model
 */
export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  is_staff: z.boolean().optional(),
  created_at: z.string(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Login
 */
export const LoginParamsSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

export type LoginParams = z.infer<typeof LoginParamsSchema>;

export const LoginResponseSchema = z.object({
  access: z.string(),
  refresh: z.string(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/**
 * Register
 */
export const RegisterParamsSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères'),
  first_name: z.string().min(1, 'Le prénom est requis'),
  last_name: z.string().min(1, 'Le nom est requis'),
});

export type RegisterParams = z.infer<typeof RegisterParamsSchema>;

export const RegisterResponseSchema = UserSchema;

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

/**
 * Me (Current User)
 */
export const MeResponseSchema = UserSchema;

export type MeResponse = z.infer<typeof MeResponseSchema>;
