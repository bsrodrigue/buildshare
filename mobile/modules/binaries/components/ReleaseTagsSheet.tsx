import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, IconButton, Text, TextInput } from 'react-native-paper';

import { toast } from '@/libs/notification/toast';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

import { useCreateProjectTag, useProjectTags, useUpdateReleaseTags } from '../api/hooks';
import { Release, ReleaseTag } from '../api/schemas';

interface Props {
  release: Release | null;
  projectId: number;
  onDismiss: () => void;
}

const TAG_COLORS = [
  '#6200EE', // Primary
  '#00BFA5', // Teal
  '#FF7043', // Orange
  '#EC407A', // Pink
  '#7E57C2', // Deep Purple
  '#26A69A', // Green
  '#EF5350', // Red
  '#42A5F5', // Blue
];

export const ReleaseTagsSheet: React.FC<Props> = ({ release, projectId, onDismiss }) => {
  const theme = useTheme();
  const bottomSheetRef = React.useRef<BottomSheet>(null);

  const { data: projectTags, isLoading: isTagsLoading } = useProjectTags(projectId);
  const createTag = useCreateProjectTag(projectId);
  const updateReleaseTags = useUpdateReleaseTags();

  const [newTagName, setNewTagName] = React.useState('');
  const [selectedColor, setSelectedColor] = React.useState(TAG_COLORS[0]);
  const [isCreating, setIsCreating] = React.useState(false);

  const snapPoints = React.useMemo(() => ['65%', '90%'], []);

  const currentTagIds = React.useMemo(() => release?.tags?.map((t) => t.id) || [], [release]);

  const handleToggleTag = (tag: ReleaseTag) => {
    if (!release) return;

    const isSelected = currentTagIds.includes(tag.id);
    const newTagIds = isSelected
      ? currentTagIds.filter((id) => id !== tag.id)
      : [...currentTagIds, tag.id];

    updateReleaseTags.mutate({
      releaseId: release.id,
      tagIds: newTagIds,
      applicationId: release.application,
      projectId: projectId,
    });
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;

    createTag.mutate(
      {
        name: newTagName.trim(),
        color: selectedColor,
      },
      {
        onSuccess: () => {
          setNewTagName('');
          setIsCreating(false);
          toast.success('Tag créé !');
        },
        onError: (err) => {
          toast.error('Erreur', err.message);
        },
      },
    );
  };

  const renderBackdrop = React.useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.3} />
    ),
    [],
  );

  if (!release) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onClose={onDismiss}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={[
        styles.handleIndicator,
        { backgroundColor: theme.colors.outline + '40' },
      ]}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text variant="headlineSmall" style={styles.title}>
              Tags
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Gérer les étiquettes pour la v{release.version_id}
            </Text>
          </View>
          <IconButton
            icon={isCreating ? 'close-circle-outline' : 'plus-circle-outline'}
            onPress={() => setIsCreating(!isCreating)}
            iconColor={isCreating ? theme.colors.error : theme.colors.primary}
            size={28}
          />
        </View>

        {isCreating && (
          <View style={[styles.createContainer, { borderColor: theme.colors.outline + '20' }]}>
            <TextInput
              label="Nom du nouveau tag"
              value={newTagName}
              onChangeText={setNewTagName}
              mode="flat"
              style={[styles.input, styles.inputTransparent]}
              autoFocus
            />
            <View style={styles.colorRow}>
              {TAG_COLORS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setSelectedColor(color)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    selectedColor === color && [
                      styles.colorCircleSelected,
                      { borderColor: theme.colors.primary, transform: [{ scale: 1.1 }] },
                    ],
                  ]}
                />
              ))}
            </View>
            <Button
              mode="contained"
              onPress={handleCreateTag}
              loading={createTag.isPending}
              disabled={!newTagName.trim()}
              style={styles.createBtn}
              contentStyle={styles.createBtnContent}
            >
              Créer le tag
            </Button>
          </View>
        )}

        {isTagsLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text variant="labelLarge" style={styles.sectionLabel}>
              TAGS DISPONIBLES
            </Text>
            <View style={styles.tagsGrid}>
              {projectTags?.map((tag) => {
                const isSelected = currentTagIds.includes(tag.id);
                return (
                  <Pressable
                    key={tag.id}
                    onPress={() => handleToggleTag(tag)}
                    style={[
                      styles.tagItem,
                      {
                        backgroundColor: isSelected
                          ? tag.color + '10'
                          : theme.colors.surfaceVariant + '40',
                      },
                      isSelected ? { borderColor: tag.color } : styles.tagItemBorderTransparent,
                    ]}
                  >
                    <View style={styles.indicatorContainer}>
                      {isSelected ? (
                        <IconButton
                          icon="check"
                          size={18}
                          iconColor={tag.color}
                          style={styles.checkIcon}
                        />
                      ) : (
                        <View style={[styles.dot, { backgroundColor: tag.color }]} />
                      )}
                    </View>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.tagLabel,
                        { color: isSelected ? tag.color : theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {tag.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {projectTags?.length === 0 && !isCreating && (
              <View style={styles.empty}>
                <IconButton icon="tag-off-outline" size={48} style={styles.emptyIcon} />
                <Text variant="bodyMedium" style={styles.emptyText}>
                  Aucun tag n&apos;a encore été créé pour ce projet.
                </Text>
                <Button mode="text" onPress={() => setIsCreating(true)} style={styles.emptyBtn}>
                  Ajouter le premier
                </Button>
              </View>
            )}
          </ScrollView>
        )}

        <View style={[styles.footer, styles.footerPadding]}>
          <Button
            mode="contained-tonal"
            onPress={onDismiss}
            style={styles.closeBtn}
            contentStyle={styles.closeBtnContent}
          >
            Fermer
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  createContainer: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  input: {
    marginBottom: 16,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  createBtn: {
    borderRadius: 14,
  },
  sectionLabel: {
    opacity: 0.4,
    letterSpacing: 1,
    fontWeight: '800',
    marginBottom: 16,
    fontSize: 11,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-start',
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  indicatorContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  checkIcon: {
    margin: 0,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tagLabel: {
    fontWeight: '800',
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  center: {
    marginTop: 40,
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
  },
  handleIndicator: {
    width: 40,
  },
  inputTransparent: {
    backgroundColor: 'transparent',
  },
  colorCircleSelected: {
    borderWidth: 2,
  },
  createBtnContent: {
    height: 48,
  },
  tagItemBorderTransparent: {
    borderColor: 'transparent',
  },
  emptyIcon: {
    opacity: 0.2,
  },
  emptyText: {
    opacity: 0.5,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 8,
  },
  footerPadding: {
    paddingBottom: 32,
  },
  closeBtn: {
    borderRadius: 16,
  },
  closeBtnContent: {
    height: 52,
  },
});
