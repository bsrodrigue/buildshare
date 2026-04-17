import { Stack } from 'expo-router';

import { createLogger } from '@/libs/log';

const logger = createLogger('AuthLayout');

export default function AuthLayout() {
  logger.debug('Enter Layout');

  return (
    <Stack
      initialRouteName="login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
