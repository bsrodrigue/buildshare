import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ProductCategoryResource } from '@/modules/product-categories/types';
import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface CategoryBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  categories: ProductCategoryResource[];
  onSelect: (category: ProductCategoryResource) => void;
  selectedId?: number | null;
}

export const CategoryBottomSheet = ({
  visible,
  onClose,
  categories,
  onSelect,
  selectedId,
}: CategoryBottomSheetProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Catégories</Text>
            <Text style={styles.subtitle}>Sélectionnez le type d&apos;article</Text>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {categories.map((category) => {
              const isSelected = selectedId === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => {
                    onSelect(category);
                    onClose();
                  }}
                  activeOpacity={0.7}
                  style={[styles.item, isSelected && styles.selectedItem]}
                >
                  <Text style={[styles.label, isSelected && styles.selectedLabel]}>
                    {category.name}
                  </Text>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.placeholder} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    sheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: 40,
      maxHeight: '80%',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 24,
    },
    header: {
      marginBottom: 20,
    },
    title: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    subtitle: {
      color: theme.colors.placeholder,
      fontSize: 14,
      marginTop: 2,
    },
    content: {
      marginBottom: 16,
    },
    scrollContent: {
      gap: 8,
    },
    item: {
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    selectedItem: {
      backgroundColor: theme.colors.accent + '10',
      borderColor: theme.colors.accent,
    },
    label: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '500',
    },
    selectedLabel: {
      color: theme.colors.accent,
      fontWeight: '600',
    },
    closeButton: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    closeButtonText: {
      color: theme.colors.placeholder,
      fontSize: 14,
      fontWeight: '600',
    },
  });
