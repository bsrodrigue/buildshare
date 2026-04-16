import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useDebouncedCallback } from '@/hooks/useDebounce';
import { type Theme, useTheme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface StockItemProps {
  name: string;
  qty: number;
  onChange: (newQty: number) => void;
  isLoading?: boolean;
}

export const StockItem = ({ name, qty, onChange, isLoading }: StockItemProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [localQty, setLocalQty] = useState(qty);
  const isFirstRender = useRef(true);
  const statusTone = localQty === 0 ? 'out' : localQty <= 5 ? 'low' : 'ok';
  const statusLabel =
    statusTone === 'out' ? 'Rupture' : statusTone === 'low' ? 'Stock faible' : 'Disponible';

  // Sync local quantity when prop changes (after a successful refetch)
  // but only if we're not currently waiting for an update to complete
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!isLoading) {
      setLocalQty(qty);
    }
  }, [qty, isLoading]);

  const debouncedOnChange = useDebouncedCallback(onChange, 800);

  const handleIncrease = () => {
    const next = localQty + 1;
    setLocalQty(next);
    debouncedOnChange(next);
  };

  const handleDecrease = () => {
    const next = Math.max(0, localQty - 1);
    setLocalQty(next);
    debouncedOnChange(next);
  };

  return (
    <View style={styles.stockRow}>
      <View style={styles.stockLabel}>
        <View style={styles.stockHeader}>
          <Text style={styles.stockLabelText} numberOfLines={2}>
            {name}
          </Text>
          <View
            style={[
              styles.statusBadge,
              statusTone === 'out'
                ? styles.statusBadgeOut
                : statusTone === 'low'
                  ? styles.statusBadgeLow
                  : styles.statusBadgeOk,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                statusTone === 'out'
                  ? styles.statusTextOut
                  : statusTone === 'low'
                    ? styles.statusTextLow
                    : styles.statusTextOk,
              ]}
            >
              {statusLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.stockCaption}>
          {localQty === 0
            ? 'Réapprovisionnement recommandé'
            : localQty <= 5
              ? 'Quantité à surveiller'
              : 'Stock stable'}
        </Text>
      </View>
      <View style={styles.stockCounter}>
        <Text style={styles.counterLabel}>Qté</Text>
        <View style={styles.counterControls}>
          <TouchableOpacity
            style={[styles.counterBtn, localQty <= 0 && styles.counterBtnDisabled]}
            onPress={handleDecrease}
            disabled={isLoading || localQty <= 0}
          >
            <Ionicons
              name="remove-circle-outline"
              size={24}
              color={isLoading ? theme.colors.disabled : theme.colors.text}
            />
          </TouchableOpacity>
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.accent}
              style={styles.loadingIndicator}
            />
          ) : (
            <Text style={styles.counterText}>{localQty}</Text>
          )}
          <TouchableOpacity style={styles.counterBtn} onPress={handleIncrease} disabled={isLoading}>
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={isLoading ? theme.colors.disabled : theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    stockRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardBackground,
    },
    stockLabel: {
      backgroundColor: theme.colors.surface,
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      gap: 8,
    },
    stockHeader: {
      gap: theme.spacing.xs,
    },
    stockLabelText: {
      color: theme.colors.text,
      fontWeight: '700',
      fontSize: 15,
      lineHeight: 20,
    },
    stockCaption: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
    stockCounter: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
      minWidth: 138,
      paddingHorizontal: theme.spacing.sm,
      gap: theme.spacing.xs,
      borderLeftWidth: 1,
      borderLeftColor: theme.colors.border,
    },
    counterLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    counterControls: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    counterBtn: {
      padding: 2,
    },
    counterBtnDisabled: {
      opacity: 0.45,
    },
    counterText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      minWidth: 30,
      textAlign: 'center',
    },
    loadingIndicator: {
      width: 30,
    },
    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      alignSelf: 'flex-start',
    },
    statusBadgeOk: {
      backgroundColor: 'rgba(46, 125, 50, 0.12)',
      borderColor: 'rgba(46, 125, 50, 0.25)',
    },
    statusBadgeLow: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.25)',
    },
    statusBadgeOut: {
      backgroundColor: 'rgba(220, 38, 38, 0.12)',
      borderColor: 'rgba(220, 38, 38, 0.25)',
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
    },
    statusTextOk: {
      color: '#2e7d32',
    },
    statusTextLow: {
      color: '#d97706',
    },
    statusTextOut: {
      color: '#dc2626',
    },
  });
