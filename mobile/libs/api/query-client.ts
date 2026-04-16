import { QueryClient } from '@tanstack/react-query';

import { createLogger } from '../log';
import { toast } from '../notification/toast';

const logger = createLogger('QueryClient');

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error: Error) => {
        logger.error('Mutation error', error);
        toast.error(error.message || 'Une erreur est survenue');
      },
    },
  },
});
