import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, IconButton, Text, TextInput } from 'react-native-paper';

import { AnalysisResult, Resolution } from '@/modules/binaries/api/schemas';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

interface Props {
  analysis: AnalysisResult | null;
  onResolve: (resolution: Resolution) => void;
  onDismiss: () => void;
  isProcessing: boolean;
}

export const ConflictResolutionSheet: React.FC<Props> = ({
  analysis,
  onResolve,
  onDismiss,
  isProcessing,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const bottomSheetRef = React.useRef<BottomSheet>(null);

  const hasSignatureConflict =
    analysis !== null && analysis.decisions_needed.includes('app_conflict_signature');
  const hasDuplicate =
    analysis !== null && analysis.decisions_needed.includes('artifact_duplicate');

  const [action, setAction] = React.useState<'create_sibling' | 'override' | 'create_app'>(
    'create_sibling',
  );
  const [tag, setTag] = React.useState('debug');

  const snapPoints = React.useMemo(() => ['60%', '85%'], []);

  const renderBackdrop = React.useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.3} />
    ),
    [],
  );

  if (!analysis) return null;

  const handleConfirm = () => {
    onResolve({
      action,
      ...(action === 'create_sibling' ? { tag: tag.trim() || undefined } : {}),
    });
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onClose={onDismiss}
      enablePanDownToClose={!isProcessing}
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
              {t('screens.upload.analysis.title')}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {analysis.package_name} v{analysis.version_name} ({analysis.version_code})
            </Text>
          </View>
          <IconButton icon="close" onPress={onDismiss} disabled={isProcessing} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Card style={[styles.metaCard, { borderColor: theme.colors.outline + '20' }]}>
            <Card.Content>
              <Text variant="labelLarge" style={styles.sectionLabel}>
                {t('screens.upload.analysis.metadata_label')}
              </Text>
              <MetadataRow
                label={t('screens.upload.analysis.metadata_architecture')}
                value={analysis.architecture}
              />
              <MetadataRow
                label={t('screens.upload.analysis.metadata_hash')}
                value={analysis.hash.substring(0, 16) + '…'}
              />
              <MetadataRow
                label={t('screens.upload.analysis.metadata_debuggable')}
                value={analysis.is_debuggable ? t('common.yes') : t('common.no')}
              />
              <MetadataRow
                label={t('screens.upload.analysis.metadata_size')}
                value={`${Math.round(analysis.file_size / (1024 * 1024))} MB`}
              />
            </Card.Content>
          </Card>

          {hasSignatureConflict && (
            <Card style={[styles.conflictCard, { borderColor: theme.colors.error + '40' }]}>
              <Card.Content>
                <View style={styles.conflictHeader}>
                  <IconButton
                    icon="alert-circle-outline"
                    size={20}
                    iconColor={theme.colors.error}
                  />
                  <Text
                    variant="labelLarge"
                    style={[styles.conflictTitle, { color: theme.colors.error }]}
                  >
                    {t('screens.upload.analysis.conflict_signature_title')}
                  </Text>
                </View>
                <Text variant="bodyMedium" style={styles.conflictDesc}>
                  {t('screens.upload.analysis.conflict_signature_desc')}
                </Text>

                <View style={styles.actionGroup}>
                  <ActionOption
                    label={t('screens.upload.analysis.action_create_sibling_label')}
                    description={t('screens.upload.analysis.action_create_sibling_desc')}
                    selected={action === 'create_sibling'}
                    onSelect={() => setAction('create_sibling')}
                    primary={theme.colors.primary}
                    outline={theme.colors.outline}
                  />
                  {action === 'create_sibling' && (
                    <TextInput
                      label={t('screens.upload.analysis.tag_input_label')}
                      value={tag}
                      onChangeText={setTag}
                      mode="flat"
                      style={[styles.input, styles.inputTransparent]}
                      disabled={isProcessing}
                    />
                  )}
                  <ActionOption
                    label={t('screens.upload.analysis.action_override_label')}
                    description={t('screens.upload.analysis.action_override_desc')}
                    selected={action === 'override'}
                    onSelect={() => setAction('override')}
                    primary={theme.colors.primary}
                    outline={theme.colors.outline}
                  />
                </View>
              </Card.Content>
            </Card>
          )}

          {hasDuplicate && (
            <Card style={[styles.warningCard, { borderColor: theme.colors.accent + '40' }]}>
              <Card.Content>
                <View style={styles.conflictHeader}>
                  <IconButton
                    icon="information-outline"
                    size={20}
                    iconColor={theme.colors.accent}
                  />
                  <Text
                    variant="labelLarge"
                    style={[styles.conflictTitle, { color: theme.colors.accent }]}
                  >
                    {t('screens.upload.analysis.conflict_duplicate_title')}
                  </Text>
                </View>
                <Text variant="bodyMedium" style={styles.conflictDesc}>
                  {t('screens.upload.analysis.conflict_duplicate_desc')}
                </Text>
              </Card.Content>
            </Card>
          )}

          {!hasSignatureConflict && !hasDuplicate && (
            <Card style={[styles.successCard, { borderColor: theme.colors.primary + '30' }]}>
              <Card.Content>
                <View style={styles.conflictHeader}>
                  <IconButton
                    icon="check-circle-outline"
                    size={20}
                    iconColor={theme.colors.primary}
                  />
                  <Text
                    variant="labelLarge"
                    style={[styles.conflictTitle, { color: theme.colors.primary }]}
                  >
                    {t('screens.upload.analysis.no_conflict_title')}
                  </Text>
                </View>
                <Text variant="bodyMedium" style={styles.conflictDesc}>
                  {t('screens.upload.analysis.no_conflict_desc')}
                </Text>
              </Card.Content>
            </Card>
          )}
        </ScrollView>

        <View style={[styles.footer]}>
          <Button
            mode="contained"
            onPress={handleConfirm}
            loading={isProcessing}
            disabled={isProcessing}
            style={styles.confirmBtn}
            contentStyle={styles.confirmBtnContent}
          >
            {hasSignatureConflict || hasDuplicate
              ? t('screens.upload.analysis.confirm_with_conflicts')
              : t('screens.upload.analysis.confirm_clean')}
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

const MetadataRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.metaRow}>
    <Text variant="bodyMedium" style={styles.metaLabel}>
      {label}
    </Text>
    <Text variant="bodyMedium" style={styles.metaValue}>
      {value}
    </Text>
  </View>
);

