import { http } from '@/libs/api/client';
import { validateModel } from '@/libs/api/validation';

import {
  ChangeEmailParams,
  ChangeEmailVerifyParams,
  ChangePasswordParams,
  DeleteAccountParams,
  ForgotPasswordParams,
  LoginParams,
  LoginResponse,
  LoginResponseSchema,
  MeResponse,
  MeResponseSchema,
  RefreshParams,
  RefreshResponse,
  RefreshResponseSchema,
  RegisterParams,
  RegisterResponse,
  RegisterResponseSchema,
  ResendOtpParams,
  ResetPasswordParams,
  VerifyOtpParams,
} from './schemas';

export const authService = {
  /**
   * Login with email and password
   */
  login: async (params: LoginParams): Promise<LoginResponse> => {
    const response = await http.post<LoginResponse>('auth/login/', params);
    return validateModel(LoginResponseSchema, response, 'Auth Login');
  },

  /**
   * Create a new account
   */
  register: async (params: RegisterParams): Promise<RegisterResponse> => {
    const response = await http.post<RegisterResponse>('auth/register/', params);
    return validateModel(RegisterResponseSchema, response, 'Auth Register');
  },

  /**
   * Fetch current user profile
   */
  me: async (): Promise<MeResponse> => {
    const response = await http.get<MeResponse>('auth/me/');
    return validateModel(MeResponseSchema, response, 'Fetch Me');
  },

  /**
   * Refresh the access token
   */
  refresh: async (params: RefreshParams): Promise<RefreshResponse> => {
    const response = await http.post<RefreshResponse>('auth/token/refresh/', params);
    return validateModel(RefreshResponseSchema, response, 'Auth Refresh');
  },

  /**
   * Verify email with OTP
   */
  verifyOtp: async (params: VerifyOtpParams): Promise<{ message: string }> => {
    return http.post<{ message: string }>('auth/verify-otp/', params);
  },

  /**
   * Resend verification OTP
   */
  resendOtp: async (params: ResendOtpParams): Promise<{ message: string }> => {
    return http.post<{ message: string }>('auth/resend-otp/', params);
  },

  /**
   * Send forgot password email
   */
  forgotPassword: async (params: ForgotPasswordParams): Promise<{ message: string }> => {
    return http.post<{ message: string }>('auth/forgot-password/', params);
  },

  /**
   * Reset password with token
   */
  resetPassword: async (params: ResetPasswordParams): Promise<{ message: string }> => {
    return http.post<{ message: string }>('auth/reset-password/', params);
  },

  /**
   * Change password (requires current password)
   */
  changePassword: async (params: ChangePasswordParams): Promise<{ message: string }> => {
    return http.post<{ message: string }>('auth/change-password/', params);
  },

  /**
   * Initiate email change (sends OTP to new email)
   */
  changeEmail: async (params: ChangeEmailParams): Promise<{ message: string }> => {
    return http.post<{ message: string }>('auth/change-email/', params);
  },

  /**
   * Verify email change with OTP
   */
  verifyChangeEmail: async (params: ChangeEmailVerifyParams): Promise<{ message: string }> => {
    return http.post<{ message: string }>('auth/verify-change-email/', params);
  },

  /**
   * Delete account (requires password)
   */
  deleteAccount: async (params: DeleteAccountParams): Promise<{ message: string }> => {
    return http.post<{ message: string }>('auth/delete-account/', params);
  },
};
