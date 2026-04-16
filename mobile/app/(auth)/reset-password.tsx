import React from 'react';

import { createLogger } from '@/libs/log';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import ResetPasswordScreen from '@/modules/auth/screens/ResetPasswordScreen';

const logger = createLogger('ResetPasswordRoute');

export default function ResetPasswordRoute() {
  logger.debug('Enter Route');

  return (
    <AuthLayout>
      <ResetPasswordScreen />
    </AuthLayout>
  );
}
