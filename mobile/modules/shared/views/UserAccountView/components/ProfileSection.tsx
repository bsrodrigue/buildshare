import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { DateTimeService } from '@/libs/datetime';
import { Button } from '@/modules/shared/components/inputs/Button';
import { EditableField } from '@/modules/shared/components/inputs/EditableField';
import { StaticAvatar } from '@/modules/shared/components/StaticAvatar';

import type { useUserAccount } from '../hooks/useUserAccount';
import type { UserAccountStyles } from '../UserAccountView.styles';

type ProfileSectionProps = {
  user: ReturnType<typeof useUserAccount>['user'];
  username: string;
  avatarUri: { uri: string } | undefined;
  isAvatarLoading: boolean;
  onAvatarPick: () => void;
  onEditProfile: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
  styles: UserAccountStyles;
};

export const ProfileSection = ({
  user,
  username,
  avatarUri,
  isAvatarLoading,
  onAvatarPick,
  onEditProfile,
  onChangePassword,
  onLogout,
  styles,
}: ProfileSectionProps) => {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.subSectionTitle}>MON PROFIL</Text>
      </View>

      <TouchableOpacity
        style={styles.profileHeader}
        onPress={onAvatarPick}
        activeOpacity={0.7}
        disabled={isAvatarLoading}
      >
        <View style={styles.avatarContainer}>
          <StaticAvatar
            size={60}
            source={avatarUri}
            fallbackText={username}
            style={styles.avatar}
            editable
            loading={isAvatarLoading}
          />
        </View>
        <View>
          <Text style={styles.profileName}>{username}</Text>
          <Text style={styles.editHint}>
            {isAvatarLoading ? 'Chargement...' : 'Appuyez pour changer votre photo'}
          </Text>
        </View>
      </TouchableOpacity>

      <EditableField label="Prénom" value={user?.first_name} onPress={onEditProfile} />
      <EditableField label="Nom" value={user?.last_name} onPress={onEditProfile} />
      <EditableField label="Email" value={user?.email} onPress={onEditProfile} />
      <EditableField
        label="Date de naissance"
        value={
          user?.date_of_birth
            ? DateTimeService.format(user.date_of_birth, 'DD/MM/YYYY')
            : 'Ajouter une date'
        }
        onPress={onEditProfile}
      />

      <EditableField label="Numéro de téléphone" value={user?.phone} />
      <EditableField label="Mot de passe" value="********" onPress={onChangePassword} />

      <View style={styles.buttonWrapper}>
        <Button title="Déconnexion" onPress={onLogout} style={styles.actionButton} />
      </View>
    </View>
  );
};
