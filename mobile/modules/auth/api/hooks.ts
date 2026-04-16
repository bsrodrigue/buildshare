import { useCall } from '@/hooks/api';
import { APIError } from '@/libs/http/client';
import { authService } from '@/modules/auth/api/services';
import {
  ForgotPasswordParams,
  ForgotPasswordResponse,
  LoginParams,
  LoginResponse,
  MeResponse,
  RegisterParams,
  RegisterResponse,
  ResendOTPParams,
  ResendOTPResponse,
  ResetPasswordParams,
  ResetPasswordResponse,
  VerifyPhoneParams,
  VerifyPhoneResponse,
} from '@/modules/auth/api/schemas';

// Login
export interface UseLoginParams {
  onSuccess: (response: LoginResponse) => void;
  onError: (error: APIError) => void;
}

export function useLogin({ onSuccess, onError }: UseLoginParams) {
  const { execute, loading } = useCall<LoginResponse, LoginParams>({
    fn: authService.login,
    onSuccess,
    onError,
  });

  return {
    callLogin: execute,
    isLoading: loading,
  };
}

// Register
export interface UseRegisterParams {
  onSuccess: (response: RegisterResponse) => void;
  onError: (error: APIError) => void;
}

export function useRegister({ onSuccess, onError }: UseRegisterParams) {
  const { execute, loading } = useCall<RegisterResponse, RegisterParams>({
    fn: authService.register,
    onSuccess,
    onError,
  });

  return {
    callRegister: execute,
    isLoading: loading,
  };
}

// Resend
export interface UseResendParams {
  onSuccess: (response: ResendOTPResponse) => void;
  onError: (error: APIError) => void;
}

export function useResend({ onSuccess, onError }: UseResendParams) {
  const { execute, loading } = useCall<ResendOTPResponse, ResendOTPParams>({
    fn: authService.resendOTP,
    onSuccess,
    onError,
  });

  return {
    callResend: execute,
    isLoading: loading,
  };
}

// Verify
export interface UseVerifyParams {
  onSuccess: (response: VerifyPhoneResponse) => void;
  onError: (error: APIError) => void;
}

export function useVerify({ onSuccess, onError }: UseVerifyParams) {
  const { execute, loading } = useCall<VerifyPhoneResponse, VerifyPhoneParams>({
    fn: authService.verifyPhone,
    onSuccess,
    onError,
  });

  return {
    callVerify: execute,
    isLoading: loading,
  };
}

// Me
export interface UseMeParams {
  onSuccess?: (response: MeResponse) => void;
  onError?: (error: APIError) => void;
}

export function useMe({ onSuccess, onError }: UseMeParams) {
  const { execute, loading, error } = useCall<MeResponse, void>({
    fn: authService.me,
    onSuccess,
    onError,
    vibrateOnError: false,
  });

  return {
    callMe: execute,
    isLoading: loading,
    error,
  };
}

// Forgot Password
export interface UseForgotPasswordParams {
  onSuccess: (response: ForgotPasswordResponse) => void;
  onError: (error: APIError) => void;
}

export function useForgotPassword({ onSuccess, onError }: UseForgotPasswordParams) {
  const { execute, loading } = useCall<ForgotPasswordResponse, ForgotPasswordParams>({
    fn: authService.forgotPassword,
    onSuccess,
    onError,
  });

  return {
    callForgotPassword: execute,
    isLoading: loading,
  };
}

// Reset Password
export interface UseResetPasswordParams {
  onSuccess: (response: ResetPasswordResponse) => void;
  onError: (error: APIError) => void;
}

export function useResetPassword({ onSuccess, onError }: UseResetPasswordParams) {
  const { execute, loading } = useCall<ResetPasswordResponse, ResetPasswordParams>({
    fn: authService.resetPassword,
    onSuccess,
    onError,
  });

  return {
    callResetPassword: execute,
    isLoading: loading,
  };
}
