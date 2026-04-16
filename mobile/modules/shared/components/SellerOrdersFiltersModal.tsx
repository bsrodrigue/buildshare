import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateTimeService } from '@/libs/datetime';
import {
  DeliveryType,
  OrderPaymentStatus,
  OrderStatus,
  PaymentMethod,
  SellerOrderSort,
  SortDirection,
} from '@/modules/seller-orders/types';
import { DatePicker } from '@/modules/shared/components/inputs/DatePicker';
import { type Theme, toAlpha, useTheme, useThemedStyles } from '@/modules/shared/theme';

export interface SellerOrdersFilters {
  statusList: OrderStatus[];
  paymentStatus: OrderPaymentStatus | null;
  paymentMethod: PaymentMethod | null;
  deliveryType: DeliveryType | null;
  dateFrom: string | null;
  dateTo: string | null;
  sort: SellerOrderSort;
  direction: SortDirection;
}

export const DEFAULT_SELLER_ORDERS_FILTERS: SellerOrdersFilters = {
  statusList: [],
  paymentStatus: null,
  paymentMethod: null,
  deliveryType: null,
  dateFrom: null,
  dateTo: null,
  sort: 'created_at',
  direction: 'desc',
};

interface SellerOrdersFiltersModalProps {
  visible: boolean;
  initialFilters: SellerOrdersFilters;
  onClose: () => void;
  onApply: (filters: SellerOrdersFilters) => void;
}

const STATUS_OPTIONS: { label: string; value: OrderStatus }[] = [
  { label: 'En attente', value: 'pending' },
  { label: 'Confirmée', value: 'confirmed' },
  { label: 'En préparation', value: 'preparing' },
  { label: 'Prête', value: 'ready' },
  { label: 'En livraison', value: 'in_delivery' },
  { label: 'À confirmer', value: 'pending_confirmation' },
  { label: 'Livrée', value: 'delivered' },
  { label: 'Annulée', value: 'cancelled' },
];

const PAYMENT_STATUS_OPTIONS: { label: string; value: OrderPaymentStatus | null }[] = [
  { label: 'Tous', value: null },
  { label: 'En attente', value: 'pending' },
  { label: 'Payé', value: 'paid' },
  { label: 'Remboursé', value: 'refunded' },
];

const PAYMENT_METHOD_OPTIONS: { label: string; value: PaymentMethod | null }[] = [
  { label: 'Tous', value: null },
  { label: 'CinetPay', value: 'cinetpay' },
  { label: 'Orange Money', value: 'orange_money' },
  { label: 'Moov Money', value: 'moov_money' },
  { label: 'Coris Money', value: 'coris_money' },
  { label: 'Telecel Money', value: 'telecel_money' },
  { label: 'Espèces', value: 'cash' },
  { label: 'Virement', value: 'bank_transfer' },
];

const DELIVERY_TYPE_OPTIONS: { label: string; value: DeliveryType | null }[] = [
  { label: 'Tous', value: null },
  { label: 'Sur place', value: 'pickup' },
  { label: 'Livraison', value: 'delivery' },
];

const SORT_OPTIONS: { label: string; value: SellerOrderSort }[] = [
  { label: 'Date', value: 'created_at' },
  { label: 'Montant', value: 'total' },
  { label: 'Statut', value: 'status' },
];

const DIRECTION_OPTIONS: { label: string; value: SortDirection }[] = [
  { label: 'Décroissant', value: 'desc' },
  { label: 'Croissant', value: 'asc' },
];

const parseDate = (value: string | null): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export const SellerOrdersFiltersModal = ({
  visible,
  initialFilters,
  onClose,
  onApply,
}: SellerOrdersFiltersModalProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const [statusList, setStatusList] = useState<OrderStatus[]>(initialFilters.statusList);
  const [paymentStatus, setPaymentStatus] = useState<OrderPaymentStatus | null>(
    initialFilters.paymentStatus,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    initialFilters.paymentMethod,
  );
  const [deliveryType, setDeliveryType] = useState<DeliveryType | null>(
    initialFilters.deliveryType,
  );
  const [dateFrom, setDateFrom] = useState<Date | undefined>(parseDate(initialFilters.dateFrom));
  const [dateTo, setDateTo] = useState<Date | undefined>(parseDate(initialFilters.dateTo));
  const [sort, setSort] = useState<SellerOrderSort>(initialFilters.sort);
  const [direction, setDirection] = useState<SortDirection>(initialFilters.direction);

  useEffect(() => {
    if (visible) {
      setStatusList(initialFilters.statusList);
      setPaymentStatus(initialFilters.paymentStatus);
      setPaymentMethod(initialFilters.paymentMethod);
      setDeliveryType(initialFilters.deliveryType);
      setDateFrom(parseDate(initialFilters.dateFrom));
      setDateTo(parseDate(initialFilters.dateTo));
      setSort(initialFilters.sort);
      setDirection(initialFilters.direction);
    }
  }, [visible, initialFilters]);

  const toggleStatus = (status: OrderStatus) => {
    setStatusList((current) =>
      current.includes(status) ? current.filter((s) => s !== status) : [...current, status],
    );
  };

  const handleReset = () => {
    setStatusList([]);
    setPaymentStatus(null);
    setPaymentMethod(null);
    setDeliveryType(null);
    setDateFrom(undefined);
    setDateTo(undefined);
    setSort('created_at');
    setDirection('desc');
  };

  const handleApply = () => {
    onApply({
      statusList,
      paymentStatus,
      paymentMethod,
      deliveryType,
      dateFrom: dateFrom ? DateTimeService.format(dateFrom, 'YYYY-MM-DD') : null,
      dateTo: dateTo ? DateTimeService.format(dateTo, 'YYYY-MM-DD') : null,
      sort,
      direction,
    });
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
            <Text style={styles.sectionTitle}>Statut</Text>
            {renderChipGroup(
              STATUS_OPTIONS,
              (value) => statusList.includes(value),
              (value) => toggleStatus(value),
            )}

            <Text style={styles.sectionTitle}>Paiement</Text>
            {renderChipGroup(
              PAYMENT_STATUS_OPTIONS,
              (value) => paymentStatus === value,
              (value) => setPaymentStatus(value),
            )}

            <Text style={styles.sectionTitle}>Moyen de paiement</Text>
            {renderChipGroup(
              PAYMENT_METHOD_OPTIONS,
              (value) => paymentMethod === value,
              (value) => setPaymentMethod(value),
            )}

            <Text style={styles.sectionTitle}>Mode de livraison</Text>
            {renderChipGroup(
              DELIVERY_TYPE_OPTIONS,
              (value) => deliveryType === value,
              (value) => setDeliveryType(value),
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
      maxHeight: '90%',
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
