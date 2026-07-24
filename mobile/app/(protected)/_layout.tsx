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
      <Stack.Screen name="activity" />
      <Stack.Screen name="downloads" />
      <Stack.Screen name="invitations" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="apps/[id]/index" />
      <Stack.Screen name="apps/[id]/edit" />
      <Stack.Screen name="projects/[id]/index" />
      <Stack.Screen name="projects/[id]/members" />
      <Stack.Screen name="projects/create" options={{ presentation: 'modal' }} />
      <Stack.Screen name="projects/[id]/upload" options={{ presentation: 'modal' }} />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/change-password" />
      <Stack.Screen name="settings/change-email" />
      <Stack.Screen name="settings/change-email-verify" />
      <Stack.Screen name="settings/delete-account" />
    </Stack>
  );
}
