import { router,useLocalSearchParams } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl,StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, FAB, IconButton, List, Surface, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApplications } from '@/modules/binaries/api/hooks';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams();
  const projectId = parseInt(id as string, 10);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const { 
    data: applications, 
    isLoading, 
    isRefetching, 
    refetch 
  } = useApplications(projectId);

  const renderAppItem = ({ item }: { item: any }) => (
    <Surface style={[styles.appCard, { backgroundColor: theme.colors.background }]}>
      <List.Item
        title={item.title}
        description={item.app_id}
        titleStyle={[styles.appTitle, { color: theme.colors.text }]}
        descriptionStyle={[styles.appSubtitle, { color: theme.colors.onSurfaceVariant }]}
        onPress={() => router.push(`/(protected)/apps/${item.id}` as any)}
        left={(props) => (
          <View style={[styles.avatarContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
            <Avatar.Icon 
              {...props} 
              icon="android" 
              size={32}
              style={styles.avatarIcon} 
              color={theme.colors.onSecondaryContainer} 
            />
          </View>
        )}
        right={(props) => (
          <View style={styles.row}>
            <IconButton
              {...props}
              icon="chevron-right"
              iconColor={theme.colors.onSurfaceVariant}
              onPress={() => router.push(`/(protected)/apps/${item.id}` as any)}
            />
          </View>
        )}
        style={styles.listItem}
      />
    </Surface>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline + '20' }]}>
        <IconButton icon="arrow-left" iconColor={theme.colors.onSurfaceVariant} onPress={() => router.back()} />
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
          Applications
        </Text>
        <IconButton 
          icon="clock-outline" 
          iconColor={theme.colors.onSurfaceVariant}
          onPress={() => router.push({
            pathname: '/(protected)/activity',
            params: { projectId }
          })} 
        />
      </View>

      <FlatList
        data={applications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderAppItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge">Aucune application.</Text>
            <Text variant="bodySmall">Propulsez un APK pour commencer.</Text>
          </View>
        }
      />

      <FAB
        icon="cloud-upload"
        label="Propulser un APK"
        variant="secondary"
        mode="elevated"
        style={[
          styles.fab,
          { bottom: insets.bottom + 16 },
        ]}
        onPress={() => router.push({
          pathname: `/(protected)/projects/${projectId}/upload` as any,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 64,
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
    paddingBottom: 100,
  },
  appCard: {
    marginBottom: 16,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  listItem: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  appTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  appSubtitle: {
    fontSize: 13,
    opacity: 0.6,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginLeft: 8,
  },
  avatarIcon: {
    backgroundColor: 'transparent',
    margin: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
