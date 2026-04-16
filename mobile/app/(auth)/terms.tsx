import React from 'react';

import { createLogger } from '@/libs/log';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import TermsScreen from '@/modules/auth/screens/TermsScreen';

const logger = createLogger('TermsRoute');

export default function TermsRoute() {
  logger.debug('Enter Route');

  return (
    <AuthLayout>
      <TermsScreen />
    </AuthLayout>
  );
}
