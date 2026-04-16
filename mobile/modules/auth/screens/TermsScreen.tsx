import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/modules/shared/components/inputs/Button';
import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';
import privacyPolicy from '@/privacy-policy.json';

const TermsScreen = () => {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{privacyPolicy.policy.title}</Text>
        <Text style={styles.lastUpdated}>Dernière mise à jour : {privacyPolicy.last_updated}</Text>

        {privacyPolicy.policy.sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Retour" onPress={() => router.back()} fontSize="sm" fontWeight="medium" />
      </View>
    </View>
  );
};

TermsScreen.displayName = 'TermsScreen';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
    },
    title: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
      marginTop: theme.spacing.md,
    },
    lastUpdated: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: theme.fontSize.base,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    sectionContent: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 22,
    },
    footer: {
      padding: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
  });

export default TermsScreen;
