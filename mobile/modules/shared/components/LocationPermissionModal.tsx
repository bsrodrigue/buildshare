import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';

import { AppConfiguration } from '@/libs/app-config';
import type { Theme } from '@/modules/shared/theme';
import { toAlpha } from '@/modules/shared/theme/colors';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

import { Button } from './inputs/Button';

interface LocationPermissionModalProps {
  visible: boolean;
  onConfirm: () => void;
}

export const LocationPermissionModal = ({ visible, onConfirm }: LocationPermissionModalProps) => {
  const { styles, tokens } = useThemedStyles(createStyles);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onConfirm}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onConfirm}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBg}>
              <Ionicons name="location" size={40} color={tokens.accent} />
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Géolocalisation requise</Text>
            <Text style={styles.message}>
              {AppConfiguration.appName} a besoin de votre position pour vous proposer les meilleurs
              services à proximité et assurer des livraisons précises.
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              title="J'ai compris"
              onPress={onConfirm}
              style={styles.confirmButton}
              borderRadius={16}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) => ({
  styles: StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    container: {
      backgroundColor: theme.colors.background,
      borderRadius: 28,
      padding: 24,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
        },
        android: {
          elevation: 10,
        },
      }),
    },
    iconContainer: {
      marginBottom: 20,
    },
    iconBg: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: toAlpha(theme.colors.accent, 0.1),
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      alignItems: 'center',
      marginBottom: 32,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    message: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    actions: {
      width: '100%',
    },
    confirmButton: {
      width: '100%',
      paddingVertical: 14,
    },
  }),
  tokens: {
    accent: theme.colors.accent,
  },
});
