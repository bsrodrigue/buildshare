import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DownloadService } from '@/libs/download/DownloadService';
import { DownloadItem, useDownloadStore } from '@/libs/download/store';
import { Filesystem } from '@/libs/fs';
import { createLogger } from '@/libs/log';

const logger = createLogger('DownloadsScreen');

const statusLabel: Record<DownloadItem['status'], string> = {
  pending: 'En attente',
  downloading: 'Téléchargement...',
  completed: 'Terminé',
  failed: 'Échec',
  paused: 'En pause (non supporté)',
};

function DownloadRow({ item }: { item: DownloadItem }) {
  const theme = useTheme();

  const icon =
    item.status === 'completed'
      ? 'check-circle'
      : item.status === 'failed'
        ? 'alert-circle'
        : item.status === 'paused'
          ? 'pause-circle'
          : 'download-circle';

  const iconColor =
    item.status === 'completed'
      ? theme.colors.primary
      : item.status === 'failed'
        ? theme.colors.error
        : theme.colors.onSurfaceVariant;

  return (
    <Surface style={styles.row} elevation={1}>
      <View style={styles.rowTop}>
        <IconButton icon={icon} size={28} iconColor={iconColor} />
        <View style={styles.rowInfo}>
          <Text variant="bodyMedium" numberOfLines={1} style={styles.rowName}>
            {item.fileName}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {statusLabel[item.status]}
            {item.totalBytes > 0
              ? ` — ${Filesystem.formatBytes(item.downloadedBytes)} / ${Filesystem.formatBytes(item.totalBytes)}`
              : ''}
          </Text>
          <Text
            variant="labelSmall"
            numberOfLines={1}
            style={[styles.url, { color: theme.colors.onSurfaceVariant }]}
          >
            {item.url}
          </Text>
        </View>
        {item.status === 'failed' && (
          <IconButton
            icon="refresh"
            size={20}
            onPress={() => {
              logger.info(`Retry ${item.fileName} — ${item.url}`);
              void DownloadService.retry(item.id);
            }}
          />
        )}
        {item.status === 'completed' && item.fileUri && (
          <IconButton
            icon="share-variant"
            size={20}
            onPress={() => {
              const uri = item.fileUri;
              if (!uri) return;
              Sharing.shareAsync(uri)
                .then(() => {
                  logger.info(`Share ${item.fileName} — ${uri}`);
                })
                .catch((e) => {
                  logger.warn(`Share failed: ${e}`);
                });
            }}
          />
        )}
        <IconButton
          icon="close"
          size={20}
          onPress={() => {
            logger.info(`Cancel ${item.fileName} — ${item.url}`);
            DownloadService.cancel(item.id);
          }}
        />
      </View>
      {item.status === 'downloading' && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.primary }]} />
        </View>
      )}
    </Surface>
  );
}

export default function DownloadsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const items = useDownloadStore((s) => s.items);
  const clearCompleted = useDownloadStore((s) => s.clearCompleted);
  const hasCompleted = items.some((i) => i.status === 'completed');

  React.useEffect(() => {
    logger.debug(`Screen mounted, ${items.length} downloads`);
  }, [items.length]);

  const handleClearCompleted = React.useCallback(() => {
    logger.info('Clear completed downloads');
    clearCompleted();
  }, [clearCompleted]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            backgroundColor: theme.colors.surface,
          },
        ]}
        elevation={0}
      >
        <View style={styles.headerRow}>
          <IconButton
            icon="arrow-left"
            iconColor={theme.colors.onSurfaceVariant}
            onPress={() => {
              logger.debug('Navigate back');
              router.back();
            }}
          />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
            {t('screens.downloads.title')}
          </Text>
          <View style={styles.headerSpacer} />
          {hasCompleted && (
            <Button mode="text" onPress={handleClearCompleted} compact>
              {t('screens.downloads.clear')}
            </Button>
          )}
        </View>
      </Surface>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DownloadRow item={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('screens.downloads.empty')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 4, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerSpacer: { flex: 1 },
  list: { padding: 16, gap: 8 },
  row: { borderRadius: 16, padding: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  rowInfo: { flex: 1, marginLeft: 4 },
  rowName: { fontWeight: '600' },
  url: { opacity: 0.6 },
  progressContainer: { marginHorizontal: 12, marginBottom: 8, borderRadius: 4, height: 4 },
  progressBar: { borderRadius: 4, height: 4 },
  empty: { alignItems: 'center', paddingTop: 80 },
});
