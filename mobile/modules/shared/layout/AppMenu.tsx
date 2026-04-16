import { type Href, useRouter } from 'expo-router';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';

import { ROUTES } from '@/constants/routes';
import { SecureStorage } from '@/libs/secure-storage';
import { SecureStorageKey } from '@/libs/secure-storage/keys';
import { useAuthStore } from '@/modules/auth/store';
import { ConfirmationModal } from '@/modules/shared/components/ConfirmationModal';
import { BottomSheetMenu } from '@/modules/shared/views/BottomSheetMenu';

export interface AppMenuRef {
  open: () => void;
  close: () => void;
}

export const AppMenu = forwardRef<AppMenuRef>((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const role = user?.role;
  const router = useRouter();

  useImperativeHandle(ref, () => ({
    open: () => setVisible(true),
    close: () => setVisible(false),
  }));

  const handleLogout = useCallback(async () => {
    setShowLogoutConfirm(false);
    setVisible(false);
    await SecureStorage.removeItem(SecureStorageKey.BEARER_TOKEN);
    logout();
    router.replace(ROUTES.AUTH.LOGIN as Href);
  }, [logout, router]);

  const menuItems = useMemo(() => {
    const sharedItems: [] = [];

    const logoutItem = {
      label: 'Deconnexion',
      icon: 'log-out-outline' as const,
      isHighlight: true,
      onPress: () => setShowLogoutConfirm(true),
    };

    switch (role) {
      case 'client':
        return [...sharedItems, logoutItem];
      case 'seller':
        return [...sharedItems, logoutItem];
      case 'delivery_man':
        return [...sharedItems, logoutItem];
      default:
        return [...sharedItems, logoutItem];
    }
  }, [role]);

  return (
    <>
      <BottomSheetMenu visible={visible} onClose={() => setVisible(false)} items={menuItems} />
      <ConfirmationModal
        visible={showLogoutConfirm}
        title="Déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        confirmText="Se déconnecter"
        cancelText="Annuler"
        isDestructive
        iconName="log-out-outline"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
});

AppMenu.displayName = 'AppMenu';
