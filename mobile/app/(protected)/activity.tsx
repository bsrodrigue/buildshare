import { router,useLocalSearchParams } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl,StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Chip,
  IconButton,
  List,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';
import { useTheme as useCustomTheme } from '@/modules/shared/theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTaskJobs } from '@/modules/binaries/api/hooks';

export default function ActivityScreen() {
  const { projectId } = useLocalSearchParams();
  const pid = projectId ? parseInt(projectId as string, 10) : undefined;
  const theme = useTheme();
  const customTheme = useCustomTheme();
  const insets = useSafeAreaInsets();
  
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
    <Surface style={[styles.jobItem, customTheme.shadows.soft]}>
      <List.Item
        title={`${item.type}`}
        subtitle={`${item.id.substring(0, 8)}`}
        description={
          item.status === 'FAILURE' 
            ? `Erreur: ${item.error_message}`
            : `Créé le ${new Date(item.created_at).toLocaleString()}`
        }
        titleStyle={[styles.jobTitle, { color: theme.colors.onSurface }]}
        descriptionStyle={styles.jobDescription}
        left={(props) => (
          <View style={[styles.iconContainer, { backgroundColor: getStatusContainerColor(item.status) }]}>
            <List.Icon
              {...props}
              icon={getStatusIcon(item.status)}
              color={getStatusColor(item.status)}
              style={styles.listIcon}
            />
          </View>
        )}
        right={() => (
          <View style={styles.statusBadge}>
            <Chip 
              compact 
              style={{ backgroundColor: getStatusContainerColor(item.status) + '40', borderRadius: 8 }}
              textStyle={{ color: getStatusColor(item.status), fontSize: 10, fontWeight: '700' }}
            >
              {item.status_display}
            </Chip>
          </View>
        )}
        style={styles.listItem}
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
    <View style={[styles.container, { backgroundColor: customTheme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: customTheme.colors.surface, borderBottomColor: customTheme.colors.outline + '20' }]}>
        <IconButton icon="arrow-left" iconColor={customTheme.colors.onSurfaceVariant} onPress={() => router.back()} />
        <Text variant="headlineSmall" style={[styles.title, { color: customTheme.colors.onSurface }]}>
          Activité Récente
        </Text>
        <IconButton icon="refresh" iconColor={customTheme.colors.onSurfaceVariant} onPress={() => refetch()} loading={isRefetching} />
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
    paddingBottom: 40,
  },
  jobItem: {
    marginBottom: 16,
    borderRadius: 28,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  listItem: {
    paddingVertical: 8,
  },
  jobTitle: {
    fontWeight: '700',
    fontSize: 15,
  },
  jobDescription: {
    fontSize: 12,
    opacity: 0.6,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  listIcon: {
    margin: 0,
  },
  statusBadge: {
    justifyContent: 'center',
    paddingRight: 12,
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
