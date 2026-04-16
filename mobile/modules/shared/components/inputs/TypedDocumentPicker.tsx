import { Ionicons } from '@expo/vector-icons';
import * as ExpoDocumentPicker from 'expo-document-picker';
import React, { useCallback, useMemo, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Filesystem, PickedDocument } from '@/libs/fs';
import type { ApplicationDocumentType } from '@/modules/jobs/types';
import type { Theme } from '@/modules/shared/theme';
import { toAlpha } from '@/modules/shared/theme/colors';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

// ─────────────────────────────────────────────────────────────────────────────
// Document type options
// ─────────────────────────────────────────────────────────────────────────────

type DocTypeOption = {
  value: ApplicationDocumentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const DOCUMENT_TYPE_OPTIONS: DocTypeOption[] = [
  { value: 'resume', label: 'Curriculum Vitae (CV)', icon: 'document-text' },
  { value: 'cover_letter', label: 'Lettre de motivation', icon: 'mail' },
  { value: 'diploma', label: 'Diplôme', icon: 'school' },
  { value: 'certificate', label: 'Certificat', icon: 'ribbon' },
  { value: 'portfolio', label: 'Portfolio', icon: 'briefcase' },
  { value: 'id_card', label: "Pièce d'identité", icon: 'card' },
  {
    value: 'recommendation',
    label: 'Lettre de recommandation',
    icon: 'people',
  },
  { value: 'other', label: 'Autre document', icon: 'folder-open' },
];

const DOC_TYPE_LABEL_MAP = new Map(DOCUMENT_TYPE_OPTIONS.map((opt) => [opt.value, opt.label]));

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type TypedDocument = {
  file: PickedDocument;
  type: ApplicationDocumentType;
};

export type TypedDocumentPickerProps = {
  /** Current list of typed documents */
  value: TypedDocument[];
  /** Called whenever the list changes (add, remove, or type change) */
  onChange: (documents: TypedDocument[]) => void;
  /** Maximum number of documents allowed (default: 10) */
  maxDocuments?: number;
  /** Whether the component is in an error state */
  hasError?: boolean;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Placeholder text for the add button */
  placeholder?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const TypedDocumentPicker = ({
  value,
  onChange,
  maxDocuments = 10,
  hasError = false,
  disabled = false,
  placeholder = 'Ajouter un document',
}: TypedDocumentPickerProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  // Index of the document whose type is being picked (-1 = none)
  const [typePickerIndex, setTypePickerIndex] = useState(-1);

  const canAdd = value.length < maxDocuments;

  // ── Pick a file ─────────────────────────────────────────────────────────

  const pickFile = useCallback(async () => {
    if (disabled || !canAdd) return;

    const result = await ExpoDocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.length) return;

    const file = result.assets[0];

    // Auto-detect a sensible default type based on the first slot
    const defaultType: ApplicationDocumentType = value.length === 0 ? 'resume' : 'other';

    const newDoc: TypedDocument = { file, type: defaultType };
    onChange([...value, newDoc]);
  }, [canAdd, disabled, onChange, value]);

  // ── Remove a document ───────────────────────────────────────────────────

  const removeAt = useCallback(
    (index: number) => {
      if (disabled) return;
      onChange(value.filter((_, i) => i !== index));
    },
    [disabled, onChange, value],
  );

  // ── Change a document's type ────────────────────────────────────────────

  const changeTypeAt = useCallback(
    (index: number, type: ApplicationDocumentType) => {
      if (disabled) return;
      const next = value.map((doc, i) => (i === index ? { ...doc, type } : doc));
      onChange(next);
    },
    [disabled, onChange, value],
  );

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={styles.label}>
        Documents ({value.length}/{maxDocuments})
      </Text>

      {/* Document rows */}
      {value.map((doc, index) => (
        <DocumentRow
          key={`${doc.file.uri}-${index}`}
          doc={doc}
          disabled={disabled}
          onRemove={() => removeAt(index)}
          onTypePress={() => setTypePickerIndex(index)}
        />
      ))}

      {/* Add button */}
      {canAdd && (
        <TouchableOpacity
          style={[
            styles.addButton,
            hasError && styles.addButtonError,
            disabled && styles.addButtonDisabled,
          ]}
          onPress={pickFile}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={hasError ? theme.colors.error : theme.colors.accent}
          />
          <Text style={[styles.addButtonText, hasError && styles.addButtonTextError]}>
            {placeholder}
          </Text>
        </TouchableOpacity>
      )}

      {/* Max reached hint */}
      {!canAdd && <Text style={styles.maxReachedText}>Nombre maximum de documents atteint</Text>}

      {/* Type picker bottom sheet */}
      <TypePickerSheet
        visible={typePickerIndex >= 0}
        selected={typePickerIndex >= 0 ? value[typePickerIndex]?.type : undefined}
        onSelect={(type) => {
          if (typePickerIndex >= 0) {
            changeTypeAt(typePickerIndex, type);
          }
          setTypePickerIndex(-1);
        }}
        onClose={() => setTypePickerIndex(-1)}
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DocumentRow – one file + its type badge
// ─────────────────────────────────────────────────────────────────────────────

interface DocumentRowProps {
  doc: TypedDocument;
  disabled: boolean;
  onRemove: () => void;
  onTypePress: () => void;
}

const DocumentRow = React.memo(({ doc, disabled, onRemove, onTypePress }: DocumentRowProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isImage = Filesystem.isImage(doc.file);
  const name = Filesystem.getFileName(doc.file);
  const typeLabel = DOC_TYPE_LABEL_MAP.get(doc.type) ?? doc.type;

  const isTooBig = typeof doc.file.size === 'number' && doc.file.size > 10 * 1024 * 1024;

  const meta = useMemo(() => {
    const size = typeof doc.file.size === 'number' ? Filesystem.formatBytes(doc.file.size) : null;
    return size ?? '';
  }, [doc.file.size]);

  return (
    <View style={[styles.docRow, isTooBig && styles.docRowError]}>
      {/* Thumbnail / icon */}
      {isImage ? (
        <Image source={{ uri: doc.file.uri }} style={styles.thumbnail} />
      ) : (
        <View style={styles.fileIcon}>
          <Ionicons name="document" size={16} color={theme.colors.textOnPrimary} />
        </View>
      )}

      {/* File info + type badge */}
      <View style={styles.docInfo}>
        <Text style={styles.docName} numberOfLines={1}>
          {Filesystem.truncateMiddle(name, 36)}
        </Text>

        {!!meta && (
          <Text style={[styles.docMeta, isTooBig && styles.docMetaError]} numberOfLines={1}>
            {meta} {isTooBig ? '(Trop volumineux)' : ''}
          </Text>
        )}

        {/* Type badge (tappable) */}
        <TouchableOpacity
          style={styles.typeBadge}
          onPress={onTypePress}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={styles.typeBadgeText} numberOfLines={1}>
            {typeLabel}
          </Text>
          <Ionicons name="chevron-down" size={12} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Remove button */}
      {!disabled && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel="Supprimer ce document"
        >
          <Ionicons name="trash" size={16} color={theme.colors.textOnPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
});

DocumentRow.displayName = 'DocumentRow';

// ─────────────────────────────────────────────────────────────────────────────
// TypePickerSheet – bottom sheet for choosing a document type
// ─────────────────────────────────────────────────────────────────────────────

interface TypePickerSheetProps {
  visible: boolean;
  selected?: ApplicationDocumentType;
  onSelect: (type: ApplicationDocumentType) => void;
  onClose: () => void;
}

const TypePickerSheet = ({ visible, selected, onSelect, onClose }: TypePickerSheetProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Type de document</Text>

          <View style={styles.optionsList}>
            {DOCUMENT_TYPE_OPTIONS.map((opt) => {
              const isActive = opt.value === selected;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionRow, isActive && styles.optionRowActive]}
                  onPress={() => onSelect(opt.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={isActive ? theme.colors.accent : theme.colors.textSecondary}
                    style={styles.optionIcon}
                  />
                  <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                    {opt.label}
                  </Text>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // Container
    container: {
      marginTop: theme.spacing.xs,
    },
    label: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.medium,
      marginBottom: theme.spacing.sm,
    },

    // Document rows
    docRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    thumbnail: {
      width: 36,
      height: 36,
      borderRadius: 6,
      marginRight: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    fileIcon: {
      width: 36,
      height: 36,
      borderRadius: 6,
      marginRight: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    docInfo: {
      flex: 1,
      minWidth: 0,
    },
    docName: {
      color: theme.colors.text,
      fontSize: theme.fontSize.xs,
      fontWeight: '600',
    },
    docMeta: {
      marginTop: 2,
      color: theme.colors.textSecondary,
      fontSize: 10,
    },

    // Type badge
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: toAlpha(theme.colors.accent, 0.12),
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 3,
      marginTop: 4,
      gap: 4,
    },
    typeBadgeText: {
      color: theme.colors.accent,
      fontSize: 10,
      fontWeight: '600',
    },

    // Remove button
    removeButton: {
      marginLeft: theme.spacing.sm,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.error,
    },

    // Add button
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      borderWidth: 1,
      borderColor: toAlpha(theme.colors.accent, 0.3),
      borderStyle: 'dashed',
      borderRadius: theme.borderRadius.sm,
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
    },
    addButtonDisabled: {
      opacity: 0.5,
    },
    addButtonText: {
      color: theme.colors.accent,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.medium,
    },
    maxReachedText: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.xs,
      textAlign: 'center',
      marginTop: theme.spacing.xs,
    },

    // Bottom sheet
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
      backgroundColor: theme.colors.border,
      borderRadius: 3,
      alignSelf: 'center',
      marginBottom: theme.spacing.lg,
    },
    sheetTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
    },
    optionsList: {
      gap: 4,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.sm,
    },
    optionRowActive: {
      backgroundColor: toAlpha(theme.colors.accent, 0.1),
    },
    optionIcon: {
      marginRight: theme.spacing.md,
    },
    optionLabel: {
      flex: 1,
      fontSize: theme.fontSize.base,
      color: theme.colors.textSecondary,
      fontWeight: theme.fontWeight.medium,
    },
    optionLabelActive: {
      color: theme.colors.accent,
      fontWeight: theme.fontWeight.bold,
    },
    // Error variations
    addButtonError: {
      borderColor: theme.colors.error,
      backgroundColor: toAlpha(theme.colors.error, 0.05),
    },
    addButtonTextError: {
      color: theme.colors.error,
    },
    docRowError: {
      borderColor: theme.colors.error,
      backgroundColor: toAlpha(theme.colors.error, 0.02),
    },
    docMetaError: {
      color: theme.colors.error,
      fontWeight: 'bold',
    },
  });
