import React from 'react';
import { ScrollView, View } from 'react-native';

import { ConfirmationModal } from '@/modules/shared/components/ConfirmationModal';
import { ImageSourceBottomSheet } from '@/modules/shared/components/ImageSourceBottomSheet';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

import { ChangePasswordModal } from './components/ChangePasswordModal';
import { EditProfileModal } from './components/EditProfileModal';
import { PaymentHistorySection } from './components/PaymentHistorySection';
import { ProfileSection } from './components/ProfileSection';
import { ShopSection } from './components/ShopSection';
import { useUserAccount } from './hooks/useUserAccount';
import { createStyles } from './UserAccountView.styles';

export type UserAccountViewProps = {
  header?: React.ReactNode;
  children?: React.ReactNode;
};

export const UserAccountView = ({ header, children }: UserAccountViewProps) => {
  const styles = useThemedStyles(createStyles);
  const {
    user,
    shop,
    payments,
    isModalVisible,
    setIsModalVisible,
    isPasswordModalVisible,
    setIsPasswordModalVisible,
    isLogoutModalVisible,
    setIsLogoutModalVisible,
    isImageSheetVisible,
    setIsImageSheetVisible,
    imageSourceType,
    formData,
    isLoading,
    isAvatarLoading,
    isUploadingShopLogo,
    isChangingPassword,
    handlePersonalAvatarPick,
    handleShopLogoPick,
    handleSelectSource,
    handleConfirmLogout,
    handleSave,
    handleChangePassword,
  } = useUserAccount();

  const username = user ? `${user.first_name} ${user.last_name}` : 'Utilisateur';
  const avatarUri = user?.avatar_url ? { uri: user.avatar_url } : undefined;
  const isSeller = user?.role === 'seller';

  return (
    <View style={styles.container}>
      {header}

      <ScrollView contentContainerStyle={styles.content}>
        <ProfileSection
          user={user}
          username={username}
          avatarUri={avatarUri}
          isAvatarLoading={isAvatarLoading}
          onAvatarPick={handlePersonalAvatarPick}
          onEditProfile={() => setIsModalVisible(true)}
          onChangePassword={() => setIsPasswordModalVisible(true)}
          onLogout={() => setIsLogoutModalVisible(true)}
          styles={styles}
        />

        {isSeller && (
          <ShopSection
            shop={shop}
            isUploadingShopLogo={isUploadingShopLogo}
            onLogoPick={handleShopLogoPick}
            onEditShop={() => setIsModalVisible(true)}
            styles={styles}
          />
        )}

        {children}

        <PaymentHistorySection payments={payments} styles={styles} />
      </ScrollView>

      <EditProfileModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        isSeller={isSeller}
        initialValues={formData}
        onSave={handleSave}
        isLoading={isLoading}
      />

      <ChangePasswordModal
        visible={isPasswordModalVisible}
        onClose={() => setIsPasswordModalVisible(false)}
        onSave={handleChangePassword}
        isLoading={isChangingPassword}
      />

      <ConfirmationModal
        visible={isLogoutModalVisible}
        title="Déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsLogoutModalVisible(false)}
        confirmText="Déconnexion"
        isDestructive
        iconName="log-out-outline"
      />

      <ImageSourceBottomSheet
        visible={isImageSheetVisible}
        onClose={() => setIsImageSheetVisible(false)}
        onSelect={handleSelectSource}
        title={imageSourceType === 'avatar' ? 'Photo de profil' : 'Logo de boutique'}
      />
    </View>
  );
};
