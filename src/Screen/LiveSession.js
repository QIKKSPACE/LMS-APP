import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
  Dimensions,
  Animated,
  RefreshControl,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { db } from '../firebase';

const { width } = Dimensions.get('window');

const LiveSession = () => {
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Animated values for live indicator
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    fetchLiveSessions();
    startPulseAnimation();
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const fetchLiveSessions = async () => {
    try {
      setLoading(true);
      const snapshot = await db.collection('courses').get();
      
      const allSessions = [];
      
      snapshot.docs.forEach(doc => {
        const courseData = doc.data();
        
        if (courseData.liveLectures && Array.isArray(courseData.liveLectures)) {
          courseData.liveLectures.forEach((lecture, index) => {
            allSessions.push({
              id: `${doc.id}_${index}`,
              courseId: doc.id,
              courseTitle: courseData.courseTitle,
              link: lecture.link,
              status: lecture.status || 'upcoming',
              date: lecture.date,
              time: lecture.time,
              topic: courseData.courseTitle || 'General Topic'
            });
          });
        }
      });

      allSessions.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });

      setLiveSessions(allSessions);
      setError(null);
    } catch (err) {
      console.error('Error fetching live sessions:', err);
      setError('Failed to load live sessions. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLiveSessions();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return {
      month: months[date.getMonth()],
      day: date.getDate()
    };
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'live':
        return '#EF4444';
      case 'upcoming':
        return '#3B82F6';
      case 'completed':
        return '#6B7280';
      default:
        return '#3B82F6';
    }
  };

  const handleJoinSession = async (link) => {
    try {
      const supported = await Linking.canOpenURL(link);
      if (supported) {
        await Linking.openURL(link);
      } else {
        console.error("Don't know how to open this URL: " + link);
      }
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading live sessions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorEmoji}>⚠️</Text>
        </View>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchLiveSessions}
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Live Sessions</Text>
          <Image 
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.headerSubtitle}>
          Join live sessions and interact with instructors in real-time
        </Text>
      </View>

      {/* Sessions List */}
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
        {liveSessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyEmoji}>📹</Text>
            </View>
            <Text style={styles.emptyTitle}>No live sessions scheduled</Text>
            <Text style={styles.emptySubtitle}>Check back later for upcoming sessions</Text>
          </View>
        ) : (
          liveSessions.map((session, index) => {
            const dateInfo = formatDate(session.date);
            const statusColor = getStatusColor(session.status);
            const isLive = session.status.toLowerCase() === 'live';
            
            return (
              <View key={session.id} style={styles.sessionCard}>
                {/* Top Section - Banner */}
                <View style={styles.banner}>
                  {/* Status Badge */}
                  <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusText}>{session.status.toUpperCase()}</Text>
                  </View>

                  {/* Live Indicator */}
                  {isLive && (
                    <Animated.View 
                      style={[
                        styles.liveIndicator,
                        { opacity: pulseAnim }
                      ]}
                    >
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE NOW</Text>
                    </Animated.View>
                  )}

                  {/* Title */}
                  <View style={styles.bannerContent}>
                    <Text style={styles.sessionTitle}>Live Session</Text>
                    <Text style={styles.sessionTopic}>{session.topic}</Text>
                  </View>
                </View>

                {/* Bottom Section - Info */}
                <View style={styles.infoSection}>
                  {/* Date and Time */}
                  <View style={styles.dateTimeContainer}>
                    <View style={styles.dateBox}>
                      <Text style={styles.dateMonth}>{dateInfo.month}</Text>
                      <Text style={styles.dateDay}>{dateInfo.day}</Text>
                    </View>
                    
                    <View style={styles.timeContainer}>
                      <Text style={styles.timeText}>🕐 {session.time}</Text>
                      <Text style={styles.dateText}>{session.date}</Text>
                    </View>
                  </View>

                  {/* Course Title */}
                  <View style={styles.courseContainer}>
                    <Text style={styles.courseLabel}>From Course:</Text>
                    <Text style={styles.courseTitle} numberOfLines={2}>
                      {session.courseTitle}
                    </Text>
                  </View>

                  {/* Join Button */}
                  <TouchableOpacity
                    style={[
                      styles.joinButton,
                      { backgroundColor: isLive ? '#DC2626' : '#2563EB' }
                    ]}
                    onPress={() => handleJoinSession(session.link)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.joinButtonText}>
                      {isLive ? '🔴 Join Live Now' : '📹 Join Session'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    fontSize: 14,
    color: '#6B7280',
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
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  banner: {
    backgroundColor: '#7F1D1D',
    padding: 24,
    minHeight: 160,
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  liveIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    marginRight: 8,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bannerContent: {
    marginTop: 40,
  },
  sessionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sessionTopic: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.95,
    fontWeight: '500',
  },
  infoSection: {
    padding: 20,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateBox: {
    width: 56,
    height: 56,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dateDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timeContainer: {
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  courseContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  courseLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  joinButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LiveSession;