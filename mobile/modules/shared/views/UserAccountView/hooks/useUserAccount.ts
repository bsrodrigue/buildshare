import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';

import { Filesystem } from '@/libs/fs';
import { ImagePickerService } from '@/libs/image-picker';
import { Logger } from '@/libs/log';
import { Toaster } from '@/libs/notification/toast';
import { SecureStorage } from '@/libs/secure-storage';
import { SecureStorageKey } from '@/libs/secure-storage/keys';
import { useAuthStore } from '@/modules/auth/store';
import { useGetPayments } from '@/modules/payments/hooks';
import { useChangePassword, useUpdateProfile, useUploadAvatar } from '@/modules/profile/hooks';
import { useTheme } from '@/modules/shared/theme';
import { useGetSellerShop, useUpdateShop, useUploadShopLogo } from '@/modules/shops/hooks';

import type { ChangePasswordFormData } from '../components/ChangePasswordModal';
import type { EditProfileFormData } from '../components/EditProfileModal';

const logger = new Logger('UserAccount');

export function useUserAccount() {
  const { logout, user } = useAuthStore();
  const theme = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isImageSheetVisible, setIsImageSheetVisible] = useState(false);
  const [imageSourceType, setImageSourceType] = useState<'avatar' | 'logo'>('avatar');

  const { updateProfile, isLoading } = useUpdateProfile({
    onSuccess: () => {
      Toaster.success('Profil mis à jour', 'Vos informations ont été enregistrées avec succès.');
      setIsModalVisible(false);
    },
    onError: (error) => Toaster.error('Erreur', error.message),
  });

  const { uploadAvatar, isLoading: isAvatarLoading } = useUploadAvatar({
    onSuccess: () => {
      Toaster.success('Avatar mis à jour', 'Votre photo de profil a été mise à jour avec succès.');
    },
    onError: (error) => Toaster.error('Erreur', error.message),
  });

  const { shop, getSellerShop } = useGetSellerShop();

  const { updateShop, isLoading: isUpdatingShop } = useUpdateShop({
    onSuccess: () => getSellerShop(),
    onError: (err) => Toaster.error('Erreur', err.message),
  });

  const { uploadShopLogo, isLoading: isUploadingShopLogo } = useUploadShopLogo({
    onSuccess: () => {
      Toaster.success('Succès', 'Logo mis à jour');
      getSellerShop();
    },
    onError: (err) => Toaster.error('Erreur', err.message),
  });

  const { payments, getPayments } = useGetPayments();

  const { changePassword: changePasswordApi, isLoading: isChangingPassword } = useChangePassword({
    onSuccess: () => {
      Toaster.success('Mot de passe modifié', 'Votre mot de passe a été mis à jour avec succès.');
      setIsPasswordModalVisible(false);
    },
    onError: (error) => Toaster.error('Erreur', error.message),
  });

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    date_of_birth: new Date(),
    shop_name: '',
    shop_description: '',
    shop_phone: '',
    shop_email: '',
    shop_address: '',
    shop_latitude: 0,
    shop_longitude: 0,
  });

  useEffect(() => {
    getPayments();
  }, [getPayments]);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        date_of_birth: user.date_of_birth ? new Date(user.date_of_birth) : new Date(),
      }));

      if (user.role === 'seller') {
        getSellerShop();
      }
    }
  }, [user, isModalVisible, getSellerShop]);

  useEffect(() => {
    if (shop) {
      setFormData((prev) => ({
        ...prev,
        shop_name: shop.name || '',
        shop_description: shop.description || '',
        shop_phone: shop.phone || '',
        shop_email: shop.email || '',
        shop_address: shop.address || '',
        shop_latitude: shop.latitude || 0,
        shop_longitude: shop.longitude || 0,
      }));
    }
  }, [shop]);

  const handlePersonalAvatarPick = () => {
    setImageSourceType('avatar');
    setIsImageSheetVisible(true);
  };

  const handleShopLogoPick = () => {
    setImageSourceType('logo');
    setIsImageSheetVisible(true);
  };

  const handleSelectSource = async (source: 'camera' | 'library') => {
    try {
      const isCircular = imageSourceType === 'avatar';
      const result =
        source === 'camera'
          ? await ImagePickerService.openCamera(theme, isCircular)
          : await ImagePickerService.openPicker(theme, isCircular);

      if (result) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const file = Filesystem.prepareFileForUpload(result.path, 'upload.jpg');
        if (file) {
          if (imageSourceType === 'avatar') {
            await uploadAvatar(file);
          } else {
            await uploadShopLogo({ logo: file });
          }
        }
      }
    } catch (error) {
      logger.error('Error picking image', error);
      Toaster.error('Erreur', "Impossible de traiter l'image.");
    }
  };

  const handleConfirmLogout = async () => {
    setIsLogoutModalVisible(false);
    await SecureStorage.removeItem(SecureStorageKey.BEARER_TOKEN);
    logout();
  };

  const handleSave = async (data: EditProfileFormData) => {
    await updateProfile({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      date_of_birth: data.date_of_birth.toISOString(),
    });

    if (user?.role === 'seller') {
      await updateShop({
        name: data.shop_name || '',
        description: data.shop_description || '',
        phone: data.shop_phone || '',
        email: data.shop_email || '',
        address: data.shop_address || '',
        latitude: data.shop_latitude || 0,
        longitude: data.shop_longitude || 0,
      });
    }
  };

  const handleChangePassword = async (data: ChangePasswordFormData) => {
    await changePasswordApi(data);
  };

  return {
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
    isLoading: isLoading || isUpdatingShop,
    isAvatarLoading,
    isUploadingShopLogo,
    isChangingPassword,
    handlePersonalAvatarPick,
    handleShopLogoPick,
    handleSelectSource,
    handleConfirmLogout,
    handleSave,
    handleChangePassword,
  };
}
