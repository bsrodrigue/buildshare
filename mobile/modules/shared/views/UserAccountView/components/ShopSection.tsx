import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { EditableField } from '@/modules/shared/components/inputs/EditableField';
import { StaticAvatar } from '@/modules/shared/components/StaticAvatar';

import type { useUserAccount } from '../hooks/useUserAccount';
import type { UserAccountStyles } from '../UserAccountView.styles';

type ShopSectionProps = {
  shop: ReturnType<typeof useUserAccount>['shop'];
  isUploadingShopLogo: boolean;
  onLogoPick: () => void;
  onEditShop: () => void;
  styles: UserAccountStyles;
};

export const ShopSection = ({
  shop,
  isUploadingShopLogo,
  onLogoPick,
  onEditShop,
  styles,
}: ShopSectionProps) => {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.subSectionTitle}>MA BOUTIQUE</Text>
      </View>

      <TouchableOpacity
        style={styles.profileHeader}
        onPress={onLogoPick}
        activeOpacity={0.7}
        disabled={isUploadingShopLogo}
      >
        <View style={styles.avatarContainer}>
          <StaticAvatar
            size={60}
            source={
              shop?.logo_url
                ? { uri: shop.logo_url }
                : {
                    uri: 'https://ui-avatars.com/api/?name=Shop&background=333&color=fff',
                  }
            }
            style={styles.avatar}
            editable
            loading={isUploadingShopLogo}
          />
        </View>
        <View>
          <Text style={styles.profileName}>{shop?.name || 'Boutique'}</Text>
          <Text style={styles.editHint}>
            {isUploadingShopLogo ? 'Chargement...' : 'Appuyez pour changer le logo'}
          </Text>
        </View>
      </TouchableOpacity>

      <EditableField
        label="Nom de la boutique"
        value={shop?.name || undefined}
        onPress={onEditShop}
      />
      <EditableField
        label="Description"
        value={
          shop?.description && shop.description.length > 100
            ? `${shop.description.substring(0, 100)}...`
            : shop?.description || undefined
        }
        onPress={onEditShop}
      />
      <EditableField
        label="Téléphone boutique"
        value={shop?.phone || undefined}
        onPress={onEditShop}
      />
      <EditableField label="Email boutique" value={shop?.email || undefined} onPress={onEditShop} />
      <EditableField
        label="Adresse boutique"
        value={shop?.address || undefined}
        onPress={onEditShop}
      />
      <EditableField
        label="Coordonnées GPS"
        value={
          shop?.latitude && shop?.longitude
            ? `${shop.latitude.toFixed(4)}, ${shop.longitude.toFixed(4)}`
            : undefined
        }
        onPress={onEditShop}
      />
      <EditableField label="CODE PROMO" />
    </View>
  );
};
