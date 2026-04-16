import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { StaticAvatar } from '@/modules/shared/components/StaticAvatar';
import { getTypography, type Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface SectionHeaderProps {
  title: string;
  avatarUrl?: string;
  avatarFallbackText?: string;
  onMenuPress?: () => void;
}

export const SectionHeader = ({
  title,
  avatarUrl,
  avatarFallbackText,
  onMenuPress,
}: SectionHeaderProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <StaticAvatar
          size={40}
          source={avatarUrl ? { uri: avatarUrl } : undefined}
          fallbackText={avatarFallbackText ?? title}
          style={styles.avatar}
        />
        <Text style={styles.title}>{title}</Text>
      </View>

      <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
        <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.disabled} />
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: Theme) => {
  const typography = getTypography(theme);
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      marginRight: theme.spacing.sm,
      borderWidth: 2,
      borderColor: theme.colors.disabled, // Gray border for section header avatar
    },
    title: {
      ...typography.h3,
      fontSize: theme.fontSize.base,
      fontWeight: 'bold',
      color: theme.colors.text, // Black text for section header
      textTransform: 'uppercase',
    },
    menuButton: {
      padding: 4,
    },
  });
};
