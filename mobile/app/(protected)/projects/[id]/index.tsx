import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, FAB, IconButton, List, Surface, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApplications } from '@/modules/binaries/api/hooks';
import { Application } from '@/modules/binaries/api/schemas';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams();
  const projectId = parseInt(id as string, 10);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  const { 
    data: applications, 
    isLoading, 
    isRefetching, 
    refetch 
  } = useApplications(projectId);

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
          <View style={[styles.avatarContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
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
          {t('screens.project_detail.title')}
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
        data={applications}
        keyExtractor={(item: Application) => item.id.toString()}
        renderItem={renderAppItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} />
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
        style={[
          styles.fab,
          { bottom: insets.bottom + 16 },
        ]}
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
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: 'bold',
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
