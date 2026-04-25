import { router } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Appbar, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBulkMarkAsRead, useNotifications } from '@/modules/notifications/api/hooks';
import { NotificationItem } from '@/modules/notifications/components/NotificationItem';

export default function NotificationsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data: notifications, isLoading, refetch } = useNotifications();
  const { mutate: markAllRead } = useBulkMarkAsRead();

  const [filter, setFilter] = React.useState('unread');

  const unreadIds = notifications?.filter((n) => !n.read_at).map((n) => n.id) || [];

  const filteredNotifications = React.useMemo(() => {
    if (filter === 'unread') return notifications?.filter((n) => !n.read_at) || [];
    if (filter === 'read') return notifications?.filter((n) => !!n.read_at) || [];
    return notifications || [];
  }, [notifications, filter]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Notifications" />
        {filter === 'unread' && unreadIds.length > 0 && (
          <Appbar.Action icon="playlist-check" onPress={() => markAllRead(unreadIds)} />
        )}
      </Appbar.Header>

      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            {
              value: 'unread',
              label: `Non lues${unreadIds.length > 0 ? ` (${unreadIds.length})` : ''}`,
            },
            {
              value: 'read',
              label: 'Lues',
            },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem notification={item} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              void refetch();
            }}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification lue'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segmentedButtons: {
    width: '100%',
  },
  listContent: {
    paddingVertical: 8,
  },
  empty: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.5,
  },
});
