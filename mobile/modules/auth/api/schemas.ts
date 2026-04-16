import { z } from 'zod';

export const UserRoleSchema = z.enum(['admin', 'user', 'client', 'delivery_man', 'seller']);

export type UserRole = z.infer<typeof UserRoleSchema>;

// ============================================================================
// User
// ============================================================================

export const UserResourceSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string(),
  email: z.email(),
  role: UserRoleSchema,
  avatar_url: z.string().nullable(),
});

export type UserResource = z.infer<typeof UserResourceSchema>;

// ============================================================================
// Login
// ============================================================================

export const LoginParamsSchema = z.object({
  login: z.string().min(1, 'Login requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export const LoginResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: UserResourceSchema,
    token: z.string(),
  }),
});

export type LoginParams = z.infer<typeof LoginParamsSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// ============================================================================
// Register
// ============================================================================

export const RegisterParamsSchema = z
  .object({
    firstName: z.string().min(1, 'Prénom requis'),
    lastName: z.string().min(1, 'Nom requis'),
    email: z.email('Email invalide'),
    phoneNumber: z.string().min(1, 'Téléphone requis'),
    role: z.enum(['client', 'seller', 'delivery_man']),
    password: z.string().min(1, 'Mot de passe requis'),
    passwordConfirmation: z.string().min(1, 'Confirmation requise'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['passwordConfirmation'],
  });

export type RegisterParams = z.infer<typeof RegisterParamsSchema>;

// ============================================================================
// Password Recovery
// ============================================================================

export const ForgotPasswordParamsSchema = z.object({
  login: z.string().min(1, 'Login requis'),
});

export const ResetPasswordParamsSchema = z
  .object({
    login: z.string().min(1, 'Login requis'),
    code: z.string().min(1, 'Code requis'),
    password: z.string().min(1, 'Mot de passe requis'),
    password_confirmation: z.string().min(1, 'Confirmation requise'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['password_confirmation'],
  });

export type ForgotPasswordParams = z.infer<typeof ForgotPasswordParamsSchema>;
export type ResetPasswordParams = z.infer<typeof ResetPasswordParamsSchema>;

// ============================================================================
// Me
// ============================================================================

export const MeResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: UserResourceSchema,
  }),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;
