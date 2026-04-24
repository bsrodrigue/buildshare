import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Chip,
  Dialog,
  Divider,
  FAB,
  IconButton,
  List,
  Menu,
  Portal,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '@/libs/notification/toast';
import { useAuthStore } from '@/modules/auth/store';
import { useApplications } from '@/modules/binaries/api/hooks';
import { Application } from '@/modules/binaries/api/schemas';
import {
  useDeleteProject,
  useProject,
  useRevokeMembership,
  useSendInvitation,
} from '@/modules/projects/api/hooks';
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
  const { user } = useAuthStore();

  const deleteProject = useDeleteProject();
  const revokeMembership = useRevokeMembership();
  const sendInvitation = useSendInvitation();

  const [menuVisible, setMenuVisible] = React.useState(false);
  const [inviteDialogVisible, setInviteDialogVisible] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleSendInvitation = () => {
    if (!inviteEmail) return;

    sendInvitation.mutate(
      { projectId, email: inviteEmail },
      {
        onSuccess: () => {
          setInviteDialogVisible(false);
          setInviteEmail('');
          toast.success('Invitation envoyée à ' + inviteEmail);
        },
        onError: (error) => {
          toast.error("Erreur lors de l'envoi de l'invitation", error.message);
        },
      },
    );
  };

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
  const handleLeave = () => {
    closeMenu();
    if (!user) return;

    Alert.alert('Quitter le projet', 'Voulez-vous vraiment quitter ce projet ?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: () => {
          revokeMembership.mutate(
            { projectId, userId: user.id },
            {
              onSuccess: () => {
                toast.success('Vous avez quitté le projet');
                router.replace('/(protected)');
              },
              onError: (error) => {
                toast.error('Erreur', error.message);
              },
            },
          );
        },
      },
    ]);
  };

  const renderAppItem = ({ item }: { item: Application }) => (
    <Surface style={[styles.appCard, theme.shadows.soft]} elevation={1}>
      <View style={styles.cardPressableContainer}>
        <List.Item
          title={item.title}
          description={item.app_id}
          titleStyle={[styles.appTitle, { color: theme.colors.text }]}
          descriptionStyle={[styles.appSubtitle, { color: theme.colors.onSurfaceVariant }]}
          onPress={() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            void router.push(`/(protected)/apps/${item.id}?projectId=${item.project}` as any);
          }}
          style={styles.cardItem}
          titleNumberOfLines={1}
          descriptionNumberOfLines={1}
          left={() => (
            <View
              style={[styles.avatarContainer, { backgroundColor: theme.colors.secondaryContainer }]}
            >
              <Avatar.Icon
                icon="android"
                size={32}
                color={theme.colors.onSecondaryContainer}
                style={styles.avatar}
              />
            </View>
          )}
        />
        <View style={styles.cardFooter}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            v{item.latest_release?.version_id || 'N/A'}
          </Text>
          <IconButton
            icon="chevron-right"
            size={16}
            iconColor={theme.colors.onSurfaceVariant}
            onPress={() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              void router.push(`/(protected)/apps/${item.id}?projectId=${item.project}` as any);
            }}
            style={styles.cardChevron}
          />
        </View>
      </View>
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
              {project?.role === 'ADMIN' && (
                <>
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
                    onPress={() => {
                      closeMenu();
                      setInviteEmail('');
                      setInviteDialogVisible(true);
                    }}
                    title="Inviter un membre"
                    leadingIcon="account-plus"
                  />
                </>
              )}

              <Menu.Item
                onPress={() => {
                  closeMenu();
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  void router.push(`/(protected)/projects/${projectId}/members` as any);
                }}
                title="Gérer les membres"
                leadingIcon="account-group"
              />

              <Menu.Item
                onPress={handleLeave}
                title="Quitter le projet"
                leadingIcon="account-remove"
              />
              <Divider />
              <Menu.Item
                onPress={() => {
                  closeMenu();
                  void useAuthStore.getState().logout();
                }}
                title={t('common.logout')}
                leadingIcon="logout"
                titleStyle={{ color: theme.colors.error }}
              />

              {project?.role === 'ADMIN' && (
                <Menu.Item
                  onPress={handleDelete}
                  title={t('common.delete')}
                  leadingIcon="delete"
                  titleStyle={{ color: theme.colors.error }}
                />
              )}
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
        key={`${projectId}-grid`}
        numColumns={2}
        keyExtractor={(item: Application) => item.id.toString()}
        renderItem={renderAppItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 96 }]}
        columnWrapperStyle={styles.columnWrapper}
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
        mode="flat"
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => {
          void router.push({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pathname: `/(protected)/projects/${projectId}/upload` as any,
          });
        }}
      />

      <Portal>
        <Dialog visible={inviteDialogVisible} onDismiss={() => setInviteDialogVisible(false)}>
          <Dialog.Title>Inviter un utilisateur</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Email"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setInviteDialogVisible(false)}>{t('common.cancel')}</Button>
            <Button
              onPress={handleSendInvitation}
              loading={sendInvitation.isPending}
              disabled={!inviteEmail || sendInvitation.isPending}
            >
              Inviter
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    padding: 12,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  appCard: {
    flex: 1,
    margin: 6,
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 140,
    backgroundColor: '#ffffff',
  },
  cardPressableContainer: {
    flex: 1,
    padding: 4,
  },
  cardItem: {
    paddingRight: 0,
  },
  appTitle: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  appSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  avatar: {
    backgroundColor: 'transparent',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 4,
    marginTop: 'auto',
    paddingBottom: 4,
  },
  cardChevron: {
    margin: 0,
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
