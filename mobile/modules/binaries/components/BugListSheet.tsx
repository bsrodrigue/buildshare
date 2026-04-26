import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Divider, IconButton, List, Text } from 'react-native-paper';

import { useBugs } from '@/modules/binaries/api/hooks';
import { BugReport, Release } from '@/modules/binaries/api/schemas';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

interface BugListSheetProps {
  release: Release | null;
  onDismiss: () => void;
  onSelectBug: (bug: BugReport) => void;
  onCreateBug: () => void;
}

export function BugListSheet({ release, onDismiss, onSelectBug, onCreateBug }: BugListSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['60%', '90%'], []);

  const { data: bugs, isLoading, refetch } = useBugs(release?.id ?? 0);

  const visible = release !== null;

  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
      void refetch();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible, refetch]);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return theme.colors.outline;
      case 'OPENED':
        return theme.colors.error;
      case 'RESOLVED':
        return '#4CAF50';
      case 'REOPENED':
        return theme.colors.error;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const renderBug = ({ item }: { item: BugReport }) => (
    <List.Item
      title={`Bug #${item.id.slice(0, 8)}`}
      description={`${item.reporter.first_name || item.reporter.email} • ${item.description.slice(0, 30)}${item.description.length > 30 ? '...' : ''}`}
      onPress={() => onSelectBug(item)}
      left={(props) => <List.Icon {...props} icon="bug" color={getStatusColor(item.status)} />}
      right={(props) => (
        <View style={styles.rightAction}>
          <Text
            variant="labelSmall"
            style={[styles.statusBadge, { color: getStatusColor(item.status) }]}
          >
            {item.status_display.toUpperCase()}
          </Text>
          <List.Icon {...props} icon="chevron-right" />
        </View>
      )}
    />
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={[
        styles.handleIndicator,
        { backgroundColor: theme.colors.onSurfaceVariant },
      ]}
    >
      <BottomSheetView style={styles.sheetContent}>
        <View style={styles.header}>
          <View>
            <Text variant="titleLarge" style={styles.title}>
              {t('screens.bugs.title')}
            </Text>
            {release && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                v{release.version_id} ({release.version_code})
              </Text>
            )}
          </View>
          <IconButton
            icon="close"
            size={20}
            onPress={() => bottomSheetModalRef.current?.dismiss()}
          />
        </View>

        <Divider />

        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : (
            <BottomSheetFlatList
              data={bugs}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderBug}
              ItemSeparatorComponent={() => <Divider />}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {t('screens.bugs.empty')}
                  </Text>
                </View>
              }
            />
          )}
        </View>

        <View style={styles.footer}>
          <Button mode="contained" icon="plus" onPress={onCreateBug} style={styles.createButton}>
            {t('screens.bugs.report_button')}
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  title: {
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    fontWeight: 'bold',
    fontSize: 10,
    marginRight: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    opacity: 0.6,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  handleIndicator: {
    opacity: 0.4,
  },
  createButton: {
    borderRadius: 8,
  },
});
