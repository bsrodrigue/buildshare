import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface BackHeaderProps {
  title: string;
  onBack?: () => void;
}

export const BackHeader = ({ title, onBack }: BackHeaderProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={8} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.backBtn} />
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      flex: 1,
      textAlign: 'center',
      color: theme.colors.text,
      fontSize: theme.fontSize.base,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
  });
