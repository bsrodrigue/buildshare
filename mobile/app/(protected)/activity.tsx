import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import {
  Chip,
  IconButton,
  List,
  SegmentedButtons,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTaskJobs } from '@/modules/binaries/api/hooks';
import { TaskJob } from '@/modules/binaries/api/schemas';
import { JobDetailSheet } from '@/modules/shared/components/JobDetailSheet';
import { useTheme as useCustomTheme } from '@/modules/shared/theme/ThemeProvider';

export default function ActivityScreen() {
  const { projectId } = useLocalSearchParams();
  const pid = projectId ? parseInt(projectId as string, 10) : undefined;
  const theme = useTheme();
  const customTheme = useCustomTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [selectedJob, setSelectedJob] = React.useState<TaskJob | null>(null);
  const { data: jobs, isRefetching, refetch } = useTaskJobs(pid);

  const filteredJobs = React.useMemo(() => {
    if (!jobs) return [];
    if (statusFilter === 'ALL') return jobs;
    if (statusFilter === 'ACTIVE')
      return jobs.filter((j) => j.status === 'PENDING' || j.status === 'STARTED');
    return jobs.filter((j) => j.status === statusFilter);
  }, [jobs, statusFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'check-circle';
      case 'FAILURE':
        return 'alert-circle';
      case 'STARTED':
        return 'cog'; // Changed from 'loading' as requested
      default:
        return 'clock-outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return '#4CAF50';
      case 'FAILURE':
        return theme.colors.error;
      case 'STARTED':
        return theme.colors.primary;
      default:
        return theme.colors.outline;
    }
  };

  const renderJobItem = ({ item }: { item: TaskJob }) => {
    const jobId = String(item.id);
    const title = item.app_title || t(`jobs.types.${item.type}`, { defaultValue: item.type });

    return (
      <Pressable
        onPress={() => setSelectedJob(item)}
        android_ripple={{ color: theme.colors.primary + '18', borderless: false }}
        style={styles.pressable}
      >
        <Surface style={[styles.jobItem, customTheme.shadows.soft]}>
          <List.Item
            title={title}
            description={`${jobId.substring(0, 8)} • ${
              item.status === 'FAILURE'
                ? `${t('common.error')}: ${item.error_message}`
                : `${new Date(item.created_at).toLocaleString()}`
            }`}
            titleStyle={[styles.jobTitle, { color: theme.colors.onSurface }]}
            descriptionStyle={styles.jobDescription}
            left={(props) => (
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: getStatusColor(item.status) + '15' },
                ]}
              >
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
                  style={[
                    styles.statusChip,
                    { backgroundColor: getStatusColor(item.status) + '15' },
                  ]}
                  textStyle={[styles.statusChipText, { color: getStatusColor(item.status) }]}
                >
                  {t(`jobs.status.${item.status}`, { defaultValue: item.status_display })}
                </Chip>
              </View>
            )}
            style={styles.listItem}
          />
        </Surface>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: customTheme.colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            backgroundColor: customTheme.colors.surface,
            borderBottomColor: customTheme.colors.outline + '20',
          },
        ]}
      >
        <IconButton
          icon="arrow-left"
          iconColor={customTheme.colors.onSurfaceVariant}
          onPress={() => {
            void router.back();
          }}
        />
        <Text
          variant="headlineSmall"
          style={[styles.title, { color: customTheme.colors.onSurface }]}
        >
          {t('screens.activity.title')}
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

      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={statusFilter}
          onValueChange={setStatusFilter}
          density="medium"
          style={styles.segmentedButtons}
          buttons={[
            { value: 'ALL', label: t('screens.activity.filter.all') },
            { value: 'ACTIVE', label: t('screens.activity.filter.active') },
            { value: 'SUCCESS', label: t('screens.activity.filter.success') },
            { value: 'FAILURE', label: t('screens.activity.filter.failure') },
          ]}
        />
      </View>

      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJobItem}
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
            <Text variant="bodyLarge">{t('screens.activity.empty')}</Text>
          </View>
        }
      />

      <JobDetailSheet job={selectedJob} onDismiss={() => setSelectedJob(null)} />
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
  filterContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  segmentedButtons: {
    backgroundColor: 'transparent',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pressable: {
    marginBottom: 16,
    borderRadius: 28,
    overflow: 'hidden',
  },
  jobItem: {
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
