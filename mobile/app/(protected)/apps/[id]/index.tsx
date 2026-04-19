import { router,useLocalSearchParams } from 'expo-router';
import React from 'react';
import { FlatList, Linking,RefreshControl, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Chip,
  Divider,
  IconButton,
  List,
  Surface,
  Text,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { env } from '@/libs/env';
import { useReleases } from '@/modules/binaries/api/hooks';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

export default function AppDetailScreen() {
  const { id } = useLocalSearchParams();
  const applicationId = parseInt(id as string, 10);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const { data: releases, isLoading, isRefetching, refetch } = useReleases(applicationId);

  const handleDownload = (artifact: any) => {
    if (artifact.file) {
      let url = artifact.file;
      // Prepend API_URL if the path is relative
      if (!url.startsWith('http')) {
        const baseUrl = env.API_URL.endsWith('/') ? env.API_URL.slice(0, -1) : env.API_URL;
        const filePath = url.startsWith('/') ? url : `/${url}`;
        url = `${baseUrl}${filePath}`;
      }
      Linking.openURL(url);
    }
  };

  const renderReleaseItem = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.timelineItem}>
      {/* Timeline connector */}
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineLine, { backgroundColor: theme.colors.outline + '40' }, index === 0 && { marginTop: 24 }, index === (releases?.length || 0) - 1 && { height: '50%' }]} />
        <View style={[styles.timelineDot, { backgroundColor: theme.colors.primary }]} />
      </View>

      <View style={styles.timelineRight}>
        <Surface style={[styles.releaseCard, { backgroundColor: '#fff' }, theme.shadows.soft]}>
          <View style={styles.releaseHeader}>
            <View>
              <Text variant="titleMedium" style={[styles.versionId, { color: theme.colors.text }]}>
                Version {item.version_id}
              </Text>
              <Text variant="bodySmall" style={[styles.versionCode, { color: theme.colors.onSurfaceVariant }]}>
                Build {item.version_code} • {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Chip compact style={[styles.newChip, { backgroundColor: theme.colors.tertiaryContainer }]} textStyle={{ color: theme.colors.onTertiaryContainer }}>STABLE</Chip>
          </View>

          {item.release_notes ? (
            <Text variant="bodyMedium" style={styles.releaseNotes}>
              {item.release_notes}
            </Text>
          ) : null}

          <Divider style={styles.divider} />

          <Text variant="labelLarge" style={styles.artifactTitle}>Binary Artifacts</Text>
          
          {item.artifacts?.map((artifact: any) => (
             <List.Item
              key={artifact.id}
              title={artifact.architecture || 'Universal'}
              description={`Hash: ${artifact.hash.substring(0, 12)}...`}
              titleStyle={[styles.artifactText, { color: theme.colors.text }]}
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
                  mode="contained"
                  containerColor={theme.colors.primaryContainer}
                  iconColor={theme.colors.primary}
                  size={20}
                  onPress={() => handleDownload(artifact)} 
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
        <IconButton icon="arrow-left" iconColor={theme.colors.onSurfaceVariant} onPress={() => router.back()} />
        <View style={styles.headerTitleContainer}>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            Release History
          </Text>
        </View>
        <IconButton icon="refresh" iconColor={theme.colors.onSurfaceVariant} onPress={() => refetch()} loading={isRefetching} />
      </View>

      <FlatList
        data={releases}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderReleaseItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Avatar.Icon size={80} icon="history" style={{ backgroundColor: theme.colors.surfaceVariant }} />
            <Text variant="bodyLarge" style={styles.emptyTitle}>No releases yet.</Text>
            <Text variant="bodySmall">Process an APK to see it here.</Text>
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
    paddingHorizontal: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
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
  emptyTitle: {
    marginTop: 16,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: 30,
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
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
    paddingLeft: 8,
  },
  releaseCard: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: '#fff',
  },
  releaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  versionId: {
    fontWeight: '800',
    fontSize: 18,
  },
  versionCode: {
    opacity: 0.5,
    fontSize: 12,
    marginTop: 2,
  },
  newChip: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
  },
  newChipText: {
    color: '#2e7d32',
    fontSize: 10,
    fontWeight: '700',
  },
  releaseNotes: {
    opacity: 0.7,
    marginBottom: 16,
    lineHeight: 20,
  },
  divider: {
    marginVertical: 16,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  artifactTitle: {
    marginBottom: 12,
    opacity: 0.4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  artifactItem: {
    paddingHorizontal: 0,
    paddingVertical: 4,
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
});
