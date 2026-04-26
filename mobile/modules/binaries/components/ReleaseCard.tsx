import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Surface, Text } from 'react-native-paper';

import { formatTimelineDate } from '@/libs/utils/date';
import { Release, ReleaseArtifact } from '@/modules/binaries/api/schemas';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

interface ReleaseCardProps {
  release: Release;
  index: number;
  onDownload: (artifact: ReleaseArtifact) => void;
  onOpenBugs: (release: Release) => void;
  isAdmin?: boolean;
  onEditTags?: (release: Release) => void;
}

export function ReleaseCard({
  release,
  index,
  onDownload,
  onOpenBugs,
  isAdmin,
  onEditTags,
}: ReleaseCardProps) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  const cardVariants = [
    {
      primary: theme.colors.primary,
      container: theme.colors.primaryContainer,
      onContainer: theme.colors.onPrimaryContainer,
      icon: 'rocket-launch-outline',
    },
    {
      primary: theme.colors.accent,
      container: theme.colors.secondaryContainer,
      onContainer: theme.colors.onSecondaryContainer,
      icon: 'auto-fix',
    },
    {
      primary: theme.colors.tertiaryContainer,
      container: theme.colors.tertiaryContainer,
      onContainer: theme.colors.onTertiaryContainer,
      icon: 'cube-outline',
    },
  ];

  const variant = cardVariants[index % cardVariants.length];

  return (
    <Surface
      style={[
        styles.card,
        { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.outline + '20' },
      ]}
      elevation={0}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: variant.container }]}>
          <IconButton icon={variant.icon} size={24} iconColor={variant.onContainer} />
        </View>
        <View style={styles.titleContainer}>
          <View style={styles.versionRow}>
            <View style={styles.tagRow}>
              <Text variant="headlineSmall" style={styles.versionText}>
                v{release.version_id}
              </Text>
              {release.tags?.map((tag) => (
                <View
                  key={tag.id}
                  style={[
                    styles.tagBadge,
                    { backgroundColor: tag.color + '10', borderColor: tag.color + '30' },
                  ]}
                >
                  <Text style={[styles.tagText, { color: tag.color }]}>
                    {tag.name.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.textSecondary }}>
            {formatTimelineDate(release.created_at, i18n.language)} • Build {release.version_code}
          </Text>
        </View>
      </View>

      {/* Artifacts Section */}
      <View style={styles.artifactsList}>
        <View style={styles.sectionHeader}>
          <Text
            variant="labelLarge"
            style={[styles.sectionHeaderTitle, { color: theme.colors.primary }]}
          >
            {t('screens.release_list.artifact_title').toUpperCase()}
          </Text>
        </View>

        {release.artifacts?.map((artifact) => (
          <Pressable
            key={artifact.id}
            onPress={() => onDownload(artifact)}
            android_ripple={{ color: theme.colors.primary + '15', borderless: false }}
            style={[styles.artifactCard, { backgroundColor: theme.colors.surfaceVariant + '40' }]}
          >
            <View style={styles.artifactInfo}>
              <View style={styles.artifactIcon}>
                <IconButton icon="android" iconColor="#3DDC84" size={20} />
              </View>
              <View style={styles.artifactInfoTextContainer}>
                <Text
                  variant="labelLarge"
                  style={styles.artifactArchitectureText}
                  numberOfLines={1}
                >
                  {artifact.architecture || 'Universal APK'}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.textSecondary }}>
                  {artifact.file_size_display || 'N/A'} • APK
                </Text>
              </View>
            </View>
            <IconButton
              icon="download"
              mode="contained-tonal"
              containerColor={theme.colors.primary + '20'}
              iconColor={theme.colors.primary}
              size={18}
              style={styles.iconNoMargin}
              pointerEvents="none"
            />
          </Pressable>
        ))}
      </View>

      {/* Actions Footer */}
      <Pressable
        onPress={() => onOpenBugs(release)}
        android_ripple={{ color: theme.colors.primary + '20', borderless: false }}
        style={styles.footer}
      >
        <IconButton
          icon="bug-outline"
          iconColor={theme.colors.primary}
          style={[
            styles.iconNoMargin,
            release.open_bugs_count > 0 ? styles.opacityFull : styles.opacityPartial,
          ]}
          pointerEvents="none"
        />
        <Text
          variant="labelMedium"
          style={[
            styles.bugsText,
            { color: release.open_bugs_count > 0 ? theme.colors.error : theme.colors.primary },
          ]}
        >
          {release.bugs_count > 0
            ? t(
                release.bugs_count > 1
                  ? 'screens.release_list.bugs_count_plural'
                  : 'screens.release_list.bugs_count',
                { count: release.bugs_count, open: release.open_bugs_count },
              )
            : t('screens.release_list.bugs_button')}
        </Text>
      </Pressable>

      {isAdmin && onEditTags && (
        <Pressable
          onPress={() => onEditTags(release)}
          android_ripple={{ color: theme.colors.accent + '20', borderless: false }}
          style={[styles.footer, styles.footerNoBorderTop]}
        >
          <IconButton
            icon="tag-outline"
            iconColor={theme.colors.accent}
            style={styles.iconNoMargin}
            pointerEvents="none"
          />
          <Text
            variant="labelMedium"
            style={[styles.manageTagsText, { color: theme.colors.accent }]}
          >
            {t('screens.release_list.manage_tags', 'Gérer les tags')}
          </Text>
        </Pressable>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  versionText: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  notesText: {
    lineHeight: 20,
    opacity: 0.8,
  },
  artifactsList: {
    marginTop: 8,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  artifactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    paddingRight: 16,
    borderRadius: 20,
    marginBottom: 10,
  },
  artifactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  artifactIcon: {
    marginRight: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sectionHeaderTitle: {
    fontWeight: '700',
  },
  artifactInfoTextContainer: {
    flex: 1,
  },
  artifactArchitectureText: {
    fontWeight: '700',
  },
  iconNoMargin: {
    margin: 0,
  },
  bugsText: {
    fontWeight: '700',
  },
  footerNoBorderTop: {
    borderTopWidth: 0,
    marginTop: 0,
  },
  manageTagsText: {
    fontWeight: '600',
  },
  opacityFull: {
    opacity: 1,
  },
  opacityPartial: {
    opacity: 0.6,
  },
});
