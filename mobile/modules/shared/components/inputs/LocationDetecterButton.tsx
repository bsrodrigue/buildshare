import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

import { GeolocationService } from '@/libs/geolocation/geolocation';
import type { Theme } from '@/modules/shared/theme';
import { toAlpha } from '@/modules/shared/theme/colors';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface LocationDetecterButtonProps {
  onLocationDetected: (latitude: number, longitude: number) => void;
  style?: ViewStyle;
}

export const LocationDetecterButton = ({
  onLocationDetected,
  style,
}: LocationDetecterButtonProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isDetecting, setIsDetecting] = useState(false);

  const handleDetectLocation = async () => {
    setIsDetecting(true);
    try {
      const hasPermission = await GeolocationService.hasPermissions();
      if (!hasPermission) {
        const permission = await GeolocationService.requestPermissions();
        if (permission.status !== 'granted') {
          alert('Permission de localisation refusée');
          setIsDetecting(false);
          return;
        }
      }

      const position = await GeolocationService.getCurrentPosition({
        accuracy: 'high',
      });

      onLocationDetected(position.coords.latitude, position.coords.longitude);
    } catch (error) {
      console.error('Failed to detect location:', error);
      alert('Impossible de détecter la position');
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handleDetectLocation}
      disabled={isDetecting}
    >
      {isDetecting ? (
        <ActivityIndicator size="small" color={theme.colors.accent} />
      ) : (
        <>
          <Ionicons name="location-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.text}>Ma position</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: toAlpha(theme.colors.accent, 0.1),
      borderRadius: 20,
      gap: 6,
      alignSelf: 'flex-start',
    },
    text: {
      color: theme.colors.accent,
      fontSize: 12,
      fontWeight: 'bold',
    },
  });
