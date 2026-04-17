import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

import { authService } from '@/modules/auth/api/services';
import { useAuthStore } from '@/modules/auth/store';
import { SecureStorage } from '@/libs/secure-storage';
import { SecureStorageKey } from '@/libs/secure-storage/keys';
import { LoginParams, RegisterParams } from './schemas';

/**
 * Mutation hook for user login
 */
export const useLogin = () => {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (params: LoginParams) => authService.login(params),
    onSuccess: async (data) => {
      await SecureStorage.setItem(SecureStorageKey.BEARER_TOKEN, data.access);
      await SecureStorage.setItem(SecureStorageKey.REFRESH_TOKEN, data.refresh);

      const user = await authService.me();
      setUser(user);

      Toast.show({
        type: 'success',
        text1: 'Bienvenue !',
        text2: 'Connexion réussie.',
      });

      router.replace('/(protected)');
    },
    onError: (error: any) => {
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
  return useMutation({
    mutationFn: (params: RegisterParams) => authService.register(params),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Compte créé !',
        text2: 'Vous pouvez maintenant vous connecter.',
      });
      router.replace('/(auth)/login');
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: "Erreur d'inscription",
        text2: error.message || 'Une erreur est survenue lors de la création du compte.',
      });
    },
  });
};
