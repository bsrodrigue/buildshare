import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { FlatList, Linking, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Chip, IconButton, List, Surface, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { env } from '@/libs/env';
import { useReleases } from '@/modules/binaries/api/hooks';
import { Release, ReleaseArtifact } from '@/modules/binaries/api/schemas';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

export default function AppDetailScreen() {
  const { id } = useLocalSearchParams();
  const applicationId = parseInt(id as string, 10);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const { data: releases, isLoading, isRefetching, refetch } = useReleases(applicationId);

  const handleDownload = (artifact: ReleaseArtifact) => {
    if (artifact.file) {
      let url = artifact.file;
      // Prepend API_URL if the path is relative
      if (!url.startsWith('http')) {
        const baseUrl = env.API_URL.endsWith('/') ? env.API_URL.slice(0, -1) : env.API_URL;
        const filePath = url.startsWith('/') ? url : `/${url}`;
        url = `${baseUrl}${filePath}`;
      }
      void Linking.openURL(url);
    }
  };

  const renderReleaseItem = ({ item, index }: { item: Release; index: number }) => (
    <View style={styles.timelineItem}>
      {/* Timeline connector */}
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineLine, { backgroundColor: theme.colors.outline + '40' }, index === 0 && styles.timelineLineFirst, index === (releases?.length || 0) - 1 && styles.timelineLineLast]} />
        <View style={[styles.timelineDot, { backgroundColor: theme.colors.primary }]} />
      </View>

      <View style={styles.timelineRight}>
        <Surface style={[styles.releaseCard, styles.whiteBackground, theme.shadows.soft]}>
          <View style={styles.releaseHeader}>
            <View>
              <Text variant="titleMedium" style={[styles.versionId, { color: theme.colors.text }]}>
                {item.version_id}
              </Text>
              <Text variant="bodySmall" style={styles.buildId}>
                Build {item.version_code} • {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Chip 
              compact 
              style={[styles.statusChip, { backgroundColor: theme.colors.primaryContainer }]}
              textStyle={styles.statusChipText}
            >
              Stable
            </Chip>
          </View>

          {item.release_notes && (
            <Text variant="bodyMedium" style={styles.notes}>
              {item.release_notes}
            </Text>
          )}

          <View style={styles.divider} />

          <Text variant="labelLarge" style={styles.artifactTitle}>Binary Artifacts</Text>
          
          {item.artifacts?.map((artifact: ReleaseArtifact) => (
             <List.Item
              key={artifact.id}
              title={artifact.architecture || 'Universal'}
              description={`${artifact.file_size_display || 'N/A'} • ${String(artifact.id).substring(0, 8)}`}
              titleStyle={styles.artifactText}
              descriptionStyle={styles.artifactSubText}
              left={(props) => (
                <View style={styles.artifactIconContainer}>
                  <List.Icon {...props} icon="android" color="#3DDC84" style={styles.listIcon} />
                </View>
              )}
              right={(props) => (
                <IconButton 
                  {...props} 
                  icon="download" 
                  mode="contained-tonal"
                  onPress={() => {
                    handleDownload(artifact);
                  }} 
                />
              )}
              style={styles.artifactItem}
            />
          ))}
        </Surface>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline + '20' }]}>
        <IconButton 
          icon="arrow-left" 
          iconColor={theme.colors.onSurfaceVariant} 
          onPress={() => {
            void router.back();
          }} 
        />
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
          Releases
        </Text>
        <IconButton 
          icon="refresh" 
          iconColor={theme.colors.onSurfaceVariant} 
          onPress={() => {
            void refetch();
          }} 
          loading={isRefetching} 
        />
      </View>

      <FlatList
        data={releases}
        keyExtractor={(item: Release) => item.id.toString()}
        renderItem={renderReleaseItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge">Aucune release.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: 'bold',
  },
  statusChipText: { color: '#000', fontSize: 10 }, 
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 120,
  },
  timelineLeft: {
    width: 40,
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
  },
  timelineLineFirst: {
    marginTop: 24,
  },
  timelineLineLast: {
    height: '50%',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    top: 24,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: 24,
  },
  releaseCard: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: '#fff',
  },
  whiteBackground: {
    backgroundColor: '#ffffff',
  },
  releaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  versionId: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  buildId: {
    opacity: 0.5,
    marginTop: 2,
  },
  statusChip: {
    borderRadius: 8,
  },
  notes: {
    opacity: 0.8,
    marginBottom: 16,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#00000010',
    marginBottom: 16,
  },
  artifactTitle: {
    marginBottom: 8,
    opacity: 0.7,
  },
  artifactItem: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  artifactIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#3DDC8420',
  },
  artifactText: {
    fontWeight: '600',
    fontSize: 14,
  },
  listIcon: {
    margin: 0,
  },
  artifactSubText: {
    fontSize: 11,
    opacity: 0.5,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    marginTop: 100,
    alignItems: 'center',
    opacity: 0.5,
  },
});
