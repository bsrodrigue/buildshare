import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { TokenService } from '@/libs/api/token-service';
import { AppError } from '@/libs/api/types';
import { toast } from '@/libs/notification/toast';
import { authService } from '@/modules/auth/api/services';
import { useAuthStore } from '@/modules/auth/store';

import { LoginParams, LoginResponse, RegisterParams } from './schemas';

/**
 * Mutation hook for user login
 */
export const useLogin = () => {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation<unknown, AppError, LoginParams>({
    mutationFn: (params: LoginParams) => authService.login(params),
    onSuccess: async (data: unknown) => {
      await TokenService.setTokens((data as LoginResponse).access, (data as LoginResponse).refresh);

      const user = await authService.me();
      setUser(user);

      router.replace('/(protected)');
    },
    onError: (error: AppError) => {
      toast.error('Erreur de connexion', error.message || 'Identifiants incorrects.');
    },
  });
};

/**
 * Mutation hook for user registration
 */
export const useRegister = () => {
  return useMutation<unknown, AppError, RegisterParams>({
    mutationFn: (params: RegisterParams) => authService.register(params),
    onSuccess: () => {
      toast.success('Compte créé !', 'Vous pouvez maintenant vous connecter.');
      router.replace('/(auth)/login');
    },
    onError: (error: AppError) => {
      toast.error(
        "Erreur d'inscription",
        error.message || 'Une erreur est survenue lors de la création du compte.',
      );
    },
  });
};
