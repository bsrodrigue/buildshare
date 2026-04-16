import React from 'react';

import { createLogger } from '@/libs/log';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import LoginScreen from '@/modules/auth/screens/LoginScreen';

const logger = createLogger('LoginRoute');

export default function LoginRoute() {
  logger.debug('Enter Route');

  return (
    <AuthLayout>
      <LoginScreen />
    </AuthLayout>
  );
}
