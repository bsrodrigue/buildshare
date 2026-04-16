import { Ionicons } from '@expo/vector-icons';
import * as ExpoDocumentPicker from 'expo-document-picker';
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Filesystem, PickedDocument } from '@/libs/fs';
import type { Theme } from '@/modules/shared/theme';
import { toAlpha } from '@/modules/shared/theme/colors';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

export type DocumentPickerValue = PickedDocument[];

export type DocumentPickerItem = {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
};

export type DocumentPickerOnChange = (documents: DocumentPickerValue) => void;

export type DocumentPickerProps = {
  value?: DocumentPickerValue;
  onChange: DocumentPickerOnChange;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  allowMultiple?: boolean;
  type?: string | string[];
  copyToCacheDirectory?: boolean;
  maxVisibleItems?: number;
};

export const DocumentPicker = ({
  value,
  onChange,
  placeholder = 'Choisir un fichier',
  disabled,
  loading,
  allowMultiple = false,
  type = '*/*',
  copyToCacheDirectory = true,
  maxVisibleItems = 3,
}: DocumentPickerProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const documents = useMemo(() => value ?? [], [value]);

  const pick = useCallback(async () => {
    if (disabled || loading) return;

    const result = await ExpoDocumentPicker.getDocumentAsync({
      type,
      multiple: allowMultiple,
      copyToCacheDirectory,
    });

    if (result.canceled) return;

    const assets = result.assets ?? [];
    if (assets.length === 0) return;

    if (allowMultiple) {
      onChange(assets);
    } else {
      onChange([assets[0]]);
    }
  }, [allowMultiple, copyToCacheDirectory, disabled, loading, onChange, type]);

  const clear = useCallback(() => {
    if (disabled || loading) return;
    onChange([]);
  }, [disabled, loading, onChange]);

  const removeAtIndex = useCallback(
    (index: number) => {
      if (disabled || loading) return;
      if (index < 0 || index >= documents.length) return;

      const next = documents.filter((_, i) => i !== index);
      onChange(next);
    },
    [disabled, documents, loading, onChange],
  );

  const mainLabel = useMemo(() => {
    if (documents.length === 0) return placeholder;
    if (documents.length === 1) return Filesystem.getFileName(documents[0]);
    return `${documents.length} fichiers`;
  }, [documents, placeholder]);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.pickButton, (disabled || loading) && styles.pickButtonDisabled]}
          onPress={pick}
          disabled={disabled || loading}
          accessibilityRole="button"
          accessibilityLabel={placeholder}
        >
          <Text
            style={[styles.pickButtonText, documents.length > 0 && styles.pickButtonTextActive]}
            numberOfLines={1}
          >
            {mainLabel}
          </Text>

          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.text} />
          ) : (
            <Ionicons name="attach" size={20} color={theme.colors.textSecondary} />
          )}
        </TouchableOpacity>

        {documents.length > 0 && !disabled && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clear}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Supprimer les fichiers"
          >
            <Ionicons name="close" size={18} color={theme.colors.textOnPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {documents.length > 0 && (
        <View style={styles.previewList}>
          {documents.slice(0, maxVisibleItems).map((doc, index) => (
            <DocumentRow
              key={`${doc.uri}-${doc.name}-${index}`}
              doc={doc}
              onRemove={disabled || loading ? undefined : () => removeAtIndex(index)}
            />
          ))}

          {documents.length > maxVisibleItems && (
            <Text style={styles.moreText}>{`+${documents.length - maxVisibleItems} autres`}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const DocumentRow = ({ doc, onRemove }: { doc: PickedDocument; onRemove?: () => void }) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isImage = Filesystem.isImage(doc);
  const name = Filesystem.getFileName(doc);

  const meta = useMemo(() => {
    const size = typeof doc.size === 'number' ? Filesystem.formatBytes(doc.size) : null;
    const mime = doc.mimeType ?? null;
    if (size && mime) return `${size} · ${mime}`;
    if (size) return size;
    if (mime) return mime;
    return '';
  }, [doc.mimeType, doc.size]);

  return (
    <View style={styles.itemRow}>
      {isImage ? (
        <Image source={{ uri: doc.uri }} style={styles.thumbnail} />
      ) : (
        <View style={styles.fileIcon}>
          <Ionicons name="document" size={16} color={theme.colors.textOnPrimary} />
        </View>
      )}

      <View style={styles.itemTextWrap}>
        <Text style={styles.itemName} numberOfLines={1}>
          {Filesystem.truncateMiddle(name, 42)}
        </Text>
        {!!meta && (
          <Text style={styles.itemMeta} numberOfLines={1}>
            {meta}
          </Text>
        )}
      </View>

      {!!onRemove && (
        <TouchableOpacity
          style={styles.itemRemoveButton}
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel="Supprimer ce fichier"
        >
          <Ionicons name="trash" size={16} color={theme.colors.textOnPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginTop: theme.spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    pickButton: {
      backgroundColor: theme.colors.cardBackground,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.sm,
      height: 48,
      flex: 1,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pickButtonDisabled: {
      opacity: 0.7,
    },
    pickButtonText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      marginRight: theme.spacing.sm,
      flex: 1,
    },
    pickButtonTextActive: {
      color: theme.colors.text,
    },
    clearButton: {
      marginLeft: theme.spacing.xs,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.error,
    },
    previewList: {
      marginTop: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: toAlpha(theme.colors.surface, 0.5),
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    thumbnail: {
      width: 32,
      height: 32,
      borderRadius: 6,
      marginRight: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    fileIcon: {
      width: 32,
      height: 32,
      borderRadius: 6,
      marginRight: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    itemRemoveButton: {
      marginLeft: theme.spacing.sm,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.error,
    },
    itemName: {
      color: theme.colors.text,
      fontSize: theme.fontSize.xs,
      fontWeight: '600',
    },
    itemMeta: {
      marginTop: 2,
      color: theme.colors.textSecondary,
      fontSize: 10,
    },
    moreText: {
      marginTop: theme.spacing.xs,
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.xs,
    },
  });
