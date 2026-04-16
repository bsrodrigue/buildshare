import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/modules/shared/theme/ThemeProvider';

export const Loading = () => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
