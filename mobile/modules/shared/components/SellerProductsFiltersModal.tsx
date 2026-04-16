import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateTimeService } from '@/libs/datetime';
import { ProductCategoryResource } from '@/modules/product-categories/types';
import { ProductStatus } from '@/modules/products/types';
import { DatePicker } from '@/modules/shared/components/inputs/DatePicker';
import { type Theme, toAlpha, useTheme, useThemedStyles } from '@/modules/shared/theme';

export interface SellerProductsFilters {
  status: ProductStatus | null;
  categoryIds: number[];
  dateFrom: string | null;
  dateTo: string | null;
}

interface SellerProductsFiltersModalProps {
  visible: boolean;
  initialFilters: SellerProductsFilters;
  categories: ProductCategoryResource[];
  onClose: () => void;
  onApply: (filters: SellerProductsFilters) => void;
}

const STATUS_OPTIONS: { label: string; value: ProductStatus | null }[] = [
  { label: 'Tous', value: null },
  { label: 'Actif', value: 'active' },
  { label: 'Inactif', value: 'inactive' },
  { label: 'Rupture', value: 'out_of_stock' },
];

const parseDate = (value: string | null): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export const SellerProductsFiltersModal = ({
  visible,
  initialFilters,
  categories,
  onClose,
  onApply,
}: SellerProductsFiltersModalProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const [status, setStatus] = useState<ProductStatus | null>(initialFilters.status);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
    initialFilters.categoryIds,
  );
  const [dateFrom, setDateFrom] = useState<Date | undefined>(parseDate(initialFilters.dateFrom));
  const [dateTo, setDateTo] = useState<Date | undefined>(parseDate(initialFilters.dateTo));

  useEffect(() => {
    if (visible) {
      setStatus(initialFilters.status);
      setSelectedCategoryIds(initialFilters.categoryIds);
      setDateFrom(parseDate(initialFilters.dateFrom));
      setDateTo(parseDate(initialFilters.dateTo));
    }
  }, [visible, initialFilters]);

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    );
  };

  const handleReset = () => {
    setStatus(null);
    setSelectedCategoryIds([]);
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const handleApply = () => {
    onApply({
      status,
      categoryIds: selectedCategoryIds,
      dateFrom: dateFrom ? DateTimeService.format(dateFrom, 'YYYY-MM-DD') : null,
      dateTo: dateTo ? DateTimeService.format(dateTo, 'YYYY-MM-DD') : null,
    });
    onClose();
  };

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
            <Text style={styles.sectionTitle}>Statut</Text>
            <View style={styles.optionsContainer}>
              {STATUS_OPTIONS.map((opt) => {
                const active = status === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.option, active && styles.activeOption]}
                    onPress={() => setStatus(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.optionText, active && styles.activeOptionText]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {categories.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Catégories</Text>
                <View style={styles.optionsContainer}>
                  {categories.map((cat) => {
                    const active = selectedCategoryIds.includes(cat.id);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.option, active && styles.activeOption]}
                        onPress={() => toggleCategory(cat.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.optionText, active && styles.activeOptionText]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={styles.sectionTitle}>Période de création</Text>
            <DatePicker
              label="Du"
              value={dateFrom}
              onChange={setDateFrom}
              maximumDate={dateTo ?? new Date()}
              placeholder="Date de début"
            />
            <DatePicker
              label="Au"
              value={dateTo}
              onChange={setDateTo}
              minimumDate={dateFrom}
              maximumDate={new Date()}
              placeholder="Date de fin"
            />
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
