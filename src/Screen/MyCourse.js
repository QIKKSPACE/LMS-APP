// src/Screen/MyCourse.js
import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import LinearGradient from 'react-native-linear-gradient';
import { getUserCourses } from '../Services/courseService';
import { useAuth } from '../Context/AuthContext';
import CourseCard from '../Components/CourseCard';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const MyCourse = ({ navigation }) => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Filter tabs
  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'completed', label: 'Completed' },
    { id: 'expired', label: 'Expired' },
  ];

  useEffect(() => {
    fetchUserCourses();
  }, [user]);

  const fetchUserCourses = async () => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const result = await getUserCourses(user.uid);

      if (result.success) {
        // ✅ PORTED LOGIC: Process courses with Web-priority status
        const coursesWithStatus = result.courses.map(course => {
          let finalStatus;
          
          if (course.isExpired || course.enrolledStatus === 'expired') {
            finalStatus = 'EXPIRED';
          } else if (course.progress >= 100) {
            finalStatus = 'COMPLETED';
          } else if (course.progress > 0) {
            finalStatus = 'IN_PROGRESS';
          } else {
            finalStatus = 'NOT_STARTED';
          }
          
          return {
            ...course,
            status: finalStatus,
            progress: course.progress || 0
          };
        });
        setCourses(coursesWithStatus);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load courses');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserCourses();
  };

  // ✅ PORTED LOGIC: Strict Filtering
  const filteredCourses = useMemo(() => {
    let result = courses;
    
    if (activeFilter === 'all') {
      // Show only ACTIVE (Not expired & Not completed)
      result = courses.filter(c => c.status !== 'EXPIRED' && c.status !== 'COMPLETED');
    } else if (activeFilter === 'completed') {
      result = courses.filter(c => c.progress >= 100 || c.status === 'COMPLETED');
    } else if (activeFilter === 'expired') {
      result = courses.filter(c => c.status === 'EXPIRED' || c.isExpired || c.enrolledStatus === 'expired');
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(course => (
        (course.courseTitle || course.title || '').toLowerCase().includes(query) ||
        (course.description || '').toLowerCase().includes(query)
      ));
    }
    
    return result;
  }, [activeFilter, courses, searchQuery]);

  const courseCounts = useMemo(() => ({
    all: courses.filter(c => c.status !== 'EXPIRED' && c.status !== 'COMPLETED').length,
    completed: courses.filter(c => c.progress >= 100 || c.status === 'COMPLETED').length,
    expired: courses.filter(c => c.status === 'EXPIRED' || c.isExpired || c.enrolledStatus === 'expired').length,
  }), [courses]);

  const handleCoursePress = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (course?.status === 'EXPIRED') {
      Toast.show({ type: 'error', text1: 'Course Expired', text2: 'Please contact support to renew access' });
      return;
    }
    navigation.navigate('VideoPlayer', { courseId });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Branding Header */}
      <View style={styles.brandingSection}>
        <View style={styles.logoAndTitle}>
          <Image source={require('../assets/Logo1.jpeg')} style={styles.brandingLogo} resizeMode="contain" />
          <View>
            <Text style={styles.brandingTitle}>BRAHMA DIVINE GRACE</Text>
            <Text style={styles.brandingSubtitle}>My Learning Library</Text>
          </View>
        </View>
      </View>

      <View style={styles.controlsSection}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Icon name="search" size={22} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your courses..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={22} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabsContainer}>
          {filterTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeFilter === tab.id && styles.activeTab]}
              onPress={() => setActiveFilter(tab.id)}
            >
              <Text style={[styles.tabLabel, activeFilter === tab.id && styles.activeTabLabel]}>
                {tab.label} {courseCounts[tab.id] > 0 ? `(${courseCounts[tab.id]})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search Result Count */}
        {searchQuery && (
          <Text style={styles.resultCount}>
            Found {filteredCourses.length} matching course{filteredCourses.length !== 1 ? 's' : ''}
          </Text>
        )}

        {/* ✅ PORTED UI: Congratulations Banner */}
        {activeFilter === 'completed' && filteredCourses.length > 0 && (
          <LinearGradient colors={['#f0fdf4', '#dcfce7']} style={styles.congratsBanner}>
            <View style={styles.bannerIconCircle}>
              <Text style={styles.bannerEmoji}>🎉</Text>
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Congratulations!</Text>
              <Text style={styles.bannerSub}>You've completed {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}. Great job!</Text>
            </View>
          </LinearGradient>
        )}

        {/* ✅ PORTED UI: Expiry Banner */}
        {activeFilter === 'expired' && filteredCourses.length > 0 && (
          <LinearGradient colors={['#fef2f2', '#fee2e2']} style={styles.expiryBanner}>
            <View style={[styles.bannerIconCircle, { backgroundColor: '#ef4444' }]}>
              <Text style={styles.bannerEmoji}>⏰</Text>
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.bannerTitle, { color: '#991b1b' }]}>Course Access Expired</Text>
              <Text style={[styles.bannerSub, { color: '#b91c1c' }]}>Contact support to renew your access and continue learning.</Text>
            </View>
          </LinearGradient>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Icon name={searchQuery ? "search-off" : activeFilter === 'all' ? "auto-stories" : "history"} size={48} color="#999" />
      </View>
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No courses found' : `No ${activeFilter} courses`}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try adjusting your search terms' : 'Browse the Home section to find your next adventure!'}
      </Text>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Syncing library...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <FlatList
        data={filteredCourses}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <CourseCard
              courseId={item.id}
              title={item.courseTitle || item.title}
              membershipType={item.membershipType}
              thumbnail={item.courseThumbnail || item.thumbnail}
              status={item.status}
              progress={item.progress}
              chapters={item.chapters || 0}
              isPurchased={true}
              expiryDate={item.expiryDate}
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
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
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
  brandingSubtitle: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
    marginTop: -2,
  },
  controlsSection: {
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  activeTab: {
    backgroundColor: '#DC2626',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
  },
  activeTabLabel: {
    color: '#fff',
  },
  resultCount: {
    marginTop: 16,
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  congratsBanner: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bcf0da',
  },
  expiryBanner: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  bannerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bannerEmoji: {
    fontSize: 24,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#065f46',
  },
  bannerSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  listContent: {
    paddingBottom: 40,
  },
  cardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
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

export default MyCourse;