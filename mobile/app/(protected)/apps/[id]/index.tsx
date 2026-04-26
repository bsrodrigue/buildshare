import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { ActivityIndicator, FAB, IconButton, Menu, Portal, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { env } from '@/libs/env';
import { toast } from '@/libs/notification/toast';
import {
  useApplication,
  useDeleteApplication,
  useProjectTags,
  useReleases,
} from '@/modules/binaries/api/hooks';
import { BugReport, Release, ReleaseArtifact } from '@/modules/binaries/api/schemas';
import { BugCreationSheet } from '@/modules/binaries/components/BugCreationSheet';
import { BugListSheet } from '@/modules/binaries/components/BugListSheet';
import { BugReportSheet } from '@/modules/binaries/components/BugReportSheet';
import { ReleaseCard } from '@/modules/binaries/components/ReleaseCard';
import { ReleaseTagsSheet } from '@/modules/binaries/components/ReleaseTagsSheet';
import { ConfirmDialog } from '@/modules/shared/components/ConfirmDialog';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

export default function AppDetailScreen() {
  const { id, projectId } = useLocalSearchParams();
  const applicationId = parseInt(id as string, 10);
  const resolvedProjectId = projectId ? parseInt(projectId as string, 10) : undefined;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const {
    data: releases,
    isLoading: isReleasesLoading,
    isRefetching,
    refetch,
  } = useReleases(applicationId);
  const { data: application, isLoading: isAppLoading } = useApplication(applicationId);

  const deleteApplication = useDeleteApplication();
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [deleteVisible, setDeleteVisible] = React.useState(false);
  const [selectedReleaseForBugs, setSelectedReleaseForBugs] = React.useState<Release | null>(null);
  const [isBugCreationVisible, setIsBugCreationVisible] = React.useState(false);
  const [selectedBug, setSelectedBug] = React.useState<BugReport | null>(null);
  const [selectedReleaseForTags, setSelectedReleaseForTags] = React.useState<Release | null>(null);
  const { data: projectTags } = useProjectTags(resolvedProjectId || 0);
  const [selectedTagId, setSelectedTagId] = React.useState<number | null>(null);

  const activeReleaseForTags = React.useMemo(() => {
    if (!selectedReleaseForTags) return null;
    return releases?.find((r) => r.id === selectedReleaseForTags.id) || selectedReleaseForTags;
  }, [releases, selectedReleaseForTags]);

  const activeReleaseForBugs = React.useMemo(() => {
    if (!selectedReleaseForBugs) return null;
    return releases?.find((r) => r.id === selectedReleaseForBugs.id) || selectedReleaseForBugs;
  }, [releases, selectedReleaseForBugs]);

  const filteredReleases = React.useMemo(() => {
    if (!selectedTagId) return releases;
    return releases?.filter((release) => release.tags?.some((tag) => tag.id === selectedTagId));
  }, [releases, selectedTagId]);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleDelete = () => {
    closeMenu();
    setDeleteVisible(true);
  };

  const confirmDelete = () => {
    setDeleteVisible(false);
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

  const renderReleaseItem = ({ item, index }: { item: Release; index: number }) => (
    <ReleaseCard
      release={item}
      index={index}
      onDownload={handleDownload}
      onOpenBugs={setSelectedReleaseForBugs}
      isAdmin={application?.project_role === 'ADMIN'}
      onEditTags={setSelectedReleaseForTags}
    />
  );

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
            {application?.project_role === 'ADMIN' && (
              <>
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
              </>
            )}
            <Menu.Item
              onPress={() => {
                closeMenu();
                void refetch();
              }}
              title={t('common.refresh')}
              leadingIcon="refresh"
            />
          </Menu>
        </View>
      </View>

      <Portal>
        <ConfirmDialog
          visible={deleteVisible}
          onDismiss={() => setDeleteVisible(false)}
          onConfirm={confirmDelete}
          title={t('screens.release_list.delete_confirm_title')}
          message={t('screens.release_list.delete_confirm_message')}
          confirmLabel={t('common.delete')}
          confirmColor={theme.colors.error}
          loading={deleteApplication.isPending}
        />
        <BugListSheet
          release={activeReleaseForBugs}
          onDismiss={() => setSelectedReleaseForBugs(null)}
          onSelectBug={(bug) => setSelectedBug(bug)}
          onCreateBug={() => setIsBugCreationVisible(true)}
        />
        <BugCreationSheet
          release={activeReleaseForBugs}
          visible={isBugCreationVisible}
          onDismiss={() => setIsBugCreationVisible(false)}
          onSuccess={() => {
            setIsBugCreationVisible(false);
            toast.success(t('screens.bugs.success_report'));
            void refetch();
          }}
        />
        <BugReportSheet
          bug={selectedBug}
          projectRole={application?.project_role}
          onDismiss={() => setSelectedBug(null)}
        />
        {application && (
          <ReleaseTagsSheet
            release={activeReleaseForTags}
            projectId={application.project}
            onDismiss={() => setSelectedReleaseForTags(null)}
          />
        )}
      </Portal>

      <View
        style={[
          styles.filterContainer,
          { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline + '10' },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <Pressable
            onPress={() => setSelectedTagId(null)}
            style={[
              styles.filterChip,
              !selectedTagId && styles.filterChipSelected,
              !selectedTagId && { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text
              variant="labelMedium"
              style={[
                styles.filterChipText,
                { color: !selectedTagId ? theme.colors.onPrimary : theme.colors.onSurfaceVariant },
              ]}
            >
              Tous
            </Text>
          </Pressable>

          {projectTags?.map((tag) => {
            const isSelected = selectedTagId === tag.id;
            return (
              <Pressable
                key={tag.id}
                onPress={() => setSelectedTagId(isSelected ? null : tag.id)}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected,
                  // eslint-disable-next-line react-native/no-inline-styles
                  isSelected && { backgroundColor: tag.color, borderColor: 'transparent' },
                ]}
              >
                <View
                  style={[
                    styles.filterDot,
                    // eslint-disable-next-line react-native/no-inline-styles
                    { backgroundColor: isSelected ? 'white' : tag.color },
                  ]}
                />
                <Text
                  variant="labelMedium"
                  style={[
                    styles.filterChipText,
                    // eslint-disable-next-line react-native/no-inline-styles
                    { color: isSelected ? 'white' : theme.colors.onSurfaceVariant },
                  ]}
                >
                  {tag.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredReleases}
        keyExtractor={(item: Release) => item.id.toString()}
        renderItem={renderReleaseItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 96 }]}
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
            <Text variant="bodyLarge">
              {selectedTagId
                ? t('screens.release_list.no_match_tag', 'Aucune version ne correspond à ce tag')
                : t('screens.release_list.empty_title')}
            </Text>
          </View>
        }
      />

      {resolvedProjectId && application?.project_role === 'ADMIN' && (
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
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  filterChipText: {
    fontWeight: '700',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
  },
  messageButton: {
    alignSelf: 'center',
    margin: 0,
    marginTop: 4,
  },
  filterChipSelected: {
    borderColor: 'transparent',
  },
});
