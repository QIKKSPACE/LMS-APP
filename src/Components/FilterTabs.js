import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';

const FilterTabs = ({ tabs, activeTab, onTabChange }) => {
  const scaleAnims = useRef(tabs.map(() => new Animated.Value(1))).current;
  const glowAnims = useRef(tabs.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    tabs.forEach((tab, index) => {
      if (activeTab === tab.id) {
        // Glow animation for active tab
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnims[index], {
              toValue: 1,
              duration: 1000,
              useNativeDriver: false,
            }),
            Animated.timing(glowAnims[index], {
              toValue: 0,
              duration: 1000,
              useNativeDriver: false,
            }),
          ])
        ).start();
      } else {
        glowAnims[index].setValue(0);
      }
    });
  }, [activeTab, tabs, glowAnims]);

  const handlePressIn = (index) => {
    Animated.spring(scaleAnims[index], {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (index) => {
    Animated.spring(scaleAnims[index], {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          
          return (
            <Animated.View
              key={tab.id}
              style={[
                styles.tabWrapper,
                { transform: [{ scale: scaleAnims[index] }] }
              ]}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onTabChange(tab.id)}
                onPressIn={() => handlePressIn(index)}
                onPressOut={() => handlePressOut(index)}
                style={styles.tabButton}>
                {isActive ? (
                  <>
                    {/* Active state with gradient */}
                    <LinearGradient
                      colors={['#dc2626', '#e11d48', '#dc2626']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.activeBackground}>
                      {/* Glow effect */}
                      <Animated.View
                        style={[
                          styles.glowEffect,
                          {
                            opacity: glowAnims[index],
                          }
                        ]}
                      />
                      
                      <Text style={styles.activeText}>{tab.label}</Text>
                      
                      {/* Active indicator dot */}
                      <View style={styles.activeDot} />
                    </LinearGradient>
                  </>
                ) : (
                  <>
                    {/* Inactive state */}
                    <View style={styles.inactiveBackground}>
                      <Text style={styles.inactiveText}>{tab.label}</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tabWrapper: {
    marginRight: 12,
  },
  tabButton: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
  },
  activeBackground: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  glowEffect: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 20,
    backgroundColor: 'rgba(220, 38, 38, 0.3)',
  },
  activeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  activeDot: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  inactiveBackground: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(229, 231, 235, 0.8)',
  },
  inactiveText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FilterTabs;