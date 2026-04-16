import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { StaticAvatar } from '@/modules/shared/components/StaticAvatar';
import { getTypography, type Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface HeaderProps {
  title: string;
  avatarUrl?: string;
  avatarFallbackText?: string;
  onNotificationPress?: () => void;
  onMenuPress?: () => void;
}

export const Header = ({
  title,
  avatarUrl,
  avatarFallbackText,
  onNotificationPress,
  onMenuPress,
}: HeaderProps) => {
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

      <View style={styles.rightSection}>
        <TouchableOpacity onPress={onNotificationPress} style={styles.iconButton}>
          <Ionicons name="notifications" size={24} color={theme.colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
          <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textWhite} />
        </TouchableOpacity>
      </View>
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
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      marginRight: theme.spacing.sm,
      borderWidth: 2,
    },
    title: {
      ...typography.h3,
      fontSize: theme.fontSize.base,
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      marginLeft: theme.spacing.md,
      padding: 4,
    },
  });
};
