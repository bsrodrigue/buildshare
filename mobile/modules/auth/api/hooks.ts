import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  ForgotPasswordParams,
  LoginParams,
  RegisterParams,
  ResendOTPParams,
  ResetPasswordParams,
  VerifyPhoneParams,
} from './schemas';
import { authService } from './services';

export const useLogin = () => {
  return useMutation({
    mutationFn: (params: LoginParams) => authService.login(params),
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: (params: RegisterParams) => authService.register(params),
  });
};

export const useResendOTP = () => {
  return useMutation({
    mutationFn: (params: ResendOTPParams) => authService.resendOTP(params),
  });
};

export const useVerifyPhone = () => {
  return useMutation({
    mutationFn: (params: VerifyPhoneParams) => authService.verifyPhone(params),
  });
};

export const useMe = () => {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => authService.me(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (params: ForgotPasswordParams) => authService.forgotPassword(params),
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: (params: ResetPasswordParams) => authService.resetPassword(params),
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Logic for logout if needed in service
    },
    onSuccess: () => {
      queryClient.removeQueries(); // Clear ALL queries on logout
    },
  });
};
