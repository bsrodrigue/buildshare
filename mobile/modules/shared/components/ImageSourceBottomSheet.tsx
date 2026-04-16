import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface ImageSourceBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (source: 'camera' | 'library') => void;
  title?: string;
}

export const ImageSourceBottomSheet = ({
  visible,
  onClose,
  onSelect,
  title = 'Changer la photo',
}: ImageSourceBottomSheetProps) => {
  const styles = useThemedStyles(createStyles);

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Sélectionnez une option pour continuer</Text>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                onSelect('camera');
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, styles.cameraIconBg]}>
                <Ionicons name="camera" size={24} color="white" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Prendre une photo</Text>
                <Text style={styles.optionSubtitle}>Utiliser votre appareil photo</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                onSelect('library');
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, styles.galleryIconBg]}>
                <Ionicons name="images" size={24} color="white" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Galerie photos</Text>
                <Text style={styles.optionSubtitle}>Choisir depuis votre bibliothèque</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
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
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    sheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 12,
      paddingHorizontal: 24,
      paddingBottom: 40,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 24,
      opacity: 0.5,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: '800',
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      marginTop: 4,
    },
    optionsContainer: {
      gap: 12,
      marginBottom: 24,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    cameraIconBg: {
      backgroundColor: '#4285F4',
    },
    galleryIconBg: {
      backgroundColor: '#34C759',
    },
    optionTextContainer: {
      flex: 1,
    },
    optionTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    optionSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    cancelButton: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    cancelButtonText: {
      color: theme.colors.accent,
      fontSize: 16,
      fontWeight: '700',
    },
  });
