// src/Screen/VideoPlayerScreen.js
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import ScreenGuard from 'react-native-screenguard';
import { getCourseById, toggleLectureCompletion as toggleLectureInFirestore, getCourseProgress } from '../Services/courseService';
import { initializeCourseProgress, toggleLectureCompletion } from '../unities/progressTracker';
import { checkCourseExpiry } from '../unities/courseExpiry';
import { useAuth } from '../Context/AuthContext';
import Toast from 'react-native-toast-message';
import ProgressBar from '../Components/Progressbar';
import PdfViewer from '../Components/PdfViewer';

const { width } = Dimensions.get('window');

function isPdfLecture(lecture) {
  if (!lecture) return false;
  if (lecture.lectureType === 'pdf') return true;
  const u = lecture.url || lecture.videoUrl || '';
  if (/\.pdf(\?|#|$)/i.test(u)) return true;
  try {
    return decodeURIComponent(u).toLowerCase().includes('.pdf');
  } catch {
    return false;
  }
}

const VideoPlayerScreen = ({ route, navigation }) => {
  const { courseId } = route.params || {};
  const { user } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLecture, setActiveLecture] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [isPlaying, setIsPlaying] = useState(true); 
  const [isBuffering, setIsBuffering] = useState(false);
  
  const videoRef = useRef(null);

  useEffect(() => {
    ScreenGuard.register({ backgroundColor: '#000000', timeAfterResume: 1000 });
    
    const fetchData = async () => {
      if (!user?.uid || !courseId) return;
      try {
        setLoading(true);
        const [courseResult, progressResult] = await Promise.all([
          getCourseById(courseId),
          getCourseProgress(user.uid, courseId)
        ]);

        if (courseResult.success && courseResult.course) {
          const rawCourse = courseResult.course;
          const savedProgress = progressResult.success && progressResult.progress 
            ? progressResult.progress 
            : { progress: 0, completedLectures: [], status: 'IN_PROGRESS' };

          const initializedCourse = initializeCourseProgress(rawCourse, savedProgress);
          const courseWithExpiry = checkCourseExpiry(initializedCourse);
          setCourse(courseWithExpiry);

          let firstPlayable = null;
          let firstSecId = null;

          if (courseWithExpiry.sections?.length > 0) {
            for (const section of courseWithExpiry.sections) {
              const lecture = section.lecturesList?.find(l => l.url || l.videoUrl);
              if (lecture) {
                firstPlayable = lecture;
                firstSecId = section.id;
                break;
              }
            }
            if (!firstPlayable) {
                firstSecId = courseWithExpiry.sections[0].id;
                firstPlayable = courseWithExpiry.sections[0].lecturesList?.[0];
            }
            setExpandedChapters({ [firstSecId]: true });
            setActiveLecture(firstPlayable);
            setActiveSectionId(firstSecId);
          }
        } else {
          navigation.goBack();
        }
      } catch (error) {
        console.error('Fetch Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => ScreenGuard.unregister();
  }, [courseId, user?.uid]);

  const handleLectureClick = (section, lecture) => {
    if (!lecture.url && !lecture.videoUrl) return;
    setActiveLecture(lecture);
    setActiveSectionId(section.id);
    setIsPlaying(true);
  };

  const handleToggleCompletion = async (sectionId, lectureId) => {
    if (!user?.uid || !course) return;
    try {
      const updatedCourse = toggleLectureCompletion(course, sectionId, lectureId);
      setCourse(updatedCourse);
      await toggleLectureInFirestore(user.uid, courseId, sectionId, lectureId);
    } catch (e) {}
  };

  const togglePlayPause = () => setIsPlaying(!isPlaying);

  if (loading) return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#DC2626" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{course?.courseTitle || course?.title}</Text>
          <View style={styles.headerProgressRow}>
            <View style={styles.headerProgressBar}><ProgressBar progress={course?.progress || 0} height={4} /></View>
            <Text style={styles.headerProgressText}>{Math.round(course?.progress || 0)}%</Text>
          </View>
        </View>
      </View>

      <ScrollView stickyHeaderIndices={[0]} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.videoContainer,
            activeLecture && isPdfLecture(activeLecture) && styles.pdfVideoContainer,
          ]}
        >
          {activeLecture ? (
            isPdfLecture(activeLecture) ? (
              <PdfViewer uri={activeLecture.url || activeLecture.videoUrl} style={styles.pdfViewer} />
            ) : (
              <View style={styles.videoWrapper}>
                <Video
                  ref={videoRef}
                  source={{ uri: activeLecture.url || activeLecture.videoUrl }}
                  style={styles.video}
                  controls={true}
                  resizeMode="contain"
                  paused={!isPlaying}
                  onBuffer={({ isBuffering }) => setIsBuffering(isBuffering)}
                  onEnd={() => handleToggleCompletion(activeSectionId, activeLecture.id)}
                  poster={course?.courseThumbnail}
                  posterResizeMode="cover"
                />

                {isBuffering && (
                  <View style={styles.bufferContainer}>
                    <ActivityIndicator size="large" color="#DC2626" />
                  </View>
                )}
              </View>
            )
          ) : (
            <View style={styles.videoPlaceholder}>
              <MaterialCommunityIcons name="video-off" size={64} color="rgba(255,255,255,0.2)" />
              <Text style={styles.placeholderText}>No lecture selected</Text>
            </View>
          )}
        </View>

        <View style={styles.lectureInfoCard}>
           <Text style={styles.lectureTitleText}>{activeLecture?.title || 'Learning Module'}</Text>
           <View style={styles.metaRow}>
              {activeLecture && isPdfLecture(activeLecture) ? (
                <View style={styles.metaBadge}>
                  <Icon name="picture-as-pdf" size={14} color="#f59e0b" />
                  <Text style={[styles.metaText, { color: '#f59e0b' }]}>PDF</Text>
                </View>
              ) : (
              <View style={styles.metaBadge}>
                <Icon name="access-time" size={14} color="#9ca3af" />
                <Text style={styles.metaText}>{activeLecture?.duration || '0'} min</Text>
              </View>
              )}
              <View style={styles.orderLabel}><Text style={styles.orderLabelText}>CHAPTER {activeLecture?.order || '1'}</Text></View>
              {course?.sections?.find(s => s.id === activeSectionId)?.lecturesList?.find(l => l.id === activeLecture?.id)?.isCompleted && (
                <View style={styles.completedBadge}>
                  <Icon name="check-circle" size={14} color="#10b981" />
                  <Text style={styles.completedBadgeText}>Finished</Text>
                </View>
              )}
           </View>
           {activeLecture &&
            isPdfLecture(activeLecture) &&
            !course?.sections
              ?.find((s) => s.id === activeSectionId)
              ?.lecturesList?.find((l) => l.id === activeLecture.id)?.isCompleted && (
              <TouchableOpacity
                style={styles.markPdfDoneBtn}
                onPress={() => handleToggleCompletion(activeSectionId, activeLecture.id)}
              >
                <Text style={styles.markPdfDoneText}>Mark as completed</Text>
              </TouchableOpacity>
            )}
        </View>

        <View style={styles.tocSection}>
          <Text style={styles.tocHeader}>REMAINING LESSONS</Text>
          {course?.sections?.map((section) => (
            <View key={section.id} style={styles.sectionContainer}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setExpandedChapters(p => ({...p, [section.id]: !p[section.id]}))} style={styles.sectionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitleText}>{section.title}</Text>
                  <Text style={styles.sectionMetaText}>{section.lectures} Lectures • {section.duration}</Text>
                </View>
                <Icon name={expandedChapters[section.id] ? "expand-less" : "expand-more"} size={24} color="#6b7280" />
              </TouchableOpacity>

              {expandedChapters[section.id] && (
                <View style={styles.lecturesList}>
                  {section.lecturesList?.map((lecture) => (
                    <TouchableOpacity
                      key={lecture.id}
                      style={[styles.lectureItem, activeLecture?.id === lecture.id && styles.activeLectureItem]}
                      onPress={() => handleLectureClick(section, lecture)}
                    >
                      <Icon
                        name={
                          lecture.isCompleted
                            ? 'check-circle'
                            : isPdfLecture(lecture)
                              ? 'picture-as-pdf'
                              : 'play-circle-outline'
                        }
                        size={20}
                        color={
                          lecture.isCompleted
                            ? '#10b981'
                            : activeLecture?.id === lecture.id
                              ? isPdfLecture(lecture)
                                ? '#f59e0b'
                                : '#DC2626'
                              : '#6b7280'
                        }
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.lectureItemTitle, activeLecture?.id === lecture.id && styles.activeLectureTitle]}>{lecture.title}</Text>
                        <Text style={styles.lectureItemMeta}>
                          {isPdfLecture(lecture) ? 'PDF' : `${lecture.duration} min`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#030712' },
  header: { height: 75, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  headerIcon: { padding: 4, marginRight: 12 },
  headerInfo: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  headerProgressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  headerProgressBar: { flex: 1, marginRight: 12 },
  headerProgressText: { color: '#DC2626', fontSize: 12, fontWeight: '900' },
  videoContainer: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  pdfVideoContainer: { aspectRatio: undefined, height: Dimensions.get('window').height * 0.55 },
  pdfViewer: { flex: 1, width: '100%', height: '100%' },
  videoWrapper: { width: '100%', height: '100%', position: 'relative' },
  video: { width: '100%', height: '100%' },
  bufferContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#4b5563', marginTop: 12, fontSize: 14 },
  lectureInfoCard: { padding: 20, backgroundColor: '#030712', borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  lectureTitleText: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaBadge: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  metaText: { color: '#9ca3af', fontSize: 12, marginLeft: 4 },
  orderLabel: { backgroundColor: '#1f2937', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  orderLabelText: { color: '#d1d5db', fontSize: 10, fontWeight: '900' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  completedBadgeText: { color: '#10b981', fontSize: 11, fontWeight: '800', marginLeft: 4 },
  tocSection: { padding: 16 },
  tocHeader: { color: '#4b5563', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 16 },
  sectionContainer: { backgroundColor: '#111827', borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  sectionTitleText: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  sectionMetaText: { color: '#6b7280', fontSize: 11, fontWeight: '700' },
  lecturesList: { backgroundColor: '#030712', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1f2937' },
  lectureItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  activeLectureItem: { backgroundColor: 'rgba(220, 38, 38, 0.05)', borderLeftColor: '#DC2626' },
  lectureItemTitle: { color: '#9ca3af', fontSize: 15, fontWeight: '600' },
  activeLectureTitle: { color: '#fff', fontWeight: '800' },
  lectureItemMeta: { color: '#6b7280', fontSize: 11, marginTop: 2, fontWeight: '700' },
  markPdfDoneBtn: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: '#DC2626',
  },
  markPdfDoneText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

export default VideoPlayerScreen;