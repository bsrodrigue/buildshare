import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { LauncherUtils } from '@/libs/launcher';
import { Toaster } from '@/libs/notification/toast';
import { type Theme, useTheme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface OrderItemProps {
  name: string;
  item: string;
  qty: string;
  price: string;
  phone?: string;
}

export const OrderItem = ({ name, item, qty, price, phone }: OrderItemProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const handleWhatsApp = () => {
    if (phone) {
      LauncherUtils.openWhatsApp(phone);
    } else {
      Toaster.error('Information', 'Numéro de téléphone non disponible');
    }
  };

  return (
    <View style={styles.orderRow}>
      <View style={[styles.cell, styles.nameCell]}>
        <Text style={styles.cellText} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View style={[styles.cell, styles.itemCell]}>
        <Text style={[styles.cellText, styles.itemCellText]} numberOfLines={1}>
          {item}
        </Text>
      </View>
      <View style={[styles.cell, styles.qtyCell]}>
        <Text style={styles.cellText}>{qty}</Text>
      </View>
      <View style={[styles.cell, styles.priceCell]}>
        <Text style={styles.cellText}>{price}</Text>
      </View>
      <TouchableOpacity style={styles.iconCell} onPress={handleWhatsApp}>
        <Ionicons name="logo-whatsapp" size={20} color={theme.colors.accent} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconCell}>
        <Ionicons name="bicycle-outline" size={20} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    orderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cell: {
      backgroundColor: theme.colors.surface,
      height: 32,
      justifyContent: 'center',
      paddingHorizontal: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    nameCell: {
      flex: 2,
    },
    itemCell: {
      flex: 2,
      backgroundColor: theme.colors.accent,
    },
    qtyCell: {
      flex: 0.8,
    },
    priceCell: {
      flex: 1.5,
    },
    cellText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    itemCellText: {
      color: theme.colors.textOnPrimary,
    },
    iconCell: {
      width: 32,
      height: 32,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
  });
