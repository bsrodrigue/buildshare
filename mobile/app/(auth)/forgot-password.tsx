import React from 'react';

import { createLogger } from '@/libs/log';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import ForgotPasswordScreen from '@/modules/auth/screens/ForgotPasswordScreen';

const logger = createLogger('ForgotPasswordRoute');

export default function ForgotPasswordRoute() {
  logger.debug('Enter Route');

  return (
    <AuthLayout>
      <ForgotPasswordScreen />
    </AuthLayout>
  );
}
