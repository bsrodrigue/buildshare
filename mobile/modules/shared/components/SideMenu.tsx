import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Divider, Drawer, IconButton, Portal, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/modules/auth/store';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

import { ConfirmDialog } from './ConfirmDialog';

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

export const SideMenu: React.FC<SideMenuProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();

  const [logoutVisible, setLogoutVisible] = React.useState(false);

  // Keep rendered if visible or if the closing animation is still running
  const [isAnimatingOut, setIsAnimatingOut] = React.useState(false);

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setIsAnimatingOut(false);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      setIsAnimatingOut(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsAnimatingOut(false);
      });
    }
  }, [visible, slideAnim, opacityAnim]);

  if (!visible && !isAnimatingOut) return null;

  const navigateTo = (path: string) => {
    onClose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void router.push(path as any);
  };

  const handleLogout = () => {
    setLogoutVisible(true);
  };

  const onConfirmLogout = () => {
    setLogoutVisible(false);
    onClose();
    void logout();
  };

  return (
    <Portal>
      <ConfirmDialog
        visible={logoutVisible}
        onDismiss={() => setLogoutVisible(false)}
        onConfirm={onConfirmLogout}
        title={t('common.logout_confirm_title', 'Déconnexion')}
        message={t('common.logout_confirm_message', 'Voulez-vous vraiment vous déconnecter ?')}
        confirmLabel={t('common.logout', 'Déconnexion')}
        cancelLabel={t('common.cancel', 'Annuler')}
        confirmColor={theme.colors.error}
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View
          pointerEvents={visible ? 'auto' : 'none'}
          style={[
            styles.backdrop,
            styles.backdropOverlay,
            {
              opacity: opacityAnim,
            },
          ]}
        >
          <Pressable style={styles.flex} onPress={onClose} />
        </Animated.View>

        <Animated.View
          pointerEvents={visible ? 'auto' : 'none'}
          style={[
            styles.drawer,
            {
              backgroundColor: theme.colors.surface,
              transform: [{ translateX: slideAnim }],
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.userProfile}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text style={[styles.avatarText, { color: theme.colors.onPrimaryContainer }]}>
                  {(user?.first_name[0] || user?.email[0] || 'U').toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text variant="titleMedium" style={styles.userName}>
                  {user?.first_name} {user?.last_name || ''}
                </Text>
                <Text variant="bodySmall" style={styles.userEmail}>
                  {user?.email || ''}
                </Text>
              </View>
            </View>
            <IconButton icon="close" onPress={onClose} />
          </View>

          <Divider style={styles.divider} />

          <Drawer.Section style={styles.section}>
            <Drawer.Item
              label={t('screens.dashboard.title', 'Dashboard')}
              icon="view-dashboard"
              onPress={() => navigateTo('/')}
            />
            <Drawer.Item
              label={t('screens.invitations.title', 'Invitations')}
              icon="email-outline"
              onPress={() => navigateTo('/invitations')}
            />
            <Drawer.Item
              label={t('screens.notifications.title', 'Notifications')}
              icon="bell-outline"
              onPress={() => navigateTo('/notifications')}
            />
            <Drawer.Item
              label={t('screens.activity.title', 'Activité')}
              icon="history"
              onPress={() => navigateTo('/activity')}
            />
          </Drawer.Section>

          <View style={styles.footer}>
            <Divider style={styles.divider} />
            <Drawer.Item
              label={t('common.logout', 'Déconnexion')}
              icon="logout"
              onPress={handleLogout}
              style={styles.logoutItem}
            />
          </View>
        </Animated.View>
      </View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 8,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
  },
  userEmail: {
    opacity: 0.7,
  },
  section: {
    marginTop: 8,
  },
  divider: {
    marginHorizontal: 16,
    marginVertical: 8,
    opacity: 0.5,
  },
  footer: {
    marginTop: 'auto',
    marginBottom: 16,
  },
  logoutItem: {
    borderRadius: 12,
  },
});
