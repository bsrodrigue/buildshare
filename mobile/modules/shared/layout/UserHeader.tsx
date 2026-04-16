import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuthStore } from '@/modules/auth/store';
import { useNotificationStore } from '@/modules/notifications/store';
import { StaticAvatar } from '@/modules/shared/components/StaticAvatar';
import type { Theme } from '@/modules/shared/theme';
import { getTypography } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface UserHeaderProps {
  onNotificationPress?: () => void;
  onMenuPress?: () => void;
}

const UserHeader = ({ onNotificationPress, onMenuPress }: UserHeaderProps) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { unreadCount, fetchUnreadCount } = useNotificationStore();

  useEffect(() => {
    fetchUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const username = `${user?.first_name} ${user?.last_name}`;

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <StaticAvatar
          size={40}
          source={user?.avatar_url ? { uri: user.avatar_url } : undefined}
          fallbackText={username}
          style={styles.avatar}
        />
        <Text style={styles.title}>{username}</Text>
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity
          onPress={onNotificationPress || (() => router.push('/notifications' as Href))}
          style={styles.iconButton}
        >
          <Ionicons name="notifications" size={24} color={theme.colors.accent} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
          <Ionicons
            name="ellipsis-vertical"
            size={18}
            color={theme.colorScheme === 'dark' ? '#FFF' : theme.colors.text}
          />
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
      color: theme.colors.text,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      marginLeft: theme.spacing.md,
      padding: 4,
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -4,
      backgroundColor: theme.colors.error,
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    badgeText: {
      color: theme.colors.textOnPrimary,
      fontSize: 10,
      fontWeight: '800',
      lineHeight: 12,
    },
  });
};

export default UserHeader;
