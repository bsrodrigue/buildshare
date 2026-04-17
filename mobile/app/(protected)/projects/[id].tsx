import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, FAB, useTheme, ActivityIndicator, IconButton, List } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useApplications } from '@/modules/binaries/hooks/useApplications';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams();
  const projectId = parseInt(id as string, 10);
  const theme = useTheme();
  
  const { 
    data: applications, 
    isLoading, 
    isRefetching, 
    refetch 
  } = useApplications(projectId);

  const renderAppItem = ({ item }: { item: any }) => (
    <Card
      style={styles.appCard}
      onPress={() => router.push(`/(protected)/apps/${item.id}` as any)}
    >
      <Card.Title
        title={item.title}
        subtitle={item.app_id}
        left={(props) => <List.Icon {...props} icon="android" color={theme.colors.secondary} />}
        right={(props) => <IconButton {...props} icon="cloud-upload" onPress={() => router.push(`/(protected)/apps/${item.id}/upload` as any)} />}
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
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text variant="headlineSmall" style={styles.title}>
          Applications
        </Text>
        <View style={{ width: 48 }} /> 
      </View>

      <FlatList
        data={applications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderAppItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge">Aucune application.</Text>
            <Text variant="bodySmall">Ajoutez une application Android pour commencer.</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        label="Ajouter App"
        style={[styles.fab, { backgroundColor: theme.colors.secondaryContainer }]}
        onPress={() => router.push({
          pathname: '/(protected)/apps/create' as any,
          params: { projectId }
        })}
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
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
