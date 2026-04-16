import { z } from 'zod';

import { ContactSchema, DateTimeSchema } from '../../shared/types';

export const UserRoles = [
  'admin',
  'job_publisher',
  'user',
  'client',
  'delivery_man',
  'seller',
  'influencer',
] as const;
export const UserRoleSchema = z.enum(UserRoles);

export type UserRole = z.infer<typeof UserRoleSchema>;

// ============================================================================
// User
// ============================================================================

export const UserResourceSchema = ContactSchema.extend({
  email: z.string(),
  role: UserRoleSchema,
  date_of_birth: z.string().nullable(),
  is_active: z.boolean(),
  phone_verified_at: DateTimeSchema.nullable(),
  created_at: DateTimeSchema,
});

export type UserResource = z.infer<typeof UserResourceSchema>;

// ============================================================================
// Login
// ============================================================================

export const LoginParamsSchema = z.object({
  login: z.string().min(1, 'Login is required'),
  password: z.string().min(1, 'Password is required'),
});

export const LoginResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    user: UserResourceSchema,
    token: z.string(),
    token_type: z.literal('Bearer'),
    expires_in: z.number(),
  }),
});

export type LoginParams = z.infer<typeof LoginParamsSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// ============================================================================
// Register
// ============================================================================

export const RegisterParamsSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    birthDate: z.date(),
    email: z.string().email('Invalid email format'),
    phoneNumber: z.string().min(1, 'Phone number is required'),
    role: z.enum(['client', 'seller', 'delivery_man'] as const),
    password: z.string().min(1, 'Mot de passe requis'),
    passwordConfirmation: z.string().min(1, 'Confirmation du mot de passe requise'),
    promoCode: z.string().max(50).optional().nullable(),
    shopName: z.string().max(255).optional().nullable(),
    cnibRecto: z.unknown().optional().nullable(),
    cnibVerso: z.unknown().optional().nullable(),
    businessRegister: z.unknown().optional().nullable(),
    vehicle_type: z.enum(['moto', 'velo', 'voiture']).optional().nullable(),
    license_plate: z.string().max(20).optional().nullable(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Passwords do not match',
    path: ['passwordConfirmation'],
  });

export const RegisterResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    phone: z.string(),
    expires_in: z.union([z.string(), z.number()]),
  }),
});

export type RegisterParams = z.infer<typeof RegisterParamsSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

// ============================================================================
// Verify Phone
// ============================================================================

export const VerifyPhoneParamsSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  code: z.string().min(1, 'Verification code is required'),
});

export const VerifyPhoneResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    user: UserResourceSchema,
    token: z.string().nullable(),
    token_type: z.literal('Bearer'),
    expires_in: z.number(),
  }),
});

export type VerifyPhoneParams = z.infer<typeof VerifyPhoneParamsSchema>;
export type VerifyPhoneResponse = z.infer<typeof VerifyPhoneResponseSchema>;

// ============================================================================
// Resend OTP
// ============================================================================

export const ResendOTPParamsSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
});

export const ResendOTPResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    phone: z.string(),
    expires_in: z.union([z.string(), z.number()]),
    attempts_remaining: z.union([z.string(), z.number()]),
  }),
});

export type ResendOTPParams = z.infer<typeof ResendOTPParamsSchema>;
export type ResendOTPResponse = z.infer<typeof ResendOTPResponseSchema>;

// ============================================================================
// Forgot Password
// ============================================================================

export const ForgotPasswordParamsSchema = z.object({
  login: z.string().min(1, 'Login is required'),
});

export const ForgotPasswordResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    phone: z.string(),
    expires_in: z.number(),
  }),
});

export type ForgotPasswordParams = z.infer<typeof ForgotPasswordParamsSchema>;
export type ForgotPasswordResponse = z.infer<typeof ForgotPasswordResponseSchema>;

// ============================================================================
// Reset Password
// ============================================================================

export const ResetPasswordParamsSchema = z
  .object({
    login: z.string().min(1, 'Login is required'),
    code: z.string().min(1, 'Code is required'),
    password: z.string().min(1, 'Password is required'),
    password_confirmation: z.string().min(1, 'Confirmation is required'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  });

export const ResetPasswordResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type ResetPasswordParams = z.infer<typeof ResetPasswordParamsSchema>;
export type ResetPasswordResponse = z.infer<typeof ResetPasswordResponseSchema>;

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
