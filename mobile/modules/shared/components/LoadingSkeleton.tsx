import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function SkeletonLoader() {
  const pulse = useSharedValue(0.3);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.7, { duration: 1000 }),
      -1, // infinite
      true, // reverse
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.avatar, animatedStyle]} />
      <View style={styles.textContainer}>
        <Animated.View style={[styles.titleLine, animatedStyle]} />
        <Animated.View style={[styles.subtitleLine, animatedStyle]} />
      </View>
    </View>
  );
}

export function SkeletonLoaderGroup({ count = 5, gap = 20 }: { count?: number; gap?: number }) {
  const groupStyles = StyleSheet.create({
    container: {
      gap,
      marginTop: 20,
    },
  });

  return (
    <View style={groupStyles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonLoader key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E1E9EE',
  },
  textContainer: {
    marginLeft: 20,
    flex: 1,
  },
  titleLine: {
    width: '60%',
    height: 20,
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
    marginBottom: 10,
  },
  subtitleLine: {
    width: '40%',
    height: 20,
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
  },
});
