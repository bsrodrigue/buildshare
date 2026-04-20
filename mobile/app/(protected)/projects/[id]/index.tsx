import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Chip,
  FAB,
  IconButton,
  List,
  Menu,
  Surface,
  Text,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '@/libs/notification/toast';
import { useApplications } from '@/modules/binaries/api/hooks';
import { Application } from '@/modules/binaries/api/schemas';
import { useDeleteProject, useProject } from '@/modules/projects/api/hooks';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams();
  const projectId = parseInt(id as string, 10);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const {
    data: applications,
    isLoading: isAppsLoading,
    isRefetching,
    refetch,
  } = useApplications(projectId);

  const { data: project, isLoading: isProjectLoading } = useProject(projectId);

  const deleteProject = useDeleteProject();
  const [menuVisible, setMenuVisible] = React.useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleDelete = () => {
    closeMenu();
    Alert.alert(
      t('screens.project_detail.delete_confirm_title'),
      t('screens.project_detail.delete_confirm_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            deleteProject.mutate(projectId, {
              onSuccess: () => {
                toast.success(t('screens.project_detail.delete_success'));
                router.replace('/(protected)');
              },
              onError: (error) => {
                toast.error(t('screens.project_detail.delete_error'), error.message);
              },
            });
          },
        },
      ],
    );
  };

  const renderAppItem = ({ item }: { item: Application }) => (
    <Surface style={[styles.appCard, { backgroundColor: theme.colors.background }]}>
      <List.Item
        title={item.title}
        description={`Package: ${item.app_id}\nVersion: ${item.latest_release?.version_id || 'N/A'}`}
        titleStyle={[styles.appTitle, { color: theme.colors.text }]}
        descriptionStyle={[styles.appSubtitle, { color: theme.colors.onSurfaceVariant }]}
        onPress={() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          void router.push(`/(protected)/apps/${item.id}?projectId=${item.project}` as any);
        }}
        left={(props) => (
          <View
            style={[styles.avatarContainer, { backgroundColor: theme.colors.secondaryContainer }]}
          >
            <Avatar.Icon
              {...props}
              icon="android"
              size={40}
              color={theme.colors.onSecondaryContainer}
              style={styles.avatar}
            />
          </View>
        )}
        right={(props) => (
          <View style={styles.rightContainer}>
            <IconButton
              {...props}
              icon="chevron-right"
              iconColor={theme.colors.onSurfaceVariant}
              onPress={() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                void router.push(`/(protected)/apps/${item.id}?projectId=${item.project}` as any);
              }}
            />
          </View>
        )}
      />
    </Surface>
  );

  if (isAppsLoading || isProjectLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface
        style={[
          styles.unifiedHeader,
          { backgroundColor: theme.colors.surface },
          theme.shadows.soft,
        ]}
        elevation={0}
      >
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 16,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <IconButton
              icon="arrow-left"
              iconColor={theme.colors.onSurfaceVariant}
              onPress={() => {
                void router.back();
              }}
            />
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
                  void router.push(`/(protected)/projects/${projectId}/edit` as any);
                }}
                title={t('screens.edit_project.title')}
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

        <View style={styles.heroContent}>
          <View style={styles.heroHeader}>
            <View
              style={[
                styles.projectIconContainer,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              <Avatar.Icon
                icon="folder-zip"
                size={48}
                style={styles.heroAvatar}
                color={theme.colors.onPrimaryContainer}
              />
            </View>
            <View style={styles.heroTextContent}>
              <Text
                variant="headlineSmall"
                style={[styles.title, { color: theme.colors.onSurface }]}
              >
                {project?.title || t('screens.project_detail.title')}
              </Text>
              <View style={styles.statsRow}>
                <Chip
                  icon="layers-outline"
                  compact
                  style={styles.statChip}
                  textStyle={styles.statChipText}
                >
                  {applications?.length || 0} {t('screens.project_detail.title')}
                </Chip>
              </View>
            </View>
          </View>

          {project?.description ? (
            <Text
              variant="bodyMedium"
              style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
            >
              {project.description}
            </Text>
          ) : (
            <Text
              variant="bodySmall"
              style={[styles.noDescription, { color: theme.colors.onSurfaceVariant }]}
            >
              {t('screens.dashboard.no_description')}
            </Text>
          )}
        </View>
      </Surface>

      <FlatList
        data={applications}
        keyExtractor={(item: Application) => item.id.toString()}
        renderItem={renderAppItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge">{t('screens.project_detail.empty_title')}</Text>
            <Text variant="bodySmall">{t('screens.project_detail.empty_subtitle')}</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        label={t('screens.project_detail.fab_new_app')}
        variant="primary"
        mode="elevated"
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => {
          void router.push({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pathname: `/(protected)/projects/${projectId}/upload` as any,
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
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
  unifiedHeader: {
    paddingBottom: 24,
    marginBottom: 8,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroSection: {
    paddingBottom: 24,
    marginBottom: 8,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
    paddingHorizontal: 20,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  projectIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  heroAvatar: {
    backgroundColor: 'transparent',
  },
  heroTextContent: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statChip: {
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  statChipText: {
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  description: {
    lineHeight: 20,
    opacity: 0.8,
  },
  noDescription: {
    fontStyle: 'italic',
    opacity: 0.5,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  appCard: {
    marginBottom: 12,
    borderRadius: 28,
    overflow: 'hidden',
  },
  appTitle: {
    fontWeight: 'bold',
  },
  appSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  avatar: {
    backgroundColor: 'transparent',
  },
  rightContainer: {
    justifyContent: 'center',
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
