import { Dimensions, StyleSheet } from 'react-native';

import type { Theme } from '@/modules/shared/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
export const MODAL_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    avatarContainer: {
      position: 'relative',
      marginRight: theme.spacing.md,
    },

    content: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: 20,
    },
    card: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      ...(theme.colorScheme === 'light'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 15,
            elevation: 2,
          }
        : {}),
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    avatar: {
      borderWidth: 0,
    },
    sectionHeader: {
      marginBottom: theme.spacing.md,
      opacity: 0.6,
    },
    subSectionTitle: {
      color: theme.colors.text,
      fontSize: 10,
      fontWeight: 'bold',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    profileName: {
      color: theme.colors.text,
      fontSize: theme.fontSize.base,
      fontWeight: 'bold',
    },
    editHint: {
      color: theme.colors.accent,
      fontSize: 10,
      marginTop: 2,
    },
    buttonWrapper: {
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    actionButton: {
      width: '60%',
      paddingVertical: 12,
    },
    sectionTitleRow: {
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSize.base,
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    highlight: {
      color: theme.colors.accent,
    },
    bodySmall: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      textAlign: 'center',
      marginTop: theme.spacing.sm,
    },
    // Modal-specific styles (if still needed in the main view or shared)
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'flex-end',
    },
    keyboardAvoidingContainer: {
      width: '100%',
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: MODAL_MAX_HEIGHT,
      ...(theme.colorScheme === 'light' ? { backgroundColor: '#fff' } : {}),
    },
    sheetContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
    },
  });

export type UserAccountStyles = ReturnType<typeof createStyles>;
