import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, HelperText, Portal, Text, TextInput, useTheme } from 'react-native-paper';

import { AppConfig } from '@/libs/app-config';
import { env } from '@/libs/env';
import { createLogger } from '@/libs/log';
import { toast } from '@/libs/notification/toast';

const logger = createLogger('ApiConfigModal');

interface ApiConfigModalProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Dialog that lets users swap the API base URL at runtime.
 * This is useful for self-hosting or pointing the app to a different backend instance.
 * The change is persisted in AsyncStorage and takes effect immediately.
 */
export function ApiConfigModal({ visible, onDismiss }: ApiConfigModalProps) {
  const theme = useTheme();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Pre-fill with the currently active URL whenever the dialog opens.
  useEffect(() => {
    if (!visible) return;
    void AppConfig.getApiUrl().then((currentUrl) => {
      setUrl(currentUrl);
      setError(null);
    });
  }, [visible]);

  const validate = (value: string): boolean => {
    try {
      new URL(value);
      setError(null);
      return true;
    } catch {
      setError('Please enter a valid URL (e.g. http://192.168.1.10:8000)');
      return false;
    }
  };

  const handleSave = async () => {
    if (!validate(url)) return;
    setIsSaving(true);
    try {
      await AppConfig.setApiUrl(url);
      toast.success('API URL updated', url);
      logger.info(`API URL changed to: ${url}`);
      onDismiss();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save URL';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await AppConfig.clearApiUrl();
      toast.success('API URL reset', env.API_URL);
      onDismiss();
    } catch (err) {
      logger.error(`Failed to reset API URL: ${String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
            API Configuration
          </Text>
        </Dialog.Title>

        <Dialog.Content>
          <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
            Configure the API base URL. This change allows pointing the app to a self-hosted
            backend. Reverts to default on reset.
          </Text>

          <View style={styles.inputGroup}>
            <TextInput
              mode="outlined"
              label="Base URL"
              value={url}
              onChangeText={(v) => {
                setUrl(v);
                if (error) validate(v);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              error={!!error}
              style={styles.input}
            />
            {!!error && (
              <HelperText type="error" visible>
                {error}
              </HelperText>
            )}
          </View>

          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            Default: {env.API_URL}
          </Text>
        </Dialog.Content>

        <Dialog.Actions>
          <Button
            onPress={() => {
              void handleReset();
            }}
            disabled={isSaving}
            textColor={theme.colors.error}
          >
            Reset
          </Button>
          <Button onPress={onDismiss} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={() => {
              void handleSave();
            }}
            loading={isSaving}
            disabled={isSaving}
          >
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 28,
  },
  hint: {
    marginBottom: 16,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 12,
  },
  input: {
    fontSize: 14,
  },
});
