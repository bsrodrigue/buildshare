import { http } from '@/libs/api/client';
import { validateModel } from '@/libs/api/validation';
import { DateTimeService } from '@/libs/datetime';
import type { UploadableAsset } from '@/libs/fs';

import {
  ForgotPasswordParams,
  ForgotPasswordResponse,
  ForgotPasswordResponseSchema,
  LoginParams,
  LoginResponse,
  LoginResponseSchema,
  MeResponse,
  MeResponseSchema,
  RegisterParams,
  RegisterResponse,
  RegisterResponseSchema,
  ResendOTPParams,
  ResendOTPResponse,
  ResendOTPResponseSchema,
  ResetPasswordParams,
  ResetPasswordResponse,
  ResetPasswordResponseSchema,
  VerifyPhoneParams,
  VerifyPhoneResponse,
  VerifyPhoneResponseSchema,
} from './schemas';

const asMultipartFile = (file: UploadableAsset | Blob | File): Blob => file as unknown as Blob;

export const authService = {
  login: async (params: LoginParams): Promise<LoginResponse> => {
    const response = await http.post<LoginResponse>('auth/login', params);
    return validateModel(LoginResponseSchema, response, 'Auth Login');
  },

  register: async (params: RegisterParams): Promise<RegisterResponse> => {
    const formData = new FormData();

    // Common Required Fields
    formData.append('first_name', params.firstName);
    formData.append('last_name', params.lastName);
    formData.append('date_of_birth', DateTimeService.format(params.birthDate));
    formData.append('email', params.email);
    formData.append('phone', params.phoneNumber);
    formData.append('role', params.role);
    formData.append('password', params.password);
    formData.append('password_confirmation', params.passwordConfirmation);

    // Optional Fields
    if (params.promoCode) {
      formData.append('promo_code', params.promoCode);
    }

    // Role-specific fields
    if (params.role === 'seller') {
      if (params.shopName) formData.append('shop_name', params.shopName);
      if (params.businessRegister) {
        formData.append(
          'business_register',
          asMultipartFile(params.businessRegister as UploadableAsset),
        );
      }
    }

    if (params.role === 'delivery_man') {
      if (params.vehicle_type) formData.append('vehicle_type', params.vehicle_type);
      if (params.license_plate) formData.append('license_plate', params.license_plate);
    }

    // Shared Uploads
    if (params.role === 'seller' || params.role === 'delivery_man') {
      if (params.cnibRecto) {
        formData.append('cnib_recto', asMultipartFile(params.cnibRecto as UploadableAsset));
      }
      if (params.cnibVerso) {
        formData.append('cnib_verso', asMultipartFile(params.cnibVerso as UploadableAsset));
      }
    }

    const response = await http.post<RegisterResponse>('auth/register', formData);
    return validateModel(RegisterResponseSchema, response, 'Auth Register');
  },

  verifyPhone: async (params: VerifyPhoneParams): Promise<VerifyPhoneResponse> => {
    const response = await http.post<VerifyPhoneResponse>('auth/verify-phone', params);
    return validateModel(VerifyPhoneResponseSchema, response, 'Verify Phone');
  },

  resendOTP: async (params: ResendOTPParams): Promise<ResendOTPResponse> => {
    const response = await http.post<ResendOTPResponse>('auth/resend-otp', params);
    return validateModel(ResendOTPResponseSchema, response, 'Resend OTP');
  },

  forgotPassword: async (params: ForgotPasswordParams): Promise<ForgotPasswordResponse> => {
    const response = await http.post<ForgotPasswordResponse>('auth/password/forgot', params);
    return validateModel(ForgotPasswordResponseSchema, response, 'Forgot Password');
  },

  resetPassword: async (params: ResetPasswordParams): Promise<ResetPasswordResponse> => {
    const response = await http.post<ResetPasswordResponse>('auth/password/reset', params);
    return validateModel(ResetPasswordResponseSchema, response, 'Reset Password');
  },

  me: async (): Promise<MeResponse> => {
    const response = await http.get<MeResponse>('auth/me');
    return validateModel(MeResponseSchema, response, 'Fetch Me');
  },
};
