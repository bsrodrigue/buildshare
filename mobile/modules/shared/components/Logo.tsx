import { Image, ImageStyle } from 'expo-image';
import { StyleProp } from 'react-native';

import { Assets } from '@/libs/assets';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

const SIZES = {
  sm: { width: 60, height: 30 },
  md: { width: 80, height: 40 },
  lg: { width: 120, height: 60 },
  xl: { width: 150, height: 75 },
} as const;

interface LogoProps {
  size?: keyof typeof SIZES;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

export const Logo = ({ size = 'lg', style, contentFit = 'cover' }: LogoProps) => {
  const { colorScheme } = useTheme();
  const { width, height } = SIZES[size];

  const source =
    colorScheme === 'dark' ? Assets.images.logos.songreLogoDarkMode : Assets.images.logos.logo;

  return (
    <Image
      source={source}
      style={[{ width, height }, style]}
      contentFit={contentFit}
      transition={150}
    />
  );
};
