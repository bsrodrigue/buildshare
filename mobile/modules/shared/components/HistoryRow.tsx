import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface HistoryRowProps {
  label: string;
  date: string;
}

export const HistoryRow = ({ label, date }: HistoryRowProps) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.labelText} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>{date}</Text>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      height: 40,
      marginBottom: theme.spacing.xs,
      borderRadius: 4,
      overflow: 'hidden',
    },
    labelContainer: {
      flex: 2.5,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
      marginRight: 1,
    },
    labelText: {
      color: theme.colors.text,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    dateContainer: {
      flex: 1,
      backgroundColor:
        theme.colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dateText: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      fontWeight: '500',
    },
  });
