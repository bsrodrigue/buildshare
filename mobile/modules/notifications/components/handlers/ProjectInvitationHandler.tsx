import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';

import { toast } from '@/libs/notification/toast';

import { useInvitationAction, useMarkAsRead } from '../../api/hooks';
import { ProjectInvitationPayloadSchema } from '../../api/schemas';
import { Notification } from '../../types';

interface Props {
  notification: Notification;
}

export const ProjectInvitationHandler: React.FC<Props> = ({ notification }) => {
  const theme = useTheme();
  const { mutate: performAction, isPending } = useInvitationAction();
  const { mutate: markAsRead } = useMarkAsRead();

  const payloadResult = ProjectInvitationPayloadSchema.safeParse(notification.payload);

  if (!payloadResult.success) {
    return <Text style={{ color: theme.colors.error }}>Invalid Invitation Data</Text>;
  }

  const payload = payloadResult.data;

  const onAccept = () => {
    performAction(
      { invitationId: payload.invitation_id, action: 'accept' },
      {
        onSuccess: () => {
          toast.success('Invitation acceptée', `Vous avez rejoint ${payload.project_title}`);
          markAsRead(notification.id);
        },
        onError: () => toast.error('Erreur', "Impossible d'accepter l'invitation"),
      },
    );
  };

  const onReject = () => {
    performAction(
      { invitationId: payload.invitation_id, action: 'reject' },
      {
        onSuccess: () => {
          toast.success('Invitation refusée');
          markAsRead(notification.id);
        },
      },
    );
  };

  return (
    <View style={styles.container}>
      <Text variant="bodyMedium" style={styles.body}>
        {notification.body}
      </Text>
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={onReject}
          style={styles.btn}
          disabled={isPending}
          textColor={theme.colors.error}
        >
          Refuser
        </Button>
        <Button mode="contained" onPress={onAccept} style={styles.btn} loading={isPending}>
          Accepter
        </Button>
      </View>
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
