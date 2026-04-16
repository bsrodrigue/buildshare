import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ProductSort,
  ProductSortDirection,
  ProductStatus,
  StockLevel,
} from '@/modules/products/types';
import { type Theme, toAlpha, useTheme, useThemedStyles } from '@/modules/shared/theme';

export interface SellerStockFilters {
  stockLevel: StockLevel | null;
  status: ProductStatus | null;
  sort: ProductSort;
  direction: ProductSortDirection;
}

export const DEFAULT_SELLER_STOCK_FILTERS: SellerStockFilters = {
  stockLevel: null,
  status: null,
  sort: 'updated_at',
  direction: 'desc',
};

interface SellerStockFiltersModalProps {
  visible: boolean;
  initialFilters: SellerStockFilters;
  onClose: () => void;
  onApply: (filters: SellerStockFilters) => void;
}

const STOCK_LEVEL_OPTIONS: { label: string; value: StockLevel | null }[] = [
  { label: 'Tous', value: null },
  { label: 'Ruptures', value: 'out_of_stock' },
  { label: 'Stock faible', value: 'low_stock' },
  { label: 'En stock', value: 'in_stock' },
];

const STATUS_OPTIONS: { label: string; value: ProductStatus | null }[] = [
  { label: 'Tous', value: null },
  { label: 'Actif', value: 'active' },
  { label: 'Inactif', value: 'inactive' },
];

const SORT_OPTIONS: { label: string; value: ProductSort }[] = [
  { label: 'Dernière MAJ', value: 'updated_at' },
  { label: 'Nom', value: 'name' },
  { label: 'Quantité', value: 'quantity' },
  { label: 'Prix unitaire', value: 'price' },
  { label: 'Valeur stock', value: 'stock_value' },
  { label: 'Date de création', value: 'created_at' },
];

const DIRECTION_OPTIONS: { label: string; value: ProductSortDirection }[] = [
  { label: 'Décroissant', value: 'desc' },
  { label: 'Croissant', value: 'asc' },
];

export const SellerStockFiltersModal = ({
  visible,
  initialFilters,
  onClose,
  onApply,
}: SellerStockFiltersModalProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const [stockLevel, setStockLevel] = useState<StockLevel | null>(initialFilters.stockLevel);
  const [status, setStatus] = useState<ProductStatus | null>(initialFilters.status);
  const [sort, setSort] = useState<ProductSort>(initialFilters.sort);
  const [direction, setDirection] = useState<ProductSortDirection>(initialFilters.direction);

  useEffect(() => {
    if (visible) {
      setStockLevel(initialFilters.stockLevel);
      setStatus(initialFilters.status);
      setSort(initialFilters.sort);
      setDirection(initialFilters.direction);
    }
  }, [visible, initialFilters]);

  const handleReset = () => {
    setStockLevel(null);
    setStatus(null);
    setSort('updated_at');
    setDirection('desc');
  };

  const handleApply = () => {
    onApply({ stockLevel, status, sort, direction });
    onClose();
  };

  const renderChipGroup = <T,>(
    options: { label: string; value: T }[],
    isActive: (value: T) => boolean,
    onSelect: (value: T) => void,
  ) => (
    <View style={styles.optionsContainer}>
      {options.map((opt) => {
        const active = isActive(opt.value);
        return (
          <TouchableOpacity
            key={`${opt.label}`}
            style={[styles.option, active && styles.activeOption]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.optionText, active && styles.activeOptionText]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Filtres</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.sectionTitle}>Niveau de stock</Text>
            {renderChipGroup(
              STOCK_LEVEL_OPTIONS,
              (value) => stockLevel === value,
              (value) => setStockLevel(value),
            )}

            <Text style={styles.sectionTitle}>Statut</Text>
            {renderChipGroup(
              STATUS_OPTIONS,
              (value) => status === value,
              (value) => setStatus(value),
            )}

            <Text style={styles.sectionTitle}>Trier par</Text>
            {renderChipGroup(
              SORT_OPTIONS,
              (value) => sort === value,
              (value) => setSort(value),
            )}

            <Text style={styles.sectionTitle}>Direction</Text>
            {renderChipGroup(
              DIRECTION_OPTIONS,
              (value) => direction === value,
              (value) => setDirection(value),
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
              <Text style={styles.resetText}>Réinitialiser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.8}>
              <Text style={styles.applyText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      color: theme.colors.text,
      fontSize: theme.fontSize.lg,
      fontWeight: '800',
    },
    content: {
      paddingHorizontal: theme.spacing.md,
    },
    contentContainer: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    sectionTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSize.md,
      fontWeight: '700',
      marginBottom: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    optionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: theme.spacing.md,
    },
    option: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    activeOption: {
      borderColor: theme.colors.accent,
      backgroundColor: toAlpha(theme.colors.accent, 0.12),
    },
    optionText: {
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
    },
    activeOptionText: {
      color: theme.colors.accent,
      fontWeight: '700',
    },
    footer: {
      flexDirection: 'row',
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    resetBtn: {
      flex: 1,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    resetText: {
      color: theme.colors.text,
      fontWeight: '700',
    },
    applyBtn: {
      flex: 2,
      height: 48,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: theme.borderRadius.sm,
    },
    applyText: {
      color: theme.colors.textOnPrimary,
      fontWeight: '700',
    },
  });
