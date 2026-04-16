import { StyleSheet, Text, View } from 'react-native';

import { AppConfiguration } from '@/libs/app-config';
import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

export default function EliteLogo() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.header}>
      <Text style={styles.logo}>{AppConfiguration.appName}</Text>
      <View style={styles.logoDot} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.xl,
    },
    logo: {
      fontSize: theme.fontSize.xxl,
      fontWeight: 'bold',
      color: theme.colors.text,
      letterSpacing: -2,
    },
    logoDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.accent,
      marginLeft: -8,
      marginTop: 8,
    },
  });
