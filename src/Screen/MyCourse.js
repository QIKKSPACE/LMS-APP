import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Animated,
  Dimensions,
  TextInput,
} from 'react-native';
import { getUserCourses } from '../Services/courseService';
import { useAuth } from '../Context/AuthContext';
import { checkCourseExpiry } from  '../unities/courseExpiry'
import { fixBrokenProgressDocuments, checkIfMigrationNeeded} from '../unities/migrationFix'
import Toast from 'react-native-toast-message';
import CourseCard from '../Components/CourseCard';
import FilterTabs from '../Components/FilterTabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const CoursesScreen = ({ onCourseClick, navigation }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const spinValue = new Animated.Value(0);

  // THREE TABS: All, Completed, Expired
  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'completed', label: 'Completed' },
    { id: 'expired', label: 'Expired' },
  ];

  // Rotation animation
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
        console.log('📚 Fetching purchased courses for user:', user.uid);
        
        // Check if migration is needed
        const needsMigration = await checkIfMigrationNeeded(user.uid);
        
        if (needsMigration) {
          console.log('🔧 Migration needed! Fixing broken progress documents...');
          Toast.show({
            type: 'info',
            text1: 'Fixing course progress data...',
          });
          
          const migrationResult = await fixBrokenProgressDocuments(user.uid);
          
          if (migrationResult.success) {
            Toast.show({
              type: 'success',
              text1: `✅ Fixed ${migrationResult.fixed} course(s)`,
            });
            console.log('✅ Migration complete:', migrationResult);
          } else {
            Toast.show({
              type: 'error',
              text1: 'Migration had some errors',
            });
            console.error('❌ Migration errors:', migrationResult);
          }
        }
        
        const result = await getUserCourses(user.uid);

        if (result.success) {
          const coursesWithStatus = result.courses.map(course => {
            const courseWithExpiry = checkCourseExpiry(course);
            let finalStatus = courseWithExpiry.status;
            const progress = course.progress || 0;
            
            console.log(`📊 Course: ${course.courseTitle}, Progress: ${progress}%, Expired: ${courseWithExpiry.isExpired}`);
            
            if (courseWithExpiry.isExpired) {
              finalStatus = 'EXPIRED';
              console.log(`❌ ${course.courseTitle} is EXPIRED`);
            } else if (progress === 100) {
              finalStatus = 'COMPLETED';
              console.log(`✅ ${course.courseTitle} is COMPLETED (100%)`);
            } else if (progress > 0) {
              finalStatus = 'IN_PROGRESS';
              console.log(`⏳ ${course.courseTitle} is IN_PROGRESS (${progress}%)`);
            } else {
              finalStatus = 'NOT_STARTED';
              console.log(`🆕 ${course.courseTitle} is NOT_STARTED`);
            }
            
            return {
              ...courseWithExpiry,
              status: finalStatus,
              progress: progress
            };
          });
          
          console.log('✅ User courses with status:', coursesWithStatus.map(c => ({
            title: c.courseTitle,
            progress: c.progress,
            status: c.status
          })));
          
          setCourses(coursesWithStatus);
        } else {
          console.error('❌ Failed to fetch user courses:', result.error);
          setError(result.error);
        }
      } catch (err) {
        console.error('❌ Error in fetchUserCourses:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserCourses();
  }, [user]);

  // FIXED FILTERING: All (active courses), Completed (100%), Expired
  const filteredCourses = useMemo(() => {
    // Safety check: ensure courses is an array
    if (!courses || !Array.isArray(courses)) {
      console.warn('⚠️ courses is not an array:', courses);
      return { all: [], completed: [], expired: [], counts: { all: 0, completed: 0, expired: 0 } };
    }

    let result = courses;

    console.log('🔍 Filtering courses with activeFilter:', activeFilter);
    console.log('📦 Total courses:', courses.length);
    
    // Apply status filter
    if (activeFilter === 'all') {
      result = courses.filter(c => {
        const isNotExpired = c.status !== 'EXPIRED';
        const isNotCompleted = c.status !== 'COMPLETED';
        return isNotExpired && isNotCompleted;
      });
      console.log(`📋 "All" tab: ${result.length} active courses`);
    } else if (activeFilter === 'completed') {
      result = courses.filter(c => {
        const isCompleted = c.progress === 100 && c.status === 'COMPLETED';
        if (isCompleted) {
          console.log(`✅ Including in Completed: ${c.courseTitle} (${c.progress}%)`);
        }
        return isCompleted;
      });
      console.log(`🎉 "Completed" tab: ${result.length} completed courses`);
    } else if (activeFilter === 'expired') {
      result = courses.filter(c => c.status === 'EXPIRED');
      console.log(`❌ "Expired" tab: ${result.length} expired courses`);
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
      console.log(`🔍 After search: ${result.length} courses`);
    }
    
    return result;
  }, [activeFilter, courses, searchQuery]);

  // FIXED COUNT: All, Completed, Expired
  const courseCounts = useMemo(() => {
    const counts = {
      all: courses.filter(c => c.status !== 'EXPIRED' && c.status !== 'COMPLETED').length,
      completed: courses.filter(c => c.progress === 100 && c.status === 'COMPLETED').length,
      expired: courses.filter(c => c.status === 'EXPIRED').length,
    };
    
    console.log('📊 Course counts:', counts);
    return counts;
  }, [courses]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>My Courses</Text>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.headerSubtitle}>Your purchased courses and progress</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInputWithIcon}
            placeholder="Search courses..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            blurOnSubmit={false}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            enablesReturnKeyAutomatically={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearIcon}>
              <Icon name="close" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <FilterTabs
          tabs={filterTabs.map(tab => ({
            ...tab,
            label: `${tab.label} ${courseCounts[tab.id] > 0 ? `(${courseCounts[tab.id]})` : ''}`
          }))}
          activeTab={activeFilter}
          onTabChange={setActiveFilter}
        />
      </View>

      {/* Search Results Count */}
      {searchQuery && filteredCourses.length > 0 && (
        <View style={styles.resultsCount}>
          <Text style={styles.resultsText}>
            Found <Text style={styles.resultsBold}>{filteredCourses.length}</Text> course{filteredCourses.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </Text>
        </View>
      )}

      {/* Completed Congratulations Banner */}
      {activeFilter === 'completed' && filteredCourses.length > 0 && (
        <View style={styles.congratsBanner}>
          <View style={styles.congratsIcon}>
            <Text style={styles.congratsEmoji}>🎉</Text>
          </View>
          <View style={styles.congratsText}>
            <Text style={styles.congratsTitle}>Congratulations!</Text>
            <Text style={styles.congratsSubtitle}>
              You've completed {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}. Keep up the great work!
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => {
    if (courses.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Animated.View style={[styles.emptyIcon, { transform: [{ rotate: spin }] }]}>
            <Text style={styles.emptyEmoji}>📚</Text>
          </Animated.View>
          <Text style={styles.emptyTitle}>No purchased courses yet</Text>
          <Text style={styles.emptySubtitle}>Browse courses in the Home section to get started</Text>
        </View>
      );
    }

    if (filteredCourses.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyEmoji}>🔍</Text>
          </View>
          <Text style={styles.emptyTitle}>No courses found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery 
              ? 'Try adjusting your search terms' 
              : activeFilter === 'completed' 
                ? 'Complete a course to 100% to see it here! 🎯'
                : `No courses in "${filterTabs.find(t => t.id === activeFilter)?.label}"`
            }
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderCourseItem = ({ item, index }) => {
    // Debug: Log course data to see what we're working with
    console.log(`📚 MyCourse - Course Item ${index + 1}:`, {
      title: item.title || item.courseTitle,
      id: item.id,
      progress: item.progress,
      status: item.status,
      isExpired: item.isExpired
    });

    return (
      <View style={[styles.courseCard, isTablet && styles.courseCardTablet]}>
        <CourseCard
          courseId={item.id}
          title={item.title || item.courseTitle}
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
          onCourseClick={onCourseClick}
          navigation={navigation}
        />
      </View>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading your courses...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.errorIcon}>
          <Text style={styles.errorEmoji}>⚠️</Text>
        </View>
        <Text style={styles.errorTitle}>Failed to load courses</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setIsLoading(true);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
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
        key={isTablet ? 'tablet' : 'phone'}
        showsVerticalScrollIndicator={false}
      />
      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  errorIcon: {
    width: 96,
    height: 96,
    backgroundColor: '#fee2e2',
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorEmoji: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#DC2626',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    gap: 4,
    paddingVertical:25
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical:-11
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 20,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 4,
    marginVertical:-24
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInputWithIcon: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  clearIcon: {
    marginLeft: 8,
    padding: 4,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultsCount: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  resultsText: {
    fontSize: 14,
    color: '#6b7280',
  },
  resultsBold: {
    fontWeight: '700',
    color: '#DC2626',
  },
  congratsBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
    borderColor: '#86efac',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  congratsIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#22c55e',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  congratsEmoji: {
    fontSize: 24,
  },
  congratsText: {
    flex: 1,
    gap: 4,
  },
  congratsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
  },
  congratsSubtitle: {
    fontSize: 14,
    color: '#15803d',
  },
  listContent: {
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  courseCard: {
    padding: 8,
  },
  courseCardTablet: {
    width: '50%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 64,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    backgroundColor: '#e5e7eb',
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