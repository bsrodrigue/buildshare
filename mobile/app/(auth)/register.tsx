import React from 'react';

import { createLogger } from '@/libs/log';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import RegisterScreen from '@/modules/auth/screens/RegisterScreen';

const logger = createLogger('RegisterRoute');

export default function RegisterRoute() {
  logger.debug('Enter Route');

  return (
    <AuthLayout>
      <RegisterScreen />
    </AuthLayout>
  );
}
