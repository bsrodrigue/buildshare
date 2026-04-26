import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { Notification } from '../../types';

interface Props {
  notification: Notification;
}

export const ProjectInvitationHandler: React.FC<Props> = ({ notification }) => {
  return (
    <View style={styles.container}>
      <Text variant="bodyMedium" style={styles.body}>
        {notification.body}
      </Text>
      {notification.is_actionable && (
        <View style={styles.actions}>
          <Button mode="contained" onPress={() => router.push('/invitations')} style={styles.btn}>
            Voir l&apos;invitation
          </Button>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  body: {
    marginBottom: 12,
    opacity: 0.8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btn: {
    borderRadius: 8,
  },
});
