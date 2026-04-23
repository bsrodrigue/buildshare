import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Surface, Text, useTheme } from 'react-native-paper';

import { DateTimeService } from '@/libs/datetime';

import { useMarkAsRead } from '../api/hooks';
import { Notification } from '../types';
import { NotificationDispatcher } from './NotificationDispatcher';

interface Props {
  notification: Notification;
}

export const NotificationItem: React.FC<Props> = ({ notification }) => {
  const theme = useTheme();
  const { mutate: markAsRead } = useMarkAsRead();
  const isRead = !!notification.read_at;

  const titleStyle = [styles.title, isRead && styles.readTitle];

  const surfaceStyle = [
    styles.container,
    { backgroundColor: isRead ? theme.colors.surface : theme.colors.surfaceVariant },
  ];

  return (
    <Surface style={surfaceStyle} elevation={isRead ? 0 : 1}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {!isRead && (
            <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
          )}
          <Text variant="titleMedium" style={titleStyle}>
            {notification.title}
          </Text>
        </View>
        {!isRead && (
          <IconButton
            icon="check"
            size={18}
            onPress={() => markAsRead(notification.id)}
            style={styles.markBtn}
          />
        )}
      </View>

      <NotificationDispatcher notification={notification} />

      <Text variant="bodySmall" style={styles.date}>
        {DateTimeService.toRelative(notification.created_at)}
      </Text>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  readTitle: {
    opacity: 0.7,
  },
  markBtn: {
    margin: -8,
  },
  date: {
    marginTop: 12,
    opacity: 0.5,
    textAlign: 'right',
  },
});
