import { Stack } from 'expo-router';

import { createLogger } from '@/libs/log';
import { useAuthStore } from '@/modules/auth/store';

const logger = createLogger('ProtectedRootLayout');

export default function ProtectedRootLayout() {
  logger.debug('Enter Component');
  const { user } = useAuthStore();

  // Basic check to ensure store is ready
  if (!user) {
    logger.warn(`No user found in store, returning null`);
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="projects/[id]" />
      <Stack.Screen name="projects/create" options={{ presentation: 'modal' }} />
      <Stack.Screen name="apps/create" options={{ presentation: 'modal' }} />
      <Stack.Screen name="apps/[id]/upload" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
