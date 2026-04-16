import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface MenuItem {
  label: string;
  onPress: () => void;
  isHighlight?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface BottomSheetMenuProps {
  visible: boolean;
  onClose: () => void;
  items: MenuItem[];
}

export const BottomSheetMenu = ({ visible, onClose, items }: BottomSheetMenuProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.content}>
            {items.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.item}
                onPress={() => {
                  item.onPress();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.itemContent}>
                  {item.icon && (
                    <Ionicons
                      name={item.icon}
                      size={24}
                      color={item.isHighlight ? theme.colors.accent : theme.colors.text}
                      style={styles.icon}
                    />
                  )}
                  <Text style={[styles.label, item.isHighlight && styles.highlightLabel]}>
                    {item.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
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
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    sheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    handle: {
      width: 60,
      height: 6,
      backgroundColor: theme.colors.disabled,
      borderRadius: 3,
      alignSelf: 'center',
      marginBottom: theme.spacing.xl,
    },
    content: {
      gap: theme.spacing.xl,
    },
    item: {
      paddingVertical: 4,
    },
    itemContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      marginRight: theme.spacing.lg,
    },
    label: {
      color: theme.colors.text,
      fontSize: theme.fontSize.base,
      fontWeight: 'bold',
    },
    highlightLabel: {
      color: theme.colors.accent,
    },
  });
