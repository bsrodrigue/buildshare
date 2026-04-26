import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Divider, IconButton, Surface, Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '@/libs/notification/toast';
import {
  useBug,
  useBugMessages,
  useBugTransition,
  useCreateBugMessage,
} from '@/modules/binaries/api/hooks';
import { BugMessage, BugReport } from '@/modules/binaries/api/schemas';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

interface BugReportSheetProps {
  bug: BugReport | null;
  projectRole?: string | null;
  onDismiss: () => void;
}

export function BugReportSheet({ bug, projectRole, onDismiss }: BugReportSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%', '95%'], []);

  const [text, setText] = useState('');
  const sendButtonAnim = useSharedValue(0);

  useEffect(() => {
    sendButtonAnim.value = withTiming(text.trim() ? 1 : 0, { duration: 300 });
  }, [text, sendButtonAnim]);

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: sendButtonAnim.value }],
      opacity: sendButtonAnim.value,
    };
  });

  const { data: messages, isLoading, refetch: refetchMessages } = useBugMessages(bug?.id ?? 0);
  const { data: bugData, refetch: refetchBug } = useBug(bug?.id ?? 0);
  const createMessage = useCreateBugMessage();
  const transitionMutation = useBugTransition();

  const currentBug = bugData || bug;
  const visible = bug !== null;
  const isAdmin = projectRole === 'ADMIN';

  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
      void refetchMessages();
      void refetchBug();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible, refetchMessages, refetchBug]);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const handleSend = () => {
    if (!bug || !text.trim() || createMessage.isPending) return;

    createMessage.mutate(
      { bugId: bug.id, params: { text: text.trim() } },
      {
        onSuccess: () => {
          setText('');
          Keyboard.dismiss();
        },
        onError: (error) => {
          toast.error(t('screens.bugs.error_send'), error.message);
        },
      },
    );
  };

  const handleTransition = (transition: string) => {
    if (!currentBug) return;
    transitionMutation.mutate({ bugId: currentBug.id, transition });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return theme.colors.outline;
      case 'OPENED':
        return theme.colors.error;
      case 'RESOLVED':
        return '#4CAF50';
      case 'REOPENED':
        return theme.colors.error;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const renderMessage = ({ item }: { item: BugMessage }) => (
    <View style={styles.messageItem}>
      <View style={styles.messageHeader}>
        <Text variant="labelMedium" style={[styles.userName, { color: theme.colors.primary }]}>
          {[item.user.first_name, item.user.last_name].filter(Boolean).join(' ') || item.user.email}
        </Text>
        <Text
          variant="labelSmall"
          style={[styles.messageDate, { color: theme.colors.onSurfaceVariant }]}
        >
          {new Date(item.created_at).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
        {item.text}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.detailContainer}>
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusLabel,
            { backgroundColor: getStatusColor(currentBug?.status ?? '') + '20' },
          ]}
        >
          <Text
            variant="labelSmall"
            style={[styles.statusText, { color: getStatusColor(currentBug?.status ?? '') }]}
          >
            {currentBug?.status_display.toUpperCase()}
          </Text>
        </View>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('screens.bugs.reported_at', {
            date: new Date(currentBug?.created_at ?? '').toLocaleDateString(),
          })}
        </Text>
      </View>

      <Text variant="bodyMedium" style={styles.bugDescription}>
        {currentBug?.description}
      </Text>

      <View style={styles.actions}>
        {currentBug?.status === 'DRAFT' && (
          <Button
            mode="contained"
            onPress={() => handleTransition('publish')}
            loading={transitionMutation.isPending}
            style={styles.actionBtn}
          >
            {t('screens.bugs.publish_action')}
          </Button>
        )}
        {(currentBug?.status === 'OPENED' || currentBug?.status === 'REOPENED') && isAdmin && (
          <Button
            icon="check-circle"
            mode="contained"
            buttonColor="#4CAF50"
            onPress={() => handleTransition('resolve')}
            loading={transitionMutation.isPending}
            style={styles.actionBtn}
          >
            {t('screens.bugs.resolve_action')}
          </Button>
        )}
        {currentBug?.status === 'RESOLVED' && (
          <Button
            mode="outlined"
            onPress={() => handleTransition('reopen')}
            loading={transitionMutation.isPending}
            style={styles.actionBtn}
          >
            {t('screens.bugs.reopen_action')}
          </Button>
        )}
      </View>

      <Divider style={styles.divider} />
      <Text variant="titleMedium" style={styles.discussionTitle}>
        {t('screens.bugs.discussion_title')}
      </Text>
    </View>
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={1}
      snapPoints={snapPoints}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={[
        styles.handleIndicator,
        { backgroundColor: theme.colors.onSurfaceVariant },
      ]}
    >
      <BottomSheetView style={styles.sheetContent}>
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.title}>
            {t('screens.bugs.detail_title', { id: bug?.id })}
          </Text>
          <IconButton
            icon="close"
            size={20}
            onPress={() => bottomSheetModalRef.current?.dismiss()}
          />
        </View>

        <Divider />

        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : (
            <BottomSheetFlatList
              data={messages}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderMessage}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {t('common.empty', { defaultValue: 'Aucun message.' })}
                  </Text>
                </View>
              }
            />
          )}
        </View>

        <View
          style={[styles.floatingInputContainer, { marginBottom: Math.max(insets.bottom, 16) }]}
        >
          <Surface style={styles.floatingCard} elevation={1}>
            <BottomSheetTextInput
              placeholder={t('screens.bugs.comment_placeholder')}
              placeholderTextColor={theme.colors.onSurfaceVariant + '60'}
              value={text}
              onChangeText={setText}
              multiline
              style={[
                styles.modernInput,
                {
                  color: theme.colors.onSurface,
                },
              ]}
            />

            <Animated.View style={animatedButtonStyle}>
              <IconButton
                icon="arrow-up"
                mode="contained"
                containerColor={theme.colors.primary}
                iconColor={theme.colors.onPrimary}
                size={22}
                onPress={handleSend}
                disabled={!text.trim() || createMessage.isPending}
                style={styles.floatingSendButton}
              />
            </Animated.View>
          </Surface>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 4,
  },
  title: {
    fontWeight: '700',
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  detailContainer: {
    paddingTop: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bugTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bugDescription: {
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    borderRadius: 8,
  },
  messageItem: {
    paddingVertical: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  center: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingTop: 32,
    alignItems: 'center',
  },
  userName: {
    fontWeight: 'bold',
  },
  messageDate: {
    opacity: 0.6,
  },
  statusText: {
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
  },
  discussionTitle: {
    marginBottom: 8,
    fontWeight: '700',
  },
  handleIndicator: {
    opacity: 0.4,
  },
  floatingInputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  floatingCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 56,
  },
  modernInput: {
    flex: 1,
    paddingVertical: 10,
    minHeight: 40,
    maxHeight: 150,
    fontSize: 16,
    lineHeight: 22,
  },
  floatingSendButton: {
    margin: 4,
    borderRadius: 20,
  },
});
