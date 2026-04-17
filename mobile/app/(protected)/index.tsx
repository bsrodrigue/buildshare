import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, FAB, useTheme, ActivityIndicator, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useProjects } from '@/modules/projects/api/hooks';
import { useAuthStore } from '@/modules/auth/store';

export default function DashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const { data: projects, isLoading, isRefetching, refetch } = useProjects();

  const renderProjectItem = ({ item }: { item: any }) => (
    <Card
      style={styles.projectCard}
      onPress={() => router.push(`/(protected)/projects/${item.id}` as any)}
    >
      <Card.Title
        title={item.title}
        subtitle={item.description || 'Aucune description'}
        left={(props) => <IconButton {...props} icon="folder" iconColor={theme.colors.primary} />}
        right={(props) => <IconButton {...props} icon="chevron-right" />}
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text variant="headlineMedium" style={styles.welcome}>
            Salut, {user?.first_name} !
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Voici vos projets actuels.
          </Text>
        </View>
        <IconButton icon="logout" onPress={logout} />
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProjectItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
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
        style={[
          styles.fab,
          { backgroundColor: theme.colors.primaryContainer, bottom: insets.bottom + 16 },
        ]}
        onPress={() => router.push('/(protected)/projects/create' as any)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    marginBottom: 12,
    elevation: 1,
    backgroundColor: '#fff',
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
    bottom: 0,
  },
});
