import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SearchBar = ({ 
  value, 
  onChange, 
  onClear, 
  placeholder = "Search courses..." 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const borderGlowAnim = useRef(new Animated.Value(0)).current;
  const searchButtonScale = useRef(new Animated.Value(1)).current;

  // Initial entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Clear button animation
  useEffect(() => {
    if (value) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [value]);

  // Border glow animation on focus
  useEffect(() => {
    Animated.timing(borderGlowAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const handleSearchButtonPress = () => {
    Animated.sequence([
      Animated.timing(searchButtonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(searchButtonScale, {
        toValue: 1,
        tension: 100,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleClearPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClear();
    });
  };

  const borderColor = borderGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(229, 231, 235, 0.8)', '#DC2626'],
  });

  const shadowOpacity = borderGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.3],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-10, 0],
          })}],
        },
      ]}
    >
      {/* Animated border with glow effect */}
      <Animated.View
        style={[
          styles.glowBorder,
          {
            borderColor: borderColor,
            shadowOpacity: shadowOpacity,
          },
        ]}
      />

      {/* Main search container */}
      <View style={styles.searchContainer}>
        {/* Left Search Icon */}
        <View style={styles.leftIconContainer}>
          <Icon name="search" size={22} color="#DC2626" />
        </View>

        {/* Text Input */}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {/* Clear Button */}
        {value ? (
          <Animated.View
            style={[
              styles.clearButton,
              {
                opacity: scaleAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <TouchableOpacity
              onPress={handleClearPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Icon name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {/* Right Search Button */}
        <TouchableOpacity
          onPress={handleSearchButtonPress}
          activeOpacity={0.8}
          style={styles.rightButtonContainer}
        >
          <Animated.View
            style={[
              styles.searchButton,
              {
                transform: [{ scale: searchButtonScale }],
              },
            ]}
          >
            <Icon name="search" size={20} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  glowBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    paddingLeft: 16,
    paddingRight: 16,
    height: 52,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  leftIconContainer: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
    height: '100%',
  },
  clearButton: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});

export default SearchBar;