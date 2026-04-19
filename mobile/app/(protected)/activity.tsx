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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTaskJobs } from '@/modules/binaries/api/hooks';
import { TaskJob } from '@/modules/binaries/api/schemas';
import { useTheme as useCustomTheme } from '@/modules/shared/theme/ThemeProvider';

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
      default: return 'clock-outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return '#4CAF50';
      case 'FAILURE': return theme.colors.error;
      default: return theme.colors.primary;
    }
  };

  const getStatusContainerColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return '#E8F5E9';
      case 'FAILURE': return theme.colors.errorContainer;
      default: return theme.colors.primaryContainer;
    }
  };

  const renderJobItem = ({ item }: { item: TaskJob }) => {
    const jobId = String(item.id);
    return (
      <Surface style={[styles.jobItem, customTheme.shadows.soft]}>
        <List.Item
          title={`${item.type}`}
          description={`${jobId.substring(0, 8)} • ${
            item.status === 'FAILURE' 
              ? `Erreur: ${item.error_message}`
              : `Créé le ${new Date(item.created_at).toLocaleString()}`
          }`}
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
              style={[styles.statusChip, { backgroundColor: getStatusContainerColor(item.status) + '40' }]}
              textStyle={[styles.statusChipText, { color: getStatusColor(item.status) }]}
            >
              {item.status_display}
            </Chip>
          </View>
        )}
        style={styles.listItem}
      />
    </Surface>
  );
};

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
        <IconButton 
          icon="arrow-left" 
          iconColor={customTheme.colors.onSurfaceVariant} 
          onPress={() => {
            void router.back();
          }} 
        />
        <Text variant="headlineSmall" style={[styles.title, { color: customTheme.colors.onSurface }]}>
          Activité Récente
        </Text>
        <IconButton 
          icon="refresh" 
          iconColor={customTheme.colors.onSurfaceVariant} 
          onPress={() => {
            void refetch();
          }} 
          loading={isRefetching} 
        />
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJobItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge">Aucun job trouvé.</Text>
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
  statusChip: {
    borderRadius: 8,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
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
