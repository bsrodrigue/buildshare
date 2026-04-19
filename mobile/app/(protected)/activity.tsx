import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Text,
  useTheme,
  ActivityIndicator,
  IconButton,
  List,
  Surface,
  Chip,
} from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useTaskJobs } from '@/modules/binaries/api/hooks';

export default function ActivityScreen() {
  const { projectId } = useLocalSearchParams();
  const pid = projectId ? parseInt(projectId as string, 10) : undefined;
  const theme = useTheme();
  
  const { data: jobs, isLoading, isRefetching, refetch } = useTaskJobs(pid);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'check-circle';
      case 'FAILURE': return 'alert-circle';
      case 'STARTED': return 'loading';
      case 'PENDING': return 'clock-outline';
      default: return 'help-circle';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return theme.colors.primary;
      case 'FAILURE': return theme.colors.error;
      case 'STARTED': return theme.colors.secondary;
      default: return theme.colors.outline;
    }
  };

  const getStatusContainerColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return theme.colors.primaryContainer;
      case 'FAILURE': return theme.colors.errorContainer;
      case 'STARTED': return theme.colors.secondaryContainer;
      default: return theme.colors.surfaceVariant;
    }
  };

  const renderJobItem = ({ item }: { item: any }) => (
    <Surface style={styles.jobItem} elevation={1}>
      <List.Item
        title={`${item.type} (${item.id.substring(0, 8)})`}
        description={
          item.status === 'FAILURE' 
            ? `Erreur: ${item.error_message}`
            : `Créé le ${new Date(item.created_at).toLocaleString()}`
        }
        left={(props) => (
          <List.Icon
            {...props}
            icon={getStatusIcon(item.status)}
            color={getStatusColor(item.status)}
          />
        )}
        right={() => (
          <View style={styles.statusBadge}>
            <Chip 
              compact 
              style={{ backgroundColor: getStatusContainerColor(item.status) }}
              textStyle={{ color: getStatusColor(item.status), fontSize: 10, fontWeight: 'bold' }}
            >
              {item.status_display}
            </Chip>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text variant="headlineSmall" style={styles.title}>
          Activité Récente
        </Text>
        <IconButton icon="refresh" onPress={() => refetch()} loading={isRefetching} />
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJobItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge">Aucune activité.</Text>
            <Text variant="bodySmall">Les tâches de traitement apparaîtront ici.</Text>
          </View>
        }
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
    paddingBottom: 40,
  },
  jobItem: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  statusBadge: {
    justifyContent: 'center',
    paddingRight: 8,
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
});
