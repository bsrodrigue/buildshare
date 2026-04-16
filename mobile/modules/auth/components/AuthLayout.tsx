import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createLogger } from '@/libs/log';
import { type Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

const logger = createLogger('AuthLayout');

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayoutBase = ({ children }: AuthLayoutProps) => {
  logger.debug('Enter Layout');

  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export const AuthLayout = React.memo(AuthLayoutBase);
AuthLayout.displayName = 'AuthLayout';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    content: {
      flex: 1,
    },
    logoRow: {
      paddingVertical: theme.spacing.md,
      flexDirection: 'row',
      justifyContent: 'flex-start',
    },
  });
