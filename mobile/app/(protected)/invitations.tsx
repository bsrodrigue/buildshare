import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import {
  useAcceptInvitation,
  useMyInvitations,
  useRejectInvitation,
} from '@/modules/projects/api/hooks';
import { ProjectInvitation } from '@/modules/projects/api/schemas';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

export default function InvitationsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const { data: invitations, isLoading, isRefetching, refetch } = useMyInvitations();
  const { mutate: acceptInv, isPending: isAccepting } = useAcceptInvitation();
  const { mutate: rejectInv, isPending: isRejecting } = useRejectInvitation();

  const handleAccept = (id: string) => {
    acceptInv(id, {
      onSuccess: () => {
        Toast.show({
          type: 'success',
          text1: t('screens.invitations.accept_success', 'Invitation acceptée'),
          text2: t(
            'screens.invitations.accept_success_desc',
            'Vous avez rejoint le projet avec succès.',
          ),
        });
        void router.replace('/');
      },
      onError: (error) => {
        Toast.show({
          type: 'error',
          text1: t('common.error', 'Erreur'),
          text2: error.message,
        });
      },
    });
  };

  const handleReject = (id: string) => {
    rejectInv(id, {
      onSuccess: () => {
        Toast.show({
          type: 'info',
          text1: t('screens.invitations.reject_success', 'Invitation refusée'),
        });
      },
    });
  };

  const renderInvitationItem = ({ item }: { item: ProjectInvitation }) => (
    <Card style={[styles.card, theme.shadows.soft]} mode="contained">
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryContainer }]}>
            <IconButton
              icon="email-outline"
              iconColor={theme.colors.onPrimaryContainer}
              size={20}
            />
          </View>
          <View style={styles.cardHeaderText}>
            <Text variant="titleMedium" style={styles.boldText}>
              Projet #{item.project}
            </Text>
            <Text variant="bodySmall" style={styles.dimText}>
              Invité par {item.inviter}
            </Text>
          </View>
        </View>

        <View style={styles.details}>
          <Text variant="bodyMedium">
            Rôle proposé: <Text style={styles.boldText}>{item.role}</Text>
          </Text>
          <Text variant="bodySmall" style={styles.receivedAtText}>
            Reçue le {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => handleReject(item.id)}
            style={styles.actionButton}
            disabled={isAccepting || isRejecting}
            textColor={theme.colors.error}
          >
            {t('common.reject', 'Refuser')}
          </Button>
          <Button
            mode="contained"
            onPress={() => handleAccept(item.id)}
            style={styles.actionButton}
            loading={isAccepting}
            disabled={isAccepting || isRejecting}
          >
            {t('common.accept', 'Accepter')}
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            paddingTop: insets.top + 16,
            borderBottomColor: theme.colors.outline + '20',
          },
        ]}
      >
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text variant="headlineSmall" style={styles.headerTitle}>
          {t('screens.invitations.title', 'Invitations')}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => item.id}
          renderItem={renderInvitationItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <IconButton icon="email-open-outline" size={64} style={styles.emptyIcon} />
              <Text variant="bodyLarge" style={styles.emptyText}>
                {t('screens.invitations.empty', 'Aucune invitation en attente')}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  boldText: {
    fontWeight: 'bold',
  },
  dimText: {
    opacity: 0.7,
  },
  details: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  receivedAtText: {
    marginTop: 4,
    opacity: 0.5,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    minWidth: 100,
    borderRadius: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyIcon: {
    opacity: 0.2,
  },
  emptyText: {
    opacity: 0.5,
  },
});
