import { router } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, FAB, IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/modules/auth/store';
import { useProjects } from '@/modules/projects/api/hooks';
import { Project } from '@/modules/projects/api/schemas';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

export default function DashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const { data: projects, isLoading, isRefetching, refetch } = useProjects();

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
        subtitle={item.description || 'Aucune description'}
        titleStyle={[styles.cardTitle, { color: theme.colors.onSurface }]}
        subtitleStyle={styles.cardSubtitle}
        left={(props) => (
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
            <IconButton 
              {...props} 
              icon="folder" 
              iconColor={theme.colors.onSecondaryContainer} 
              size={24}
              style={styles.iconButton}
            />
          </View>
        )}
        right={(props) => <IconButton {...props} icon="chevron-right" iconColor={theme.colors.onSurfaceVariant} />}
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
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline + '20' }]}>
        <View>
          <Text variant="headlineMedium" style={[styles.welcome, { color: theme.colors.onSurface }]}>
            Salut, {user?.first_name} !
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Voici vos projets actuels.
          </Text>
        </View>
        <View style={styles.headerRight}>
          <IconButton 
            icon="history" 
            iconColor={theme.colors.onSurfaceVariant} 
            onPress={() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              void router.push('/(protected)/activity' as any);
            }} 
          />
          <IconButton 
            icon="logout" 
            iconColor={theme.colors.onSurfaceVariant} 
            onPress={() => {
              void logout();
            }} 
          />
        </View>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item: Project) => item.id.toString()}
        renderItem={renderProjectItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge">Aucun projet trouvé.</Text>
            <Text variant="bodySmall">Créez votre premier projet pour commencer.</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        label="Nouveau Projet"
        variant="primary"
        mode="elevated"
        style={[
          styles.fab,
          { bottom: insets.bottom + 16 },
        ]}
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
    padding: 24,
    paddingTop: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerRight: {
    flexDirection: 'row',
  },
  welcome: {
    fontWeight: 'bold',
  },
  subtitle: {
    opacity: 0.6,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
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
