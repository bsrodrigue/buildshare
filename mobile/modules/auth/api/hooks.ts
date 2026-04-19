import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

import { AppError } from '@/libs/api/types';
import { SecureStorage } from '@/libs/secure-storage';
import { SecureStorageKey } from '@/libs/secure-storage/keys';
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
      await SecureStorage.setItem(SecureStorageKey.BEARER_TOKEN, (data as LoginResponse).access);
      await SecureStorage.setItem(SecureStorageKey.REFRESH_TOKEN, (data as LoginResponse).refresh);

      const user = await authService.me();
      setUser(user);

      router.replace('/(protected)');
    },
    onError: (error: AppError) => {
      Toast.show({
        type: 'error',
        text1: 'Erreur de connexion',
        text2: error.message || 'Identifiants incorrects.',
      });
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
      Toast.show({
        type: 'success',
        text1: 'Compte créé !',
        text2: 'Vous pouvez maintenant vous connecter.',
      });
      router.replace('/(auth)/login');
    },
    onError: (error: AppError) => {
      Toast.show({
        type: 'error',
        text1: "Erreur d'inscription",
        text2: error.message || 'Une erreur est survenue lors de la création du compte.',
      });
    },
  });
};
