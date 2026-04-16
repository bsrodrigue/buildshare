import React from 'react';
import { Text, View } from 'react-native';

import { DateTimeService } from '@/libs/datetime';
import { HistoryRow } from '@/modules/shared/components/HistoryRow';

import type { useUserAccount } from '../hooks/useUserAccount';
import type { UserAccountStyles } from '../UserAccountView.styles';

type PaymentHistorySectionProps = {
  payments: ReturnType<typeof useUserAccount>['payments'];
  styles: UserAccountStyles;
};

export const PaymentHistorySection = ({ payments, styles }: PaymentHistorySectionProps) => {
  return (
    <View style={styles.card}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>
          HISTORIQUE I <Text style={styles.highlight}>PAIEMENTS</Text>
        </Text>
      </View>

      {payments && payments.length > 0 ? (
        payments
          .slice(0, 5)
          .map((payment) => (
            <HistoryRow
              key={payment.id}
              label={`${payment.payment_method.toUpperCase()} - ${payment.amount} FCFA`}
              date={DateTimeService.format(new Date(payment.created_at), 'DD-MM-YYYY')}
            />
          ))
      ) : (
        <Text style={styles.bodySmall}>Aucun historique de paiement trouvé.</Text>
      )}
    </View>
  );
};
