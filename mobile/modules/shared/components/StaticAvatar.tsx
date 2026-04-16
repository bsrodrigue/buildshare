import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface StaticAvatarProps {
  source?: ImageSourcePropType | { uri: string };
  size?: number;
  style?: ViewStyle;
  fallbackText?: string;
  editable?: boolean;
  loading?: boolean;
}

const getInitials = (value?: string) => {
  const parts = (value || '').trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return '?';

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};

export const StaticAvatar = ({
  source,
  size = 120,
  style,
  fallbackText,
  editable,
  loading,
}: StaticAvatarProps) => {
  const styles = useThemedStyles(createStyles);

  const borderRadius = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius }, style]}>
      <View style={[styles.innerContainer, { borderRadius: borderRadius - 2 }]}>
        {source ? (
          <Image source={source} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={[styles.initials, { fontSize: Math.max(14, size * 0.34) }]}>
              {getInitials(fallbackText)}
            </Text>
          </View>
        )}

        {loading && (
          <View style={[styles.loadingOverlay, { borderRadius: borderRadius - 2 }]}>
            <ActivityIndicator color="white" size="small" />
          </View>
        )}
      </View>

      {editable && !loading && (
        <View
          style={[
            styles.editBadge,
            { width: size * 0.28, height: size * 0.28, borderRadius: (size * 0.28) / 2 },
          ]}
        >
          <Ionicons name="camera" size={size * 0.16} color="white" />
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.border,
      overflow: 'visible',
    },
    innerContainer: {
      flex: 1,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    placeholder: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: {
      color: theme.colors.textWhite,
      fontWeight: '800',
    },
    editBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.background,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 4,
    },
  });
