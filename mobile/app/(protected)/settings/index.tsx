import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, IconButton, List, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/modules/auth/store';

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Surface
        style={[
          styles.header,
          { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface },
        ]}
        elevation={0}
      >
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text variant="headlineSmall" style={styles.headerTitle}>
          {t('screens.settings.title')}
        </Text>
      </Surface>

      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={styles.profileCard} elevation={0}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={[styles.avatarText, { color: theme.colors.onPrimaryContainer }]}>
              {(user?.first_name[0] || user?.email[0] || 'U').toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text variant="titleMedium" style={styles.userName}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text variant="bodySmall" style={styles.userEmail}>
              {user?.email}
            </Text>
          </View>
        </Surface>

        <List.Section>
          <List.Subheader>{t('screens.settings.account_section')}</List.Subheader>
          <List.Item
            title={t('screens.settings.change_password')}
            description={t('screens.settings.change_password_description')}
            left={(props) => <List.Icon {...props} icon="lock-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push('/(protected)/settings/change-password')}
          />
          <Divider />
          <List.Item
            title={t('screens.settings.change_email')}
            description={t('screens.settings.change_email_description')}
            left={(props) => <List.Icon {...props} icon="email-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push('/(protected)/settings/change-email')}
          />
          <Divider />
          <List.Item
            title={t('screens.settings.delete_account')}
            description={t('screens.settings.delete_account_description')}
            left={(props) => (
              <List.Icon {...props} icon="delete-outline" color={theme.colors.error} />
            )}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            titleColor={theme.colors.error}
            onPress={() => router.push('/(protected)/settings/delete-account')}
          />
        </List.Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: { fontWeight: '700' },
  content: { padding: 16 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: { fontWeight: 'bold', fontSize: 20 },
  userInfo: { flex: 1 },
  userName: { fontWeight: 'bold' },
  userEmail: { opacity: 0.6 },
});
