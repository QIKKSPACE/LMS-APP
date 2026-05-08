// src/Screen/LiveSession.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  RefreshControl,
  Animated,
  ActivityIndicator,
  Linking,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../firebase';
import { useAuth } from '../Context/AuthContext';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getUserCourses } from '../Services/courseService';

const { width } = Dimensions.get('window');

const LiveSession = () => {
  const { user } = useAuth();
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const fetchLiveSessions = async () => {
    if (!user) {
      setLiveSessions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Syncing live sessions for user:', user.uid);
      
      const result = await getUserCourses(user.uid);
      
      if (!result.success) {
        setError(result.error || 'Could not load your courses');
        setLiveSessions([]);
        return;
      }

      const allSessions = [];
      const courses = result.courses || [];

      courses.forEach(course => {
        if (course.liveLectures && Array.isArray(course.liveLectures)) {
          course.liveLectures.forEach((lecture, index) => {
            allSessions.push({
              id: `${course.id}_${index}`,
              courseId: course.id,
              courseTitle: course.title || course.courseTitle || 'Untitled Course',
              link: lecture.link,
              status: lecture.status || 'upcoming',
              date: lecture.date,
              time: lecture.time,
              topic: lecture.topic || course.title || course.courseTitle || 'Live Session'
            });
          });
        }
      });

      // Sort by date (most recent first)
      allSessions.sort((a, b) => new Date(b.date) - new Date(a.date));

      setLiveSessions(allSessions);
      setError(null);
    } catch (err) {
      console.error('Fetch Error:', err);
      setError('Failed to load sessions. Pull to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveSessions();
  }, [user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLiveSessions();
  };

  const handleJoin = (link) => {
    if (link) {
      Linking.openURL(link).catch(() => alert("Could not open the session link."));
    } else {
      alert("Session link not available.");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { day: '--', month: '---' };
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return {
      month: months[date.getMonth()],
      day: date.getDate()
    };
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Syncing your sessions...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Dynamic Brand Header */}
      <View style={styles.brandHeader}>
         <Image source={require('../assets/Logo1.jpeg')} style={styles.logo} resizeMode="contain" />
         <Text style={styles.brandTitleText}>BRAHMA DIVINE GRACE</Text>
         <Text style={styles.brandSubtitleText}>Interact with instructors in real-time</Text>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC2626']} />}
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
      >
        {liveSessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCircle}><Text style={{ fontSize: 40 }}>📹</Text></View>
            <Text style={styles.emptyTitle}>No sessions scheduled</Text>
            <Text style={styles.emptySubtitle}>Check your enrolled courses for updates</Text>
          </View>
        ) : (
          liveSessions.map((session) => {
             const { month, day } = formatDate(session.date);
             const isLive = session.status.toLowerCase() === 'live';
             
             return (
               <View key={session.id} style={styles.card}>
                 {/* Top Section - Red Gradient Hero */}
                 <LinearGradient 
                   colors={['#DC2626', '#991B1B', '#000000']} 
                   start={{ x: 0, y: 0 }} 
                   end={{ x: 1, y: 1 }} 
                   style={styles.cardHero}
                 >
                    <View style={styles.badgeRow}>
                       {isLive && (
                         <Animated.View style={[styles.liveBadge, { opacity: pulseAnim }]}>
                           <View style={styles.liveDot} />
                           <Text style={styles.liveBadgeText}>LIVE NOW</Text>
                         </Animated.View>
                       )}
                       <View style={[styles.statusBadge, { backgroundColor: isLive ? '#EF4444' : (session.status?.toLowerCase() === 'completed' ? '#6B7280' : '#3B82F6') }]}>
                         <Text style={styles.statusBadgeText}>{(session.status || 'UPCOMING').toUpperCase()}</Text>
                       </View>
                    </View>
                    
                    <View style={styles.heroContent}>
                       <Text style={styles.heroPreTitle}>Live Session</Text>
                       <Text style={styles.heroTitle} numberOfLines={2}>{session.topic}</Text>
                    </View>
                 </LinearGradient>

                 {/* Bottom Section - White Info Card */}
                 <View style={styles.cardInfo}>
                    <View style={styles.dateTimeRow}>
                       {/* Blue Calendar Box */}
                       <View style={styles.calendarBox}>
                          <Text style={styles.calendarMonth}>{month}</Text>
                          <Text style={styles.calendarDay}>{day}</Text>
                       </View>
                       
                       <View style={styles.timeInfo}>
                          <View style={styles.timeRow}>
                             <Icon name="access-time" size={16} color="#111827" />
                             <Text style={styles.timeText}>{session.time}</Text>
                          </View>
                          <Text style={styles.dateText}>{session.date}</Text>
                       </View>
                    </View>

                    <View style={styles.courseSource}>
                       <Text style={styles.sourceLabel}>From Course:</Text>
                       <Text style={styles.sourceName} numberOfLines={1}>{session.courseTitle}</Text>
                    </View>

                    <TouchableOpacity 
                       onPress={() => handleJoin(session.link)}
                       style={styles.joinBtn}
                       activeOpacity={0.8}
                    >
                       <LinearGradient 
                         colors={isLive ? ['#DC2626', '#B91C1C'] : ['#2563EB', '#1D4ED8']} 
                         style={styles.btnGradient}
                       >
                         <Text style={styles.btnText}>
                           {isLive ? '🔴 Join Live Now' : '📹 Join Session'}
                         </Text>
                       </LinearGradient>
                    </TouchableOpacity>
                 </View>
               </View>
             );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, color: '#4B5563', fontWeight: '600' },
  brandHeader: { backgroundColor: '#fff', paddingVertical: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  logo: { width: 56, height: 56, borderRadius: 28, marginBottom: 8, borderWidth: 2, borderColor: '#FEE2E2' },
  brandTitleText: { fontSize: 20, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  brandSubtitleText: { fontSize: 11, color: '#6B7280', marginTop: 2, fontWeight: '500' },
  scrollList: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 24, overflow: 'hidden', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 15 },
  cardHero: { padding: 20, minHeight: 180, justifyContent: 'space-between' },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', marginRight: 6 },
  liveBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  heroContent: { marginTop: 'auto' },
  heroPreTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 4 },
  cardInfo: { padding: 20 },
  dateTimeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  calendarBox: { width: 56, height: 56, backgroundColor: '#3B82F6', borderRadius: 10, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  calendarMonth: { color: '#fff', fontSize: 10, fontWeight: '800' },
  calendarDay: { color: '#fff', fontSize: 22, fontWeight: '900' },
  timeInfo: { marginLeft: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeText: { color: '#111827', fontSize: 16, fontWeight: '800', marginLeft: 6 },
  dateText: { color: '#6B7280', fontSize: 12, marginTop: 4, fontWeight: '500' },
  courseSource: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 16, marginBottom: 16 },
  sourceLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  sourceName: { fontSize: 14, color: '#111827', fontWeight: '800', marginTop: 2 },
  joinBtn: { height: 50, borderRadius: 12, overflow: 'hidden' },
  btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyCircle: { width: 100, height: 100, backgroundColor: '#F3F4F6', borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  emptySubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' },
});

export default LiveSession;