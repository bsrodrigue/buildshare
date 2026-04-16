import { Stack } from 'expo-router';

import { createLogger } from '@/libs/log';
import { useAuthStore } from '@/modules/auth/store';

const logger = createLogger('ProtectedRootLayout');

export default function ProtectedRootLayout() {
  logger.debug('Enter Component');
  const { user } = useAuthStore();
  const role = user?.role;

  if (!role) {
    logger.warn(`No role found, returning empty fragment`);
    return <></>;
  }

  logger.debug(`User role: ${role}`);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Protected guard={role === 'admin'}>
        <Stack.Screen name="(admin)" />
      </Stack.Protected>
    </Stack>
  );
}
