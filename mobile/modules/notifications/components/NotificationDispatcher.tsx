import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { Notification, NotificationType } from '../types';
import { ProjectInvitationHandler } from './handlers/ProjectInvitationHandler';

interface Props {
  notification: Notification;
}

export const NotificationDispatcher: React.FC<Props> = ({ notification }) => {
  switch (notification.type) {
    case NotificationType.PROJECT_INVITATION:
      return <ProjectInvitationHandler notification={notification} />;

    case NotificationType.SYSTEM_ALERT:
      return (
        <View style={styles.generic}>
          <Text variant="bodyMedium">{notification.body}</Text>
        </View>
      );

    default:
      return (
        <View style={styles.generic}>
          <Text variant="bodyMedium" style={styles.unsupported}>
            Message non supporté ({{ type: notification.type }})
          </Text>
          <Text variant="bodySmall">{notification.body}</Text>
        </View>
      );
  }
};

const styles = StyleSheet.create({
  generic: {
    marginTop: 4,
  },
  unsupported: {
    fontStyle: 'italic',
    opacity: 0.5,
  },
});
