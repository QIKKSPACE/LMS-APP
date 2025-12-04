import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  Dimensions,
  TextInput,
  RefreshControl,
  AppState,
} from 'react-native';
import { getUserCourses } from '../Services/courseService';
import { useAuth } from '../Context/AuthContext';
import { checkCourseExpiry } from '../unities/courseExpiry';
import CourseCard from '../Components/CourseCard';

const { width } = Dimensions.get('window');

const CoursesScreen = ({ navigation, onCourseClick }) => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [coursesWithProgress, setCoursesWithProgress] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'completed', label: 'Completed' },
    { id: 'expired', label: 'Expired' },
  ];

  // Fetch user's courses from Firestore
  const fetchUserCourses = async () => {
    if (!user || !user.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userCourses = await getUserCourses(user.uid);
      
      // Check expiry for each course
      const coursesWithExpiryCheck = userCourses.map(course => 
        checkCourseExpiry(course)
      );
      
      setCoursesWithProgress(coursesWithExpiryCheck);
      setError(null);
    } catch (err) {
      console.error('Error loading user courses:', err);
      setError('Failed to load your courses. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserCourses();
  }, [user]);

  // Refresh courses when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && user?.uid) {
        getUserCourses(user.uid).then(courses => {
          const coursesWithExpiryCheck = courses.map(course => 
            checkCourseExpiry(course)
          );
          setCoursesWithProgress(coursesWithExpiryCheck);
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  // Periodic expiry check (every hour)
  useEffect(() => {
    const checkExpiryInterval = setInterval(() => {
      setCoursesWithProgress((prevCourses) => {
        return prevCourses.map((course) => checkCourseExpiry(course));
      });
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(checkExpiryInterval);
  }, []);

  const filteredCourses = useMemo(() => {
    let result = coursesWithProgress;
    
    // Apply status filter
    if (activeFilter !== 'all') {
      result = result.filter((course) => {
        const categoryMap = {
          in_progress: 'IN_PROGRESS',
          completed: 'COMPLETED',
          expired: 'EXPIRED',
        };
        return course.status === categoryMap[activeFilter];
      });
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((course) => {
        return (
          course.title.toLowerCase().includes(query) ||
          (course.membershipType && course.membershipType.toLowerCase().includes(query)) ||
          (course.description && course.description.toLowerCase().includes(query))
        );
      });
    }
    
    return result;
  }, [activeFilter, coursesWithProgress, searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleCourseClick = useCallback((courseId) => {
    if (onCourseClick) {
      onCourseClick(courseId);
    } else {
      // Default behavior: navigate to video player
      navigation.navigate('VideoPlayer', { courseId });
    }
  }, [navigation, onCourseClick]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserCourses();
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading your courses...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorEmoji}>⚠️</Text>
        </View>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchUserCourses}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>My Courses</Text>
          <Image 
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.headerSubtitle}>Your purchased courses and progress</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search your courses..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={handleClearSearch}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterTabsContainer}
          contentContainerStyle={styles.filterTabsContent}
        >
          {filterTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.filterTab,
                activeFilter === tab.id && styles.filterTabActive
              ]}
              onPress={() => setActiveFilter(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterTabText,
                activeFilter === tab.id && styles.filterTabTextActive
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Course List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#DC2626']}
          />
        }
      >
        {coursesWithProgress.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyEmoji}>📚</Text>
            </View>
            <Text style={styles.emptyTitle}>No purchased courses yet</Text>
            <Text style={styles.emptySubtitle}>
              Browse courses in the Home section to get started
            </Text>
          </View>
        ) : filteredCourses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyEmoji}>🔍</Text>
            </View>
            <Text style={styles.emptyTitle}>No courses found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search terms' : 'No courses in this category'}
            </Text>
          </View>
        ) : (
          <>
            {/* Results count */}
            {searchQuery !== '' && (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsText}>
                  Found <Text style={styles.resultsCount}>{filteredCourses.length}</Text> course
                  {filteredCourses.length !== 1 ? 's' : ''} matching "{searchQuery}"
                </Text>
              </View>
            )}

            {/* Course Cards */}
            {filteredCourses.map((course, index) => (
              <View key={course.id} style={styles.courseCardWrapper}>
                <CourseCard
                  courseId={course.id}
                  title={course.title}
                  membershipType={course.membershipType}
                  thumbnail={course.thumbnail}
                  status={course.status}
                  progress={course.progress}
                  chapters={course.chapters}
                  isPurchased={course.isPurchased}
                  price={course.price}
                  expiryDate={course.expiryDate}
                  onCourseClick={handleCourseClick}
                  navigation={navigation}
                />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  clearIcon: {
    fontSize: 18,
    color: '#6B7280',
    paddingLeft: 8,
  },
  filterTabsContainer: {
    marginHorizontal: -16,
  },
  filterTabsContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: {
    backgroundColor: '#DC2626',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#FEE2E2',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorEmoji: {
    fontSize: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    backgroundColor: '#E5E7EB',
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  resultsContainer: {
    marginBottom: 16,
  },
  resultsText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resultsCount: {
    fontWeight: 'bold',
    color: '#DC2626',
  },
  courseCardWrapper: {
    marginBottom: 16,
  },
});

export default CoursesScreen;