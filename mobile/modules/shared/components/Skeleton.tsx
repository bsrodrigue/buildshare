import React, { useEffect } from 'react';
import { type DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/modules/shared/theme/ThemeProvider';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton = ({ width, height, borderRadius, style }: SkeletonProps) => {
  const theme = useTheme();
  const pulse = useSharedValue(0.3);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.7, { duration: 1000 }), -1, true);
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  const backgroundColor = theme.colorScheme === 'dark' ? '#333' : '#E1E9EE';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius || 4,
          backgroundColor,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};
