import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface WaitingDriverOverlayProps {
  visible: boolean;
  reference?: string;
  referenceLabel?: string;
  onCancel: () => void;
}

export const WaitingDriverOverlay = ({
  visible,
  reference,
  referenceLabel = 'Commande',
  onCancel,
}: WaitingDriverOverlayProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;

    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.15,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    spin.start();
    pulse.start();

    return () => {
      spin.stop();
      pulse.stop();
      spinValue.setValue(0);
      pulseValue.setValue(1);
    };
  }, [visible, spinValue, pulseValue]);

  const rotation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onCancel}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.loaderWrapper}>
            <Animated.View style={[styles.loaderOuter, { transform: [{ scale: pulseValue }] }]} />
            <Animated.View style={[styles.loaderRing, { transform: [{ rotate: rotation }] }]} />
            <View style={styles.loaderCenter}>
              <Ionicons name="bicycle" size={42} color={theme.colors.accent} />
            </View>
          </View>

          <Text style={styles.title}>Recherche d&apos;un livreur…</Text>
          <Text style={styles.subtitle}>
            Nous contactons les livreurs disponibles à proximité. Dès qu&apos;un livreur accepte
            votre demande, cette fenêtre se ferme automatiquement.
          </Text>

          {reference && (
            <View style={styles.orderBadge}>
              <Ionicons name="receipt-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.orderBadgeText}>
                {referenceLabel} #{reference}
              </Text>
            </View>
          )}

          <View style={styles.tip}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.tipText}>
              Vous pouvez continuer à utiliser l&apos;application. Nous vous préviendrons dès
              qu&apos;un livreur sera assigné.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.7}>
            <Ionicons name="close-circle-outline" size={20} color={theme.colors.textOnPrimary} />
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const LOADER_SIZE = 160;
const LOADER_RING_SIZE = 140;
const LOADER_CENTER_SIZE = 100;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    loaderWrapper: {
      width: LOADER_SIZE,
      height: LOADER_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xl,
    },
    loaderOuter: {
      position: 'absolute',
      width: LOADER_SIZE,
      height: LOADER_SIZE,
      borderRadius: LOADER_SIZE / 2,
      backgroundColor: theme.colors.accent,
      opacity: 0.08,
    },
    loaderRing: {
      position: 'absolute',
      width: LOADER_RING_SIZE,
      height: LOADER_RING_SIZE,
      borderRadius: LOADER_RING_SIZE / 2,
      borderWidth: 4,
      borderColor: theme.colors.border,
      borderTopColor: theme.colors.accent,
    },
    loaderCenter: {
      width: LOADER_CENTER_SIZE,
      height: LOADER_CENTER_SIZE,
      borderRadius: LOADER_CENTER_SIZE / 2,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    title: {
      fontSize: theme.fontSize.xl,
      fontWeight: '800',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: theme.spacing.lg,
    },
    orderBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.xl,
    },
    orderBadgeText: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.sm,
      fontWeight: '600',
    },
    tip: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tipText: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.xs,
      lineHeight: 18,
    },
    footer: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    cancelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.error,
      paddingVertical: theme.spacing.md,
      borderRadius: 14,
    },
    cancelButtonText: {
      color: theme.colors.textOnPrimary,
      fontSize: theme.fontSize.base,
      fontWeight: '700',
    },
  });
