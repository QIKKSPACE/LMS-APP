import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import CourseCard from '../Components/CourseCard';
import FilterTabs from '../Components/FilterTabs'

import { getUserCourses } from '../Services/courseService';
import { useAuth } from '../Context/AuthContext';
import { checkCourseExpiry } from '../unities/courseExpiry';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const CoursesScreen = ({ navigation, route }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  // Add refresh trigger when route params change
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (route?.params?.refresh) {
      // Increment refresh key to trigger a refetch
      setRefreshKey(prev => prev + 1);
      console.log('🔄 Refresh triggered from navigation params');
    }
  }, [route?.params?.refresh]);

  // ✅ ONLY "All" and "Expired" tabs
  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'expired', label: 'Expired' },
  ];

  // Fetch user's purchased courses from Firestore
  useEffect(() => {
    const fetchUserCourses = async () => {
      if (!user || !user.uid) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log('Fetching purchased courses for user:', user.uid);
        const courses = await getUserCourses(user.uid);

        if (Array.isArray(courses)) {
          // Check expiry and determine status for each course
          const coursesWithStatus = courses.map(course => {
            // First check expiry
            const courseWithExpiry = checkCourseExpiry(course);

            // Then determine status based on progress
            let finalStatus = courseWithExpiry.status;
            const progress = course.progress || 0;

            if (courseWithExpiry.isExpired) {
              finalStatus = 'EXPIRED';
            } else if (progress === 100) {
              finalStatus = 'COMPLETED';
            } else if (progress > 0) {
              finalStatus = 'IN_PROGRESS';
            } else {
              finalStatus = 'NOT_STARTED';
            }

            console.log(`Course: ${course.courseTitle}, Progress: ${progress}%, Status: ${finalStatus}`);

            return {
              ...courseWithExpiry,
              status: finalStatus
            };
          });

          console.log('User courses with status:', coursesWithStatus);
          setCourses(coursesWithStatus);
        } else {
          console.error('Unexpected result format from getUserCourses');
          setError('Failed to fetch courses: Invalid response format');
        }
      } catch (err) {
        console.error('Error in fetchUserCourses:', err);
        setError('An unexpected error occurred: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserCourses();
  }, [user, refreshKey]);

  // ✅ SIMPLIFIED FILTERING - Only "All" and "Expired"
  const filteredCourses = useMemo(() => {
    let result = courses;
    
    // Apply status filter
    if (activeFilter === 'all') {
      // "All" shows ALL courses except expired
      result = courses.filter(c => c.status !== 'EXPIRED');
    } else if (activeFilter === 'expired') {
      // Show only EXPIRED courses
      result = courses.filter(c => c.status === 'EXPIRED');
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((course) => {
        return (
          course.title?.toLowerCase().includes(query) ||
          course.courseTitle?.toLowerCase().includes(query) ||
          course.membershipType?.toLowerCase().includes(query) ||
          course.description?.toLowerCase().includes(query)
        );
      });
    }
    
    return result;
  }, [activeFilter, courses, searchQuery]);

  // ✅ SIMPLIFIED COUNT - Only "All" and "Expired"
  const courseCounts = useMemo(() => {
    return {
      all: courses.filter(c => c.status !== 'EXPIRED').length,
      expired: courses.filter(c => c.status === 'EXPIRED').length,
    };
  }, [courses]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Handle course click - navigate to VideoPlayerScreen
  const handleCourseClick = (courseId) => {
    if (!courseId) {
      console.error('No courseId provided for navigation');
      return;
    }

    console.log('Navigating to VideoPlayer with courseId:', courseId);
    navigation.navigate('VideoPlayer', { courseId });
  };

  // Loading state
  if (isLoading) {
    return (
      <LinearGradient
        colors={['#f9fafb', '#ffffff', '#f3f4f6']}
        style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#dc2626" />
          <Text style={styles.loadingText}>Loading your courses...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Error state
  if (error) {
    return (
      <LinearGradient
        colors={['#f9fafb', '#ffffff', '#f3f4f6']}
        style={styles.container}>
        <View style={styles.centerContainer}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>Failed to load courses</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setIsLoading(true);
              setError(null);
            }}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>My Courses</Text>
            <Text style={styles.headerSubtitle}>Your purchased courses and progress</Text>
          </View>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search your courses..."
          placeholderTextColor="#999"
        />
      </View>

      {/* Filter Tabs */}
      <FilterTabs
        tabs={filterTabs.map(tab => ({
          ...tab,
          label: `${tab.label} ${courseCounts[tab.id] > 0 ? `(${courseCounts[tab.id]})` : ''}`
        }))}
        activeTab={activeFilter}
        onTabChange={setActiveFilter}
      />

      {/* Results count */}
      {searchQuery && filteredCourses.length > 0 && (
        <View style={styles.resultsCountContainer}>
          <Text style={styles.resultsCountText}>
            Found <Text style={styles.resultsCountBold}>{filteredCourses.length}</Text> course{filteredCourses.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => {
    if (courses.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
          </View>
          <Text style={styles.emptyTitle}>No purchased courses yet</Text>
          <Text style={styles.emptySubtitle}>Browse courses in the Home section to get started</Text>
        </View>
      );
    }

    if (filteredCourses.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
          </View>
          <Text style={styles.emptyTitle}>No courses found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery 
              ? 'Try adjusting your search terms' 
              : `No courses in "${filterTabs.find(t => t.id === activeFilter)?.label}"`
            }
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderCourseItem = ({ item, index }) => (
    <View style={styles.courseCardWrapper}>
      <CourseCard
        courseId={item.id}
        title={item.title}
        courseTitle={item.courseTitle}
        courseName={item.courseName}
        membershipType={item.membershipType}
        thumbnail={item.thumbnail}
        courseThumbnail={item.courseThumbnail}
        thumbnailUrl={item.thumbnailUrl}
        imageUrl={item.imageUrl}
        status={item.status}
        progress={item.progress || 0}
        chapters={item.chapters || 0}
        isPurchased={true}
        price={item.price}
        expiryDate={item.expiryDate}
        showStatus={false}
        onCourseClick={handleCourseClick}
      />
    </View>
  );

  return (
    <LinearGradient
      colors={['#f9fafb', '#ffffff', '#f3f4f6']}
      style={styles.container}>
      <FlatList
        data={filteredCourses}
        renderItem={renderCourseItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          filteredCourses.length === 0 && styles.listContentEmpty
        ]}
        numColumns={isTablet ? 2 : 1}
        key={isTablet ? 'tablet' : 'mobile'}
        showsVerticalScrollIndicator={false}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#4b5563',
  },
  errorIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#dc2626',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingTop: 46,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 4,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  searchInput: {
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resultsCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsCountText: {
    fontSize: 14,
    color: '#4b5563',
  },
  resultsCountBold: {
    fontWeight: '700',
    color: '#dc2626',
  },
  listContent: {
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  courseCardWrapper: {
    flex: isTablet ? 0.5 : 1,
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default CoursesScreen;