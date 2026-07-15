// src/Screen/HomeScreen.js
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Image,
  TextInput,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { getAllCourses } from '../Services/courseService';
import { getUserProfile } from '../Services/authService';
import CourseCard from '../Components/CourseCard';
import { useAuth } from '../Context/AuthContext';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState([]);
  /** Fresh Firestore profile so Home reflects purchases without waiting on AuthContext cache */
  const [profileSnapshot, setProfileSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Header animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setProfileSnapshot(null);
  }, [user?.uid]);

  useEffect(() => {
    startPulseAnimation();
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  };

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const uid = user?.uid;
      const [coursesResult, profileResult] = await Promise.all([
        getAllCourses(),
        uid ? getUserProfile(uid) : Promise.resolve({ success: false }),
      ]);

      if (coursesResult.success) {
        setCourses(coursesResult.courses);
        setError(null);
      } else {
        setError(coursesResult.error || 'Failed to load courses');
      }

      if (profileResult.success && profileResult.user) {
        setProfileSnapshot(profileResult.user);
      } else if (!uid) {
        setProfileSnapshot(null);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useFocusEffect(
    useCallback(() => {
      fetchCourses();
    }, [fetchCourses])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourses();
  };

  const ownershipSource = profileSnapshot ?? user;

  /** Purchased / enrolled courses live in My Courses only — hide them from Home */
  const availableCourses = useMemo(() => {
    if (!courses || !Array.isArray(courses)) return [];

    const userPurchasedCourseIds = ownershipSource?.purchasedCourses || [];
    const enrolled = ownershipSource?.EnrolledCourses || [];
    const enrolledIds = enrolled.map((c) => c.courseId).filter(Boolean);
    const allOwnedIds = new Set([...userPurchasedCourseIds, ...enrolledIds]);

    return courses.filter((course) => {
      const isOwnedById = allOwnedIds.has(course.id);
      const isOwnedByTitle = enrolled.some(
        (c) =>
          c.courseTitle === (course.courseTitle || course.title) ||
          c.title === (course.courseTitle || course.title)
      );
      return !(isOwnedById || isOwnedByTitle);
    });
  }, [courses, ownershipSource]);

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return availableCourses;

    const query = searchQuery.toLowerCase().trim();
    return availableCourses.filter((course) => {
      return (
        (course.title || '').toLowerCase().includes(query) ||
        (course.membershipType || '').toLowerCase().includes(query) ||
        (course.description || '').toLowerCase().includes(query)
      );
    });
  }, [availableCourses, searchQuery]);

  const handleCoursePress = (courseId) => {
    navigation.navigate('BuyCourseDetail', { courseId });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Branding Section */}
      <View style={styles.brandingSection}>
        <View style={styles.logoAndTitle}>
          <Image 
            source={require('../assets/Logo1.jpeg')} 
            style={styles.brandingLogo} 
            resizeMode="contain" 
          />
          <Text style={styles.brandingTitle}>BRAHMA DIVINE GRACE</Text>
        </View>
      </View>

      <View style={styles.heroSection}>
        {/* Availability Badge */}
        <View style={styles.badge}>
          <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
          <Text style={styles.badgeText}>
            {availableCourses.length}{' '}
            {availableCourses.length === 1 ? 'Course' : 'Courses'} Available
          </Text>
        </View>

        {/* Hero Text */}
        <Text style={styles.heroText}>
          Discover Your Next{'\n'}
          <Text style={styles.heroHighlight}>Learning Adventure ✨</Text>
        </Text>
        
        <Text style={styles.heroSub}>
          Explore our curated collection of premium courses designed to transform your skills.
        </Text>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Icon name="search" size={24} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={24} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Icon name="local-fire-department" size={24} color="#DC2626" />
            <Text style={styles.sectionTitle}>Featured Courses</Text>
          </View>
          {searchQuery && (
            <Text style={styles.resultCount}>
              {filteredCourses.length} result{filteredCourses.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Icon name={searchQuery ? "search-off" : "auto-stories"} size={48} color="#999" />
      </View>
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No courses found' : 'No courses available'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Try adjusting your search terms' 
          : courses.length > 0 
            ? 'You have purchased all available courses! 🎉' 
            : 'Check back soon for new courses!'}
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading courses...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <FlatList
        data={filteredCourses}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <CourseCard
              courseId={item.id}
              title={item.title || item.courseTitle}
              membershipType={item.membershipType}
              thumbnail={item.thumbnail || item.courseThumbnail}
              status={item.status}
              progress={0}
              chapters={item.chapters || 0}
              isPurchased={false}
              price={item.discountPrice ?? item.coursePrice ?? item.price}
              showStatus={false}
              onCourseClick={handleCoursePress}
            />
          </View>
        )}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC2626']} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Pure white background for modern look
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  brandingSection: {
    paddingHorizontal: 16,
    paddingTop: 32, // Added extra top padding to avoid camera notch
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  logoAndTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandingLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  brandingTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  header: {
    backgroundColor: '#fff',
  },
  heroSection: {
    padding: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991b1b',
  },
  heroText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
    lineHeight: 38,
  },
  heroHighlight: {
    color: '#DC2626',
  },
  heroSub: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 12,
    lineHeight: 22,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    height: 54,
    marginTop: 24,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  sectionHeader: {
    marginTop: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  resultCount: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 40,
  },
  cardContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4b5563',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default HomeScreen;