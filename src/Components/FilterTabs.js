// src/components/FilterTabs.jsx - React Native Version
import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { useEffect } from 'react';

const FilterTabs = ({ tabs, activeTab, onTabChange }) => {
  const scrollViewRef = useRef(null);
  const animatedValues = useRef(tabs.map(() => new Animated.Value(0))).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;

  // Glow animation for active tab
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [glowAnimation]);

  // Animate tab entrance
  useEffect(() => {
    tabs.forEach((_, index) => {
      Animated.timing(animatedValues[index], {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  // Scroll to active tab
  useEffect(() => {
    const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (activeIndex !== -1 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToIndex({
          index: activeIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }, 100);
    }
  }, [activeTab]);

  const glowOpacity = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  const shadowRadius = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 30],
  });

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      contentContainerStyle={{
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 12,
      }}
      style={{
        overflow: 'visible',
      }}
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;

        const animStyle = {
          opacity: animatedValues[index],
          transform: [
            {
              translateY: animatedValues[index].interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              }),
            },
          ],
        };

        return (
          <Animated.View
            key={tab.id}
            style={[animStyle, { overflow: 'visible' }]}
          >
            <TouchableOpacity
              onPress={() => onTabChange(tab.id)}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 24,
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
              }}
            >
              {/* Background */}
              {isActive ? (
                <>
                  {/* Active: Red gradient background */}
                  <View
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(90deg, #dc2626, #e11d48, #b91c1c)',
                      borderRadius: 24,
                    }}
                  />

                  {/* Glow effect */}
                  <Animated.View
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 24,
                      shadowColor: '#dc2626',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: glowOpacity,
                      shadowRadius: shadowRadius,
                      elevation: 8,
                    }}
                  />

                  {/* Shine/shimmer effect */}
                  <View
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 24,
                    }}
                  />

                  {/* Active indicator dot */}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -4,
                      left: '50%',
                      marginLeft: -4,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#fff',
                    }}
                  />
                </>
              ) : (
                <>
                  {/* Inactive: White background with border */}
                  <View
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: 24,
                      borderWidth: 2,
                      borderColor: 'rgba(229, 231, 235, 0.8)',
                    }}
                  />

                  {/* Hover effect background */}
                  <View
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(254, 226, 226, 0.3)',
                      borderRadius: 24,
                      opacity: 0.6,
                    }}
                  />
                </>
              )}

              {/* Text */}
              <Text
                style={{
                  position: 'relative',
                  zIndex: 10,
                  fontSize: 14,
                  fontWeight: '600',
                  color: isActive ? '#fff' : '#374151',
                  letterSpacing: 0.3,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
};

export default FilterTabs;