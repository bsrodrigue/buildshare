import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Format } from '@/libs/fmt';
import { SellerProductResource } from '@/modules/products/types';
import { type Theme, useTheme, useThemedStyles } from '@/modules/shared/theme';

interface StockRowProps {
  product: SellerProductResource;
  isLoading?: boolean;
  onCommit: (newQty: number) => void;
}

const QUICK_ADD_STEPS = [1, 10, 50];

type StatusTone = 'out' | 'low' | 'ok';

const getStatusTone = (qty: number): StatusTone => {
  if (qty === 0) return 'out';
  if (qty <= 5) return 'low';
  return 'ok';
};

const STATUS_LABELS: Record<StatusTone, string> = {
  out: 'Rupture',
  low: 'Stock faible',
  ok: 'Disponible',
};

export const StockRow = ({ product, isLoading, onCommit }: StockRowProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const [localQty, setLocalQty] = useState(product.quantity);
  const [draftText, setDraftText] = useState(String(product.quantity));
  const isEditing = useRef(false);

  // Keep local in sync when the server sends a new quantity (unless user is editing)
  useEffect(() => {
    if (!isEditing.current) {
      setLocalQty(product.quantity);
      setDraftText(String(product.quantity));
    }
  }, [product.quantity]);

  const commitQuantity = (next: number) => {
    const sanitized = Math.max(0, Math.floor(Number.isFinite(next) ? next : 0));
    if (sanitized === product.quantity) {
      setDraftText(String(sanitized));
      return;
    }
    setLocalQty(sanitized);
    setDraftText(String(sanitized));
    onCommit(sanitized);
  };

  const handleDecrease = () => {
    commitQuantity(localQty - 1);
  };

  const handleIncrease = () => {
    commitQuantity(localQty + 1);
  };

  const handleQuickAdd = (delta: number) => {
    commitQuantity(localQty + delta);
  };

  const handleChangeText = (text: string) => {
    isEditing.current = true;
    setDraftText(text.replace(/[^0-9]/g, ''));
  };

  const handleBlur = () => {
    isEditing.current = false;
    const parsed = parseInt(draftText, 10);
    if (Number.isNaN(parsed)) {
      setDraftText(String(localQty));
      return;
    }
    commitQuantity(parsed);
  };

  const tone = getStatusTone(localQty);
  const statusLabel = STATUS_LABELS[tone];
  const stockValue = (product.stock_value ?? product.price * localQty) || 0;

  const toneStyles = {
    out: { badge: styles.statusBadgeOut, text: styles.statusTextOut },
    low: { badge: styles.statusBadgeLow, text: styles.statusTextLow },
    ok: { badge: styles.statusBadgeOk, text: styles.statusTextOk },
  }[tone];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Image source={{ uri: product.image_url }} style={styles.thumbnail} resizeMode="cover" />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.price}>{Format.price(product.price)} / u.</Text>
          <Text style={styles.stockValue}>Valeur stock : {Format.price(stockValue)}</Text>
        </View>
        <View style={[styles.statusBadge, toneStyles.badge]}>
          <Text style={[styles.statusText, toneStyles.text]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.counterRow}>
        <TouchableOpacity
          style={[styles.counterBtn, localQty <= 0 && styles.counterBtnDisabled]}
          onPress={handleDecrease}
          disabled={isLoading || localQty <= 0}
          hitSlop={6}
        >
          <Ionicons
            name="remove"
            size={22}
            color={isLoading ? theme.colors.disabled : theme.colors.text}
          />
        </TouchableOpacity>

        <View style={styles.qtyInputWrapper}>
          {isLoading ? (
            <ActivityIndicator color={theme.colors.accent} />
          ) : (
            <TextInput
              value={draftText}
              onChangeText={handleChangeText}
              onBlur={handleBlur}
              keyboardType="number-pad"
              selectTextOnFocus
              style={styles.qtyInput}
              maxLength={6}
            />
          )}
          <Text style={styles.qtyCaption}>unités</Text>
        </View>

        <TouchableOpacity
          style={styles.counterBtn}
          onPress={handleIncrease}
          disabled={isLoading}
          hitSlop={6}
        >
          <Ionicons
            name="add"
            size={22}
            color={isLoading ? theme.colors.disabled : theme.colors.text}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.quickRow}>
        {QUICK_ADD_STEPS.map((step) => (
          <TouchableOpacity
            key={`add-${step}`}
            style={styles.quickChip}
            onPress={() => handleQuickAdd(step)}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.quickChipText}>+{step}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.quickChip, styles.quickChipDanger]}
          onPress={() => commitQuantity(0)}
          disabled={isLoading || localQty === 0}
          activeOpacity={0.7}
        >
          <Text style={[styles.quickChipText, styles.quickChipTextDanger]}>Rupture</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    thumbnail: {
      width: 52,
      height: 52,
      borderRadius: 10,
      backgroundColor: theme.colors.background,
    },
    info: {
      flex: 1,
      gap: 2,
    },
    name: {
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
      fontWeight: '700',
      lineHeight: 18,
    },
    price: {
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    stockValue: {
      color: theme.colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      alignSelf: 'flex-start',
    },
    statusBadgeOk: {
      backgroundColor: 'rgba(46, 125, 50, 0.12)',
      borderColor: 'rgba(46, 125, 50, 0.28)',
    },
    statusBadgeLow: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.28)',
    },
    statusBadgeOut: {
      backgroundColor: 'rgba(220, 38, 38, 0.12)',
      borderColor: 'rgba(220, 38, 38, 0.28)',
    },
    statusText: {
      fontSize: 11,
      fontWeight: '800',
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
    counterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 8,
    },
    counterBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    counterBtnDisabled: {
      opacity: 0.45,
    },
    qtyInputWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    qtyInput: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '800',
      textAlign: 'center',
      minWidth: 60,
      paddingVertical: 0,
    },
    qtyCaption: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    quickRow: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    quickChip: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
    },
    quickChipDanger: {
      borderColor: 'rgba(220, 38, 38, 0.28)',
      backgroundColor: 'rgba(220, 38, 38, 0.08)',
    },
    quickChipText: {
      color: theme.colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    quickChipTextDanger: {
      color: '#dc2626',
    },
  });
