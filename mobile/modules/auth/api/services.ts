import { http } from '@/libs/api/client';
import { validateModel } from '@/libs/api/validation';

import {
  LoginParams,
  LoginResponse,
  LoginResponseSchema,
  MeResponse,
  MeResponseSchema,
  RegisterParams,
  RegisterResponse,
  RegisterResponseSchema,
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
};
