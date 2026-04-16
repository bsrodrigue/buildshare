import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
  textStyle?: StyleProp<TextStyle>;
  borderRadius?: number;
  /** Override the text color. Useful for `ghost` variant. */
  textColor?: string;
  /** Override font size using theme tokens. Defaults to `base`. */
  fontSize?: keyof Theme['fontSize'];
  /** Override font weight using theme tokens. Defaults to `bold`. */
  fontWeight?: keyof Theme['fontWeight'];
}

const ButtonBase = ({
  title,
  variant = 'primary',
  isLoading: loading = false,
  style,
  textStyle,
  disabled,
  borderRadius,
  textColor,
  fontSize,
  fontWeight,
  ...props
}: ButtonProps) => {
  const styles = useThemedStyles(createStyles);
  const theme = useThemedStyles((t) => t);
  const isDisabled = disabled || loading;

  const getVariantStyle = () => {
    if (isDisabled && variant !== 'ghost') return styles.disabledButton;
    switch (variant) {
      case 'ghost':
        return styles.ghostButton;
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      default:
        return styles.primaryButton;
    }
  };

  const getVariantTextStyle = () => {
    if (isDisabled) return variant === 'ghost' ? styles.ghostDisabledText : styles.disabledText;
    switch (variant) {
      case 'ghost':
        return styles.ghostText;
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      default:
        return styles.primaryText;
    }
  };

  const variantStyle = getVariantStyle();
  const variantTextStyle = getVariantTextStyle();

  return (
    <TouchableOpacity
      style={[styles.button, variantStyle, borderRadius != null && { borderRadius }, style]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={textColor ?? StyleSheet.flatten(variantTextStyle)?.color ?? theme.colors.text}
        />
      ) : (
        <Text
          style={[
            styles.text,
            variantTextStyle,
            fontSize && { fontSize: theme.fontSize[fontSize] },
            fontWeight && { fontWeight: theme.fontWeight[fontWeight] },
            textColor ? { color: textColor } : undefined,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export const Button = React.memo(ButtonBase);
Button.displayName = 'Button';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 200,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
    },
    outlineButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.text,
    },
    ghostButton: {
      backgroundColor: 'transparent',
      minWidth: 0,
      paddingHorizontal: 8,
    },
    disabledButton: {
      backgroundColor: theme.colors.disabled,
    },
    text: {
      fontSize: theme.fontSize.base,
      fontWeight: theme.fontWeight.bold,
      letterSpacing: 0.5,
    },
    primaryText: {
      color: theme.colors.textOnPrimary,
    },
    secondaryText: {
      color: theme.colors.primary,
    },
    outlineText: {
      color: theme.colors.text,
    },
    ghostText: {
      color: theme.colors.text,
    },
    disabledText: {
      color: theme.colors.textOnPrimary,
      opacity: 0.7,
    },
    ghostDisabledText: {
      color: theme.colors.text,
      opacity: 0.4,
    },
  });
