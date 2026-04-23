import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  Avatar,
  IconButton,
  List,
  Text,
  useTheme,
} from 'react-native-paper';

import { toast } from '@/libs/notification/toast';
import { useAuthStore } from '@/modules/auth/store';
import { useProject, useProjectMembers, useRevokeMembership } from '@/modules/projects/api/hooks';
import { ProjectMember } from '@/modules/projects/api/schemas';

export default function ProjectMembersScreen() {
  const { id } = useLocalSearchParams();
  const projectId = parseInt(id as string, 10);
  const theme = useTheme();
  const { user } = useAuthStore();

  const { data: members, isLoading, refetch } = useProjectMembers(projectId);
  const { data: project } = useProject(projectId);
  const revokeMembership = useRevokeMembership();

  const handleRevoke = (memberId: number, memberEmail: string) => {
    Alert.alert("Révoquer l'accès", `Voulez-vous vraiment retirer l'accès à ${memberEmail} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Révoquer',
        style: 'destructive',
        onPress: () => {
          revokeMembership.mutate(
            { projectId, userId: memberId },
            {
              onSuccess: () => {
                toast.success('Accès révoqué');
                void refetch();
              },
              onError: (error) => {
                toast.error('Erreur', error.message);
              },
            },
          );
        },
      },
    ]);
  };

  const renderMember = ({ item }: { item: ProjectMember }) => {
    const isMe = item.user_id === user?.id;
    const canRevoke = project?.role === 'ADMIN' && !isMe;

    return (
      <List.Item
        title={`${item.first_name} ${item.last_name}`}
        description={`${item.email} • ${item.role}`}
        left={(props) => (
          <Avatar.Text
            {...props}
            label={(item.first_name || item.email).charAt(0).toUpperCase()}
            size={40}
          />
        )}
        right={(props) =>
          canRevoke ? (
            <IconButton
              {...props}
              icon="account-remove"
              iconColor={theme.colors.error}
              onPress={() => handleRevoke(item.user_id, item.email)}
            />
          ) : null
        }
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Membres du projet" />
      </Appbar.Header>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.user_id.toString()}
          renderItem={renderMember}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text>Aucun membre trouvé</Text>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
