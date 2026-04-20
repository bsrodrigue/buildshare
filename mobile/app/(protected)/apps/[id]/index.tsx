import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Linking, RefreshControl, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Chip,
  FAB,
  IconButton,
  List,
  Menu,
  Surface,
  Text,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { env } from '@/libs/env';
import { toast } from '@/libs/notification/toast';
import { formatTimelineDate } from '@/libs/utils/date';
import { useApplication, useDeleteApplication, useReleases } from '@/modules/binaries/api/hooks';
import { Release, ReleaseArtifact } from '@/modules/binaries/api/schemas';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

export default function AppDetailScreen() {
  const { id, projectId } = useLocalSearchParams();
  const applicationId = parseInt(id as string, 10);
  const resolvedProjectId = projectId ? parseInt(projectId as string, 10) : undefined;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const {
    data: releases,
    isLoading: isReleasesLoading,
    isRefetching,
    refetch,
  } = useReleases(applicationId);
  const { data: application, isLoading: isAppLoading } = useApplication(applicationId);

  const deleteApplication = useDeleteApplication();
  const [menuVisible, setMenuVisible] = React.useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleDelete = () => {
    closeMenu();
    Alert.alert(
      t('screens.release_list.delete_confirm_title'),
      t('screens.release_list.delete_confirm_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            if (!resolvedProjectId) return;
            deleteApplication.mutate(
              { id: applicationId, projectId: resolvedProjectId },
              {
                onSuccess: () => {
                  toast.success(t('screens.release_list.delete_success'));
                  router.replace({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    pathname: `/(protected)/projects/${resolvedProjectId}` as any,
                  });
                },
                onError: (error) => {
                  toast.error(t('screens.release_list.delete_error'), error.message);
                },
              },
            );
          },
        },
      ],
    );
  };

  const handleDownload = (artifact: ReleaseArtifact) => {
    if (artifact.file) {
      let url = artifact.file;
      if (!url.startsWith('http')) {
        const baseUrl = env.API_URL.endsWith('/') ? env.API_URL.slice(0, -1) : env.API_URL;
        const filePath = url.startsWith('/') ? url : `/${url}`;
        url = `${baseUrl}${filePath}`;
      }
      void Linking.openURL(url);
    }
  };

  const renderReleaseItem = ({ item, index }: { item: Release; index: number }) => {
    const cardColors = [
      {
        bg: theme.colors.primaryContainer,
        onBg: theme.colors.onPrimaryContainer,
        icon: 'rocket-launch',
      },
      {
        bg: theme.colors.secondaryContainer,
        onBg: theme.colors.onSecondaryContainer,
        icon: 'auto-fix',
      },
      {
        bg: theme.colors.tertiaryContainer,
        onBg: theme.colors.onTertiaryContainer,
        icon: 'bottle-tonic-plus',
      },
      { bg: theme.colors.surfaceVariant, onBg: theme.colors.onSurfaceVariant, icon: 'cube-send' },
    ];
    const cardTheme = cardColors[index % cardColors.length];

    return (
      <View style={styles.timelineItem}>
        {/* Timeline Left: Minimal Gutter */}
        <View style={styles.timelineLeftColumn}>
          <View
            style={[
              styles.timelineLine,
              { backgroundColor: theme.colors.outline },
              index === 0 && styles.timelineLineFirst,
              index === (releases?.length || 0) - 1 && styles.timelineLineLast,
            ]}
          />
          <View
            style={[
              styles.timelineDot,
              { borderColor: theme.colors.primary, backgroundColor: theme.colors.surface },
            ]}
          />
        </View>

        <View style={styles.timelineRight}>
          <Surface
            style={[styles.releaseCard, { backgroundColor: cardTheme.bg }, theme.shadows.soft]}
            elevation={1}
          >
            <View style={styles.releaseHeader}>
              <View style={styles.headerLeft}>
                <View
                  style={[
                    styles.headerIconCircle,
                    { backgroundColor: theme.colors.surface + '40' },
                  ]}
                >
                  <IconButton
                    icon={cardTheme.icon}
                    size={20}
                    iconColor={cardTheme.onBg}
                    style={styles.headerIcon}
                  />
                </View>
                <View style={styles.headerTitleContainer}>
                  <Text variant="titleMedium" style={[styles.versionId, { color: cardTheme.onBg }]}>
                    {item.version_id}
                  </Text>
                  <Text
                    variant="labelSmall"
                    style={[styles.buildId, { color: cardTheme.onBg }, styles.opacity70]}
                  >
                    {formatTimelineDate(item.created_at, i18n.language)} •{' '}
                    {t('screens.release_list.build_info', {
                      code: item.version_code,
                      date: '',
                    }).replace(' • ', '')}
                  </Text>
                </View>
              </View>
              <Chip
                compact
                style={[styles.statusChip, { backgroundColor: theme.colors.surface + '60' }]}
                textStyle={[styles.statusChipText, { color: cardTheme.onBg }]}
              >
                {t('screens.release_list.stable_chip')}
              </Chip>
            </View>

            {item.release_notes && (
              <Text variant="bodyMedium" style={[styles.notes, { color: cardTheme.onBg }]}>
                {item.release_notes}
              </Text>
            )}

            <View style={[styles.divider, { backgroundColor: cardTheme.onBg + '20' }]} />

            <Text
              variant="labelLarge"
              style={[styles.artifactTitle, { color: cardTheme.onBg }, styles.opacity80]}
            >
              {t('screens.release_list.artifact_title')}
            </Text>

            {item.artifacts?.map((artifact: ReleaseArtifact) => (
              <List.Item
                key={artifact.id}
                title={artifact.architecture || 'Universal'}
                description={`${artifact.file_size_display || 'N/A'} • ${String(artifact.id).substring(0, 8)}`}
                titleStyle={[styles.artifactText, { color: cardTheme.onBg }]}
                descriptionStyle={[
                  styles.artifactSubText,
                  { color: cardTheme.onBg },
                  styles.opacity60,
                ]}
                left={(props) => (
                  <View
                    style={[
                      styles.artifactIconContainer,
                      { backgroundColor: theme.colors.surface + '40' },
                    ]}
                  >
                    <List.Icon {...props} icon="android" color="#3DDC84" style={styles.listIcon} />
                  </View>
                )}
                right={(props) => (
                  <IconButton
                    {...props}
                    icon="download"
                    mode="contained"
                    containerColor={theme.colors.surface + '80'}
                    iconColor={cardTheme.onBg}
                    size={20}
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
  };

  if (isReleasesLoading || isAppLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.outline + '20',
          },
        ]}
      >
        <View style={styles.headerLeftContainer}>
          <IconButton
            icon="arrow-left"
            iconColor={theme.colors.onSurfaceVariant}
            onPress={() => {
              void router.back();
            }}
          />
          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
            {application?.title || t('screens.release_list.title')}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <IconButton
            icon="refresh"
            iconColor={theme.colors.onSurfaceVariant}
            onPress={() => {
              void refetch();
            }}
            loading={isRefetching}
          />
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <IconButton
                icon="dots-vertical"
                iconColor={theme.colors.onSurfaceVariant}
                onPress={openMenu}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                closeMenu();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                void router.push(`/(protected)/apps/${applicationId}/edit` as any);
              }}
              title={t('screens.edit_application.title')}
              leadingIcon="pencil"
            />
            <Menu.Item
              onPress={handleDelete}
              title={t('common.delete')}
              leadingIcon="delete"
              titleStyle={{ color: theme.colors.error }}
            />
          </Menu>
        </View>
      </View>

      <FlatList
        data={releases}
        keyExtractor={(item: Release) => item.id.toString()}
        renderItem={renderReleaseItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge">{t('screens.release_list.empty_title')}</Text>
          </View>
        }
      />

      {resolvedProjectId && (
        <FAB
          icon="plus"
          label={t('screens.release_list.fab_new_release')}
          variant="primary"
          mode="flat"
          style={[styles.fab, { bottom: insets.bottom + 16 }]}
          onPress={() => {
            void router.push({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              pathname: `/(protected)/projects/${resolvedProjectId}/upload` as any,
              params: { appId: applicationId.toString() },
            });
          }}
        />
      )}
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
  headerLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    flexShrink: 1,
  },
  statusChipText: { fontWeight: '600', fontSize: 10 },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeftColumn: {
    width: 24,
    alignItems: 'center',
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
  },
  timelineLineFirst: {
    marginTop: 30,
  },
  timelineLineLast: {
    height: 30,
    flex: 0,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    position: 'absolute',
    top: 24,
    zIndex: 1,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: 32,
    paddingLeft: 4,
  },
  releaseCard: {
    borderRadius: 24,
    padding: 20,
  },
  releaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerIcon: {
    margin: 0,
  },
  headerTitleContainer: {
    flex: 1,
  },
  versionId: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  buildId: {
    marginTop: 1,
  },
  statusChip: {
    borderRadius: 12,
  },
  notes: {
    marginBottom: 20,
    lineHeight: 22,
    opacity: 0.9,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  artifactTitle: {
    marginBottom: 12,
  },
  artifactItem: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  artifactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  artifactText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  listIcon: {
    margin: 0,
  },
  artifactSubText: {
    fontSize: 12,
  },
  opacity60: {
    opacity: 0.6,
  },
  opacity70: {
    opacity: 0.7,
  },
  opacity80: {
    opacity: 0.8,
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
  },
});
