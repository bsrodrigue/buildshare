import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { TokenService } from '@/libs/api/token-service';
import { AppError } from '@/libs/api/types';
import { toast } from '@/libs/notification/toast';
import { authService } from '@/modules/auth/api/services';
import { useAuthStore } from '@/modules/auth/store';

import {
  ChangeEmailParams,
  ChangeEmailVerifyParams,
  ChangePasswordParams,
  DeleteAccountParams,
  ForgotPasswordParams,
  LoginParams,
  LoginResponse,
  RegisterParams,
  ResetPasswordParams,
  VerifyOtpParams,
} from './schemas';

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
    onSuccess: (_data, variables) => {
      toast.success('Compte créé !', 'Vérifiez votre email pour le code de confirmation.');
      router.replace({
        pathname: '/(auth)/verify-otp',
        params: { email: variables.email },
      });
    },
    onError: (error: AppError) => {
      toast.error(
        "Erreur d'inscription",
        error.message || 'Une erreur est survenue lors de la création du compte.',
      );
    },
  });
};

/**
 * Mutation hook for verifying OTP code
 */
export const useVerifyOtp = () => {
  return useMutation<unknown, AppError, VerifyOtpParams>({
    mutationFn: (params: VerifyOtpParams) => authService.verifyOtp(params),
    onSuccess: () => {
      toast.success('Email vérifié !', 'Vous pouvez maintenant vous connecter.');
      router.replace('/(auth)/login');
    },
    onError: (error: AppError) => {
      toast.error('Erreur de vérification', error.message || 'Code invalide.');
    },
  });
};

/**
 * Mutation hook for resending OTP
 */
export const useResendOtp = () => {
  return useMutation<unknown, AppError, { email: string }>({
    mutationFn: (params) => authService.resendOtp(params),
    onSuccess: () => {
      toast.success('Code renvoyé !', 'Vérifiez votre boîte de réception.');
    },
    onError: (error: AppError) => {
      toast.error('Erreur', error.message || 'Impossible de renvoyer le code.');
    },
  });
};

/**
 * Mutation hook for forgot password
 */
export const useForgotPassword = () => {
  return useMutation<unknown, AppError, ForgotPasswordParams>({
    mutationFn: (params: ForgotPasswordParams) => authService.forgotPassword(params),
    onSuccess: () => {
      toast.success('Email envoyé !', 'Vérifiez votre boîte de réception.');
    },
    onError: (error: AppError) => {
      toast.error('Erreur', error.message || 'Impossible de traiter votre demande.');
    },
  });
};

/**
 * Mutation hook for reset password
 */
export const useResetPassword = () => {
  return useMutation<unknown, AppError, ResetPasswordParams>({
    mutationFn: (params: ResetPasswordParams) => authService.resetPassword(params),
    onSuccess: () => {
      toast.success(
        'Mot de passe réinitialisé !',
        'Connectez-vous avec votre nouveau mot de passe.',
      );
      router.replace('/(auth)/login');
    },
    onError: (error: AppError) => {
      toast.error('Erreur', error.message || 'Lien invalide ou expiré.');
    },
  });
};

/**
 * Mutation hook for change password
 */
export const useChangePassword = () => {
  return useMutation<unknown, AppError, ChangePasswordParams>({
    mutationFn: (params: ChangePasswordParams) => authService.changePassword(params),
    onSuccess: () => {
      toast.success('Mot de passe modifié !', 'Votre mot de passe a été mis à jour.');
      router.back();
    },
    onError: (error: AppError) => {
      toast.error('Erreur', error.message || 'Mot de passe actuel incorrect.');
    },
  });
};

/**
 * Mutation hook for change email (initiate)
 */
export const useChangeEmail = () => {
  return useMutation<{ message: string }, AppError, ChangeEmailParams>({
    mutationFn: (params: ChangeEmailParams) => authService.changeEmail(params),
    onSuccess: (_data, variables) => {
      toast.success('Code envoyé !', 'Vérifiez votre nouvelle adresse email.');
      router.push({
        pathname: '/(protected)/settings/change-email-verify',
        params: { newEmail: variables.new_email },
      });
    },
    onError: (error: AppError) => {
      toast.error('Erreur', error.message || "Impossible de changer l'email.");
    },
  });
};

/**
 * Mutation hook for verify change email
 */
export const useVerifyChangeEmail = () => {
  return useMutation<unknown, AppError, ChangeEmailVerifyParams>({
    mutationFn: (params: ChangeEmailVerifyParams) => authService.verifyChangeEmail(params),
    onSuccess: () => {
      toast.success('Email modifié !', 'Votre adresse email a été mise à jour.');
      router.replace('/(protected)');
    },
    onError: (error: AppError) => {
      toast.error('Erreur', error.message || 'Code invalide.');
    },
  });
};

/**
 * Mutation hook for delete account
 */
export const useDeleteAccount = () => {
  const clearUser = useAuthStore((state) => state.clearUser);

  return useMutation<unknown, AppError, DeleteAccountParams>({
    mutationFn: (params: DeleteAccountParams) => authService.deleteAccount(params),
    onSuccess: async () => {
      await TokenService.clearTokens();
      clearUser();
      toast.success('Compte supprimé !', 'Votre compte a été supprimé définitivement.');
      router.replace('/(auth)/login');
    },
    onError: (error: AppError) => {
      toast.error('Erreur', error.message || 'Mot de passe incorrect.');
    },
  });
};