interface ActionOptionProps {
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  primary: string;
  outline: string;
}

const ActionOption: React.FC<ActionOptionProps> = ({
  label,
  description,
  selected,
  onSelect,
  primary,
  outline,
}) => {
  const actionStyle = {
    borderColor: selected ? primary : outline + '30',
    backgroundColor: selected ? primary + '08' : 'transparent',
  };
  const radioOuterStyle = { borderColor: selected ? primary : outline };
  const radioInnerStyle = { backgroundColor: primary };
  const labelStyle = selected ? { color: primary } : null;

  return (
    <Pressable onPress={onSelect} style={[styles.actionOption, actionStyle]}>
      <View style={styles.actionOptionContent}>
        <View style={styles.actionRadio}>
          <View style={[styles.radioOuter, radioOuterStyle]}>
            {selected && <View style={[styles.radioInner, radioInnerStyle]} />}
          </View>
        </View>
        <View style={styles.actionTextContainer}>
          <Text variant="labelLarge" onPress={onSelect} style={[styles.actionLabel, labelStyle]}>
            {label}
          </Text>
          <Text variant="bodySmall" style={styles.actionDesc}>
            {description}
          </Text>
        </View>
      </View>
    </Pressable>
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
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  metaCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  metaLabel: {
    opacity: 0.6,
  },
  metaValue: {
    fontWeight: '600',
  },
  sectionLabel: {
    opacity: 0.4,
    letterSpacing: 1,
    fontWeight: '800',
    marginBottom: 12,
    fontSize: 11,
  },
  conflictCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  warningCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  successCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  conflictTitle: {
    fontWeight: '800',
  },
  conflictDesc: {
    opacity: 0.7,
    marginBottom: 16,
  },
  actionGroup: {
    gap: 8,
  },
  actionOption: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 4,
  },
  actionOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRadio: {
    marginRight: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionLabel: {
    fontWeight: '700',
    marginBottom: 2,
  },
  actionDesc: {
    opacity: 0.5,
  },
  input: {
    marginBottom: 8,
    marginTop: 4,
  },
  inputTransparent: {
    backgroundColor: 'transparent',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    paddingBottom: 32,
  },
  handleIndicator: {
    width: 40,
  },
  confirmBtn: {
    borderRadius: 16,
  },
  confirmBtnContent: {
    height: 52,
  },
});
