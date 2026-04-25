import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, FAB, IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/modules/auth/store';
import { useProjects } from '@/modules/projects/api/hooks';
import { Project } from '@/modules/projects/api/schemas';
import { SideMenu } from '@/modules/shared/components/SideMenu';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

export default function DashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { data: projects, isLoading, isRefetching, refetch } = useProjects();
  const [menuVisible, setMenuVisible] = React.useState(false);

  const renderProjectItem = ({ item }: { item: Project }) => (
    <Card
      style={[styles.projectCard, theme.shadows.soft]}
      onPress={() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        void router.push(`/(protected)/projects/${item.id}` as any);
      }}
      mode="contained"
    >
      <Card.Title
        title={item.title}
        subtitle={item.description || t('screens.dashboard.no_description')}
        titleStyle={[styles.cardTitle, { color: theme.colors.onSurface }]}
        subtitleStyle={styles.cardSubtitle}
        left={(props) => (
          <View
            style={[styles.iconContainer, { backgroundColor: theme.colors.secondaryContainer }]}
          >
            <IconButton
              {...props}
              icon="folder"
              iconColor={theme.colors.onSecondaryContainer}
              size={24}
              style={styles.iconButton}
            />
          </View>
        )}
        right={(props) => (
          <IconButton {...props} icon="chevron-right" iconColor={theme.colors.onSurfaceVariant} />
        )}
        style={styles.cardInternal}
      />
    </Card>
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
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />

      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            paddingTop: insets.top + 8,
            borderBottomColor: theme.colors.outline + '20',
          },
        ]}
      >
        <IconButton
          icon="menu"
          iconColor={theme.colors.onSurface}
          size={28}
          onPress={() => setMenuVisible(true)}
          style={styles.menuButton}
        />
        <View style={styles.headerTitleContainer}>
          <Text variant="headlineSmall" style={[styles.welcome, { color: theme.colors.onSurface }]}>
            {t('screens.dashboard.welcome', { name: user?.first_name || '' })}
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            {t('screens.dashboard.subtitle')}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <IconButton
            icon="bell-outline"
            iconColor={theme.colors.onSurface}
            size={24}
            onPress={() => router.push('/notifications')}
          />
        </View>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item: Project) => item.id.toString()}
        renderItem={renderProjectItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 96 }]}
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
            <Text variant="bodyLarge">{t('screens.dashboard.empty_title')}</Text>
            <Text variant="bodySmall">{t('screens.dashboard.empty_subtitle')}</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        label={t('screens.dashboard.fab_new_project')}
        variant="primary"
        mode="flat"
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          void router.push('/(protected)/projects/create' as any);
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
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  menuButton: {
    marginLeft: -8,
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerTitleContainer: {
    flex: 1,
  },
  welcome: {
    fontWeight: 'bold',
  },
  subtitle: {
    opacity: 0.6,
  },
  listContent: {
    padding: 16,
  },
  projectCard: {
    marginBottom: 16,
    borderRadius: 28,
    backgroundColor: '#ffffff',
  },
  cardInternal: {
    paddingRight: 8,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  cardSubtitle: {
    opacity: 0.6,
    fontSize: 13,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 0,
  },
  iconButton: {
    margin: 0,
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
