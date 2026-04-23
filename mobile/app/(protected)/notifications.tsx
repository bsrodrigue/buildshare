import { router } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Appbar, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBulkMarkAsRead, useNotifications } from '@/modules/notifications/api/hooks';
import { NotificationItem } from '@/modules/notifications/components/NotificationItem';

export default function NotificationsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data: notifications, isLoading, refetch } = useNotifications();
  const { mutate: markAllRead } = useBulkMarkAsRead();

  const unreadIds = notifications?.filter((n) => !n.read_at).map((n) => n.id) || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Notifications" />
        {unreadIds.length > 0 && (
          <Appbar.Action icon="playlist-check" onPress={() => markAllRead(unreadIds)} />
        )}
      </Appbar.Header>

      <FlatList
        data={notifications}
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
                Aucune notification
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
