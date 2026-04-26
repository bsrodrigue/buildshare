import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Divider, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TaskJob } from '@/modules/binaries/api/schemas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobDetailSheetProps {
  job: TaskJob | null;
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Pure helpers (no theme dependency)
// ---------------------------------------------------------------------------

function getStatusIcon(status: string): string {
  switch (status) {
    case 'SUCCESS':
      return '✓';
    case 'FAILURE':
      return '✕';
    case 'STARTED':
      return '⟳';
    case 'PENDING':
      return '◷';
    case 'CANCELLED':
      return '⊘';
    default:
      return '•';
  }
}

// ---------------------------------------------------------------------------
// Row sub-component
// ---------------------------------------------------------------------------

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  const theme = useTheme();
  return (
    <View style={rowStyles.row}>
      <Text
        variant="labelMedium"
        style={[rowStyles.label, { color: theme.colors.onSurfaceVariant }]}
      >
        {label}
      </Text>
      <Text
        variant="bodyMedium"
        style={[rowStyles.value, { color: valueColor ?? theme.colors.onSurface }]}
        selectable
      >
        {value}
      </Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 16,
  },
  label: {
    flex: 1,
    opacity: 0.75,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
    lineHeight: 20,
  },
  value: {
    flex: 2,
    textAlign: 'right',
    lineHeight: 20,
  },
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const DURATION_IN = 280;
const DURATION_OUT = 220;

/**
 * MD3-style bottom sheet that shows TaskJob details.
 *
 * Uses React Native Modal + Animated — no third-party library required.
 * The sheet slides up from the bottom with a scrim; tapping the scrim or
 * pressing back dismisses it.
 */
export function JobDetailSheet({ job, onDismiss }: JobDetailSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(600)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Derive status colour from live theme colours — safe inside the component
  const getStatusColor = useCallback(
    (status: string): string => {
      switch (status) {
        case 'SUCCESS':
          return '#4CAF50';
        case 'FAILURE':
          return theme.colors.error;
        case 'STARTED':
          return theme.colors.primary;
        default:
          return theme.colors.outline;
      }
    },
    [theme.colors.error, theme.colors.primary, theme.colors.outline],
  );

  const visible = job !== null;

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: DURATION_IN,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: DURATION_IN,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const animateOut = useCallback(
    (then: () => void) => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 600,
          duration: DURATION_OUT,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: DURATION_OUT,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => then());
    },
    [opacity, translateY],
  );

  useEffect(() => {
    if (visible) {
      translateY.setValue(600);
      opacity.setValue(0);
      animateIn();
    }
  }, [visible, animateIn, opacity, translateY]);

  const handleDismiss = useCallback(() => {
    animateOut(onDismiss);
  }, [animateOut, onDismiss]);

  if (!job) return null;

  const statusColor = getStatusColor(job.status);
  const statusIcon = getStatusIcon(job.status);
  const createdAt = new Date(job.created_at).toLocaleString();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      {/* Scrim */}
      <Animated.View style={[styles.scrim, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheetWrapper,
          { paddingBottom: insets.bottom },
          { transform: [{ translateY }] },
        ]}
        pointerEvents="box-none"
      >
        <Surface style={[styles.sheet, { backgroundColor: theme.colors.surface }]} elevation={2}>
          {/* MD3 drag handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: theme.colors.onSurfaceVariant }]} />
          </View>

          {/* Status badge */}
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
              <Text style={[styles.statusIcon, { color: statusColor }]}>{statusIcon}</Text>
              <Text variant="labelLarge" style={[styles.statusLabel, { color: statusColor }]}>
                {t(`jobs.status.${job.status}`, { defaultValue: job.status_display || job.status })}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
            {job.app_title ?? t(`jobs.types.${job.type}`, { defaultValue: job.type })}
          </Text>

          <Divider style={styles.divider} />

          {/* Detail rows */}
          <DetailRow label={t('jobs.labels.job_id')} value={job.id} />
          <DetailRow
            label={t('jobs.labels.type')}
            value={t(`jobs.types.${job.type}`, { defaultValue: job.type })}
          />
          <DetailRow label={t('jobs.labels.created_at')} value={createdAt} />
          {!!job.app_title && (
            <DetailRow label={t('jobs.labels.application')} value={job.app_title} />
          )}

          {/* Error box */}
          {!!job.error_message && (
            <>
              <Divider style={styles.divider} />
              <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer }]}>
                <Text
                  variant="labelMedium"
                  style={[styles.errorLabel, { color: theme.colors.onErrorContainer }]}
                >
                  {t('jobs.labels.error')}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onErrorContainer }}
                  selectable
                >
                  {job.error_message}
                </Text>
              </View>
            </>
          )}
        </Surface>
      </Animated.View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  badgeRow: {
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusIcon: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusLabel: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  title: {
    fontWeight: '700',
    marginBottom: 20,
  },
  divider: {
    marginBottom: 8,
    opacity: 0.5,
  },
  errorBox: {
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    gap: 4,
  },
  errorLabel: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
});
