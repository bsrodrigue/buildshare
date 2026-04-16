import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

const { width, height } = Dimensions.get('window');

interface ImageVisualizerProps {
  images: string[];
  visible: boolean;
  initialIndex: number;
  onClose: () => void;
}

export const ImageVisualizer = ({
  images,
  visible,
  initialIndex,
  onClose,
}: ImageVisualizerProps) => {
  const styles = useThemedStyles(createStyles);
  const [activeIndex, setActiveIndex] = React.useState(initialIndex);

  React.useEffect(() => {
    if (visible) {
      setActiveIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / width);
    setActiveIndex(index);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Background Blur or Semi-transparent */}
        <View style={[StyleSheet.absoluteFill, styles.backdrop]} />

        {/* Header with Close Button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Main Content - Swipable Images */}
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: item }}
                style={styles.fullImage}
                contentFit="contain"
                transition={300}
              />
            </View>
          )}
        />

        {/* Footer with Pagination Info */}
        {images.length > 1 && (
          <View style={styles.footer}>
            <View style={styles.paginationDotContainer}>
              {images.map((_, index) => (
                <View key={index} style={[styles.dot, activeIndex === index && styles.activeDot]} />
              ))}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    backdrop: {
      backgroundColor: 'rgba(0,0,0,0.9)',
    },
    header: {
      position: 'absolute',
      top: 60,
      right: 20,
      zIndex: 10,
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageWrapper: {
      width: width,
      height: height,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullImage: {
      width: width,
      height: height * 0.8,
    },
    footer: {
      position: 'absolute',
      bottom: 50,
      width: '100%',
      alignItems: 'center',
    },
    paginationDotContainer: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    activeDot: {
      backgroundColor: theme.colors.accent,
      width: 10,
      height: 10,
    },
  });
