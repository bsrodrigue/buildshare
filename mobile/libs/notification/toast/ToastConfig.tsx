import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Surface, Text } from 'react-native-paper';
import { BaseToastProps, ToastConfig } from 'react-native-toast-message';

import { useTheme } from '@/modules/shared/theme/ThemeProvider';

const MD3Toast = ({
  text1,
  text2,
  type,
}: BaseToastProps & { type: 'success' | 'error' | 'info' }) => {
  const theme = useTheme();
  const { colors } = theme.paperTheme;

  let icon = 'information';
  let backgroundColor = colors.secondaryContainer;
  let textColor = colors.onSecondaryContainer;
  let iconColor = colors.onSecondaryContainer;

  if (type === 'success') {
    icon = 'check-circle';
    backgroundColor = colors.primaryContainer;
    textColor = colors.onPrimaryContainer;
    iconColor = colors.onPrimaryContainer;
  } else if (type === 'error') {
    icon = 'alert-circle';
    backgroundColor = colors.errorContainer;
    textColor = colors.onErrorContainer;
    iconColor = colors.onErrorContainer;
  }

  return (
    <Surface style={[styles.container, { backgroundColor }, theme.shadows.medium]} elevation={2}>
      <View style={styles.iconContainer}>
        <Avatar.Icon icon={icon} size={24} color={iconColor} style={styles.toastIcon} />
      </View>
      <View style={styles.content}>
        {text1 ? (
          <Text variant="titleSmall" style={[styles.textPrimary, { color: textColor }]}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text variant="bodySmall" style={[styles.textSecondary, { color: textColor }]}>
            {text2}
          </Text>
        ) : null}
      </View>
    </Surface>
  );
};

export const toastConfig: ToastConfig = {
  success: (props) => <MD3Toast {...props} type="success" />,
  error: (props) => <MD3Toast {...props} type="error" />,
  info: (props) => <MD3Toast {...props} type="info" />,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    minHeight: 56,
    width: '90%',
  },
  iconContainer: {
    marginRight: 12,
  },
  toastIcon: {
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  textPrimary: {
    fontWeight: 'bold',
  },
  textSecondary: {
    opacity: 0.8,
  },
});
