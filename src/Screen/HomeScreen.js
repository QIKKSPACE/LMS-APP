import React, { useMemo, useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Image,
  TextInput,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { Animated } from 'react-native';
import { getAllCourses, getUserCourses } from '../Services/courseService';
import CourseCard from '../Components/CourseCard'
import { useAuth } from '../Context/AuthContext';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation, onCourseClick }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState([]);
  const [userEnrolledCourses, setUserEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const flatListRef = React.useRef(null);
  const scrollY = new Animated.Value(0);

  // Fetch courses from Firestore
  useEffect(() => {
    fetchCourses();
  }, [user]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      console.log('🔄 Starting fetchCourses...');

      // First, fetch all courses
      console.log('📚 Fetching all courses...');
      const result = await getAllCourses();

      if (result.success) {
        setCourses(result.courses);
        console.log(`✅ Loaded ${result.courses.length} courses`);
      } else {
        console.error('❌ Failed to fetch courses:', result.error);
        setCourses([]);
      }

      // Debug user state
      console.log('🔍 User state check:', {
        userExists: !!user,
        userObject: user,
        userId: user?.uid,
        userEmail: user?.email
      });

      // If user is logged in, fetch their enrolled courses
      if (user && user.uid) {
        console.log('👤 Fetching courses for user:', user.uid);
        try {
          const enrolledResult = await getUserCourses(user.uid);
          console.log('📋 getUserCourses result:', enrolledResult);

          if (enrolledResult.success) {
            setUserEnrolledCourses(enrolledResult.courses);
            console.log(`✅ Loaded ${enrolledResult.courses.length} enrolled courses`);
          } else {
            console.error('❌ Failed to fetch user courses:', enrolledResult.error);
            console.error('❌ Full error object:', enrolledResult);
            setUserEnrolledCourses([]);
          }
        } catch (userCoursesError) {
          console.error('❌ Exception in getUserCourses:', userCoursesError);
          setUserEnrolledCourses([]);
        }
      } else {
        console.log('ℹ️ No user logged in or user.uid missing');
        setUserEnrolledCourses([]);
      }

      setError(null);
    } catch (err) {
      console.error('❌ Error in fetchCourses:', err);
      console.error('❌ Error stack:', err.stack);
      setError('Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCourses();
    setRefreshing(false);
  };

  const availableCourses = useMemo(() => {
    // Safety check: ensure courses is an array
    if (!courses || !Array.isArray(courses)) {
      console.warn('⚠️ courses is not an array:', courses);
      return [];
    }

    // Safety check: ensure userEnrolledCourses is an array
    if (!userEnrolledCourses || !Array.isArray(userEnrolledCourses)) {
      console.warn('⚠️ userEnrolledCourses is not an array:', userEnrolledCourses);
      return courses; // Return all courses if we can't filter
    }

    // Get IDs of user's enrolled courses
    const enrolledCourseIds = userEnrolledCourses.map(course => course.id);

    // Filter out courses that the user has already purchased
    return courses.filter((course) => !enrolledCourseIds.includes(course.id));
  }, [courses, userEnrolledCourses]);

  const filteredCourses = useMemo(() => {
    // Safety check: ensure availableCourses is an array
    if (!availableCourses || !Array.isArray(availableCourses)) {
      console.warn('⚠️ availableCourses is not an array:', availableCourses);
      return [];
    }

    if (!searchQuery.trim()) {
      return availableCourses;
    }

    const query = searchQuery.toLowerCase().trim();
    return availableCourses.filter((course) => {
      return (
        course.title &&
        course.title.toLowerCase().includes(query) ||
        (course.membershipType &&
          course.membershipType.toLowerCase().includes(query)) ||
        (course.description &&
          course.description.toLowerCase().includes(query))
      );
    });
  }, [availableCourses, searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleRetry = () => {
    fetchCourses();
  };

  // Loading state
  if (loading) {
    return (
      <LinearGradient
        colors={['#f3f4f6', '#ffffff', '#f3f4f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Error state
  if (error) {
    return (
      <LinearGradient
        colors={['#f3f4f6', '#ffffff', '#f3f4f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.centerContainer}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={filteredCourses}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.headerContainer}>
              <View style={styles.headerTop}>
                <Text style={styles.headerTitle}>Home</Text>
                <Image
                  source={require('../assets/Logo1.jpeg')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              {/* Badge - Courses Available */}
              {/* <View style={styles.badgeContainer}>
                <View style={styles.pulsing} />
                <Text style={styles.badgeText}>
                  {courses.length} Courses Available
                </Text>
              </View> */}

              {/* Main Heading */}
              {/* <View style={styles.headingContainer}>
                <Text style={styles.mainHeading}>
                  Discover Your Next
                </Text>
                <Text style={styles.highlightHeading}>
                  Learning Adventure ✨
                </Text>
              </View> */}

              {/* Subheading */}
              {/* <Text style={styles.subheading}>
                Explore our curated collection of premium courses designed to
                transform your skills and elevate your knowledge. Start your
                journey today!
              </Text> */}

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search courses..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity
                    onPress={handleClearSearch}
                    style={styles.clearButton}
                  >
                    <Icon name="clear" size={30} color="#999" />
                  </TouchableOpacity>
                ) : (
                  <Icon name="search" size={50} color="#999" style={styles.searchIcon} />
                )}
              </View>

              {/* Section title and results count */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Icon name="local-fire-department" size={24} color="#DC2626" />
                  <Text style={styles.sectionTitle}>Featured Courses</Text>
                </View>
                {searchQuery && (
                  <Text style={styles.resultsCount}>
                    {filteredCourses.length} result
                    {filteredCourses.length !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            </View>

            {/* No Courses Message */}
            {availableCourses.length === 0 && (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Icon name="menu-book" size={48} color="#999" />
                </View>
                <Text style={styles.emptyTitle}>
                  No courses available to buy
                </Text>
                <Text style={styles.emptySubtitle}>
                  Check back soon for new courses!
                </Text>
              </View>
            )}

            {/* No Search Results Message */}
            {filteredCourses.length === 0 &&
              availableCourses.length > 0 && (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconContainer}>
                    <Icon name="search-off" size={40} color="#999" />
                  </View>
                  <Text style={styles.emptyTitle}>No courses found</Text>
                  <Text style={styles.emptySubtitle}>
                    Try adjusting your search terms
                  </Text>
                </View>
              )}
          </View>
        }
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.courseCardWrapper,
              index % 2 === 0 && styles.courseCardWrapperLeft,
            ]}
          >
            <CourseCard
              courseId={item.id}
              title={item.title}
              membershipType={item.membershipType}
              thumbnail={item.thumbnail}
              status={item.status}
              progress={item.progress}
              chapters={item.chapters}
              isPurchased={item.isPurchased}
              price={item.price}
              showStatus={false}
              onCourseClick={onCourseClick}
              navigation={navigation}
            />
          </View>
        )}
        numColumns={1}
        scrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#DC2626']}
            progressBackgroundColor="#fff"
          />
        }
        contentContainerStyle={styles.listContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: (event) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              setShowScrollTop(offsetY > height * 0.5);
            }
          }
        )}
      />

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <TouchableOpacity
          style={styles.scrollToTopButton}
          onPress={() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
        >
          <Text style={styles.scrollToTopText}>↑</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  listContent: {
    paddingBottom: 100, // Increased padding to account for bottom tab navigation
  },

  // Loading & Error States
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#DC2626',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Header Section
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    marginVertical:20
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 24,
  },

  // Badge
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  pulsing: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991b1b',
  },

  // Heading
  headingContainer: {
    marginBottom: 12,
  },
  mainHeading: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  highlightHeading: {
    fontSize: 32,
    fontWeight: '900',
    color: '#DC2626',
    marginBottom: 12,
  },

  // Subheading
  subheading: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
    height: 54,
    width: '100%',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  searchIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#999',
  },

  // Course Card
  courseCardWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    width: '100%',
  },
  courseCardWrapperLeft: {
    paddingRight: 8,
  },

  // Scroll to Top Button
  scrollToTopButton: {
    position: 'absolute',
    bottom: 90, // Increased bottom padding to avoid overlap with tab navigation
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000, // Ensure button stays on top
  },
  scrollToTopText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default HomeScreen;