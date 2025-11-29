import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const ProgressBar = ({ progress = 0, height = 10 }) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  // Animated values
  const shimmerX = new Animated.Value(0);
  const shineX = new Animated.Value(0);
  const pulseScale = new Animated.Value(1);
  const progressWidth = new Animated.Value(0);

  // Shimmer animation (background shimmer effect)
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerX, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerX]);

  // Shine animation (animated shine effect)
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shineX, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(shineX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
      { interval: 1000 }
    ).start();
  }, [shineX]);

  // Pulse animation (pulse effect at the end)
  useEffect(() => {
    if (clampedProgress > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.5,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [clampedProgress, pulseScale]);

  // Progress width animation
  useEffect(() => {
    Animated.timing(progressWidth, {
      toValue: clampedProgress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [clampedProgress, progressWidth]);

  // Shimmer translateX
  const shimmerTranslateX = shimmerX.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  // Shine translateX
  const shineTranslateX = shineX.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.5, width * 1.5],
  });

  // Progress width percentage
  const progressWidthPercent = progressWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Background shimmer effect */}
      <LinearGradient
        colors={['#f3f4f6', '#e5e7eb', '#f3f4f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.backgroundContainer, { height }]}
      >
        {/* Shimmer overlay animation */}
        <Animated.View
          style={[
            styles.shimmerOverlay,
            {
              height,
              transform: [{ translateX: shimmerTranslateX }],
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Progress bar with gradient */}
        <Animated.View
          style={[
            styles.progressContainer,
            {
              height,
              width: progressWidthPercent,
            },
          ]}
        >
          <LinearGradient
            colors={['#dc2626', '#ef4444', '#f87171']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Glossy overlay effect */}
          <LinearGradient
            colors={[
              'rgba(255,255,255,0.3)',
              'transparent',
              'rgba(0,0,0,0.1)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Animated shine effect */}
          {clampedProgress > 0 && (
            <Animated.View
              style={[
                styles.shineEffect,
                {
                  height,
                  transform: [{ translateX: shineTranslateX }],
                },
              ]}
            >
              <LinearGradient
                colors={[
                  'transparent',
                  'rgba(255,255,255,0.6)',
                  'transparent',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}

          {/* Pulse effect at the end */}
          {clampedProgress > 0 && (
            <Animated.View
              style={[
                styles.pulseCircle,
                {
                  transform: [{ scale: pulseScale }],
                },
              ]}
            />
          )}
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  backgroundContainer: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  shimmerOverlay: {
    position: 'absolute',
    width: '50%',
    left: 0,
    top: 0,
    zIndex: 1,
  },
  progressContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 5,
  },
  shineEffect: {
    position: 'absolute',
    width: '50%',
    left: 0,
    top: 0,
  },
  pulseCircle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    right: 0,
    top: '50%',
    marginTop: -6,
    marginRight: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default ProgressBar;