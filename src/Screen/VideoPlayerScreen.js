import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Image,
  Alert,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import Video from 'react-native-video';
import { getCourseById } from '../Services/courseService';
import { useAuth } from '../Context/AuthContext';
import { toggleLectureCompletion } from '../Services/courseService';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const VideoPlayerScreen = ({ route, navigation }) => {
  const { courseId } = route.params || {};
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [currentLecture, setCurrentLecture] = useState(null);
  const [currentSection, setCurrentSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const courseResult = await getCourseById(courseId);
      const courseData = courseResult.success ? courseResult.course : null;

      console.log('🎬 Course data received:', courseData);

      if (courseData && courseData.sections && courseData.sections.length > 0) {
        console.log('✅ Found course with', courseData.sections.length, 'sections');
        setCourse(courseData);
        // Set first lecture as current
        const firstSection = courseData.sections[0];
        console.log('📚 First section:', firstSection);
        console.log('📹 First section lectures:', firstSection.lecturesList);

        if (firstSection.lecturesList && firstSection.lecturesList.length > 0) {
          const firstLecture = firstSection.lecturesList[0];
          console.log('🎥 Setting first lecture:', firstLecture);
          setCurrentLecture(firstLecture);
          setCurrentSection(firstSection);
        }
      } else {
        Alert.alert('Error', 'No video content available for this course');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      Alert.alert('Error', 'Failed to load course content');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleLectureSelect = (lecture, section) => {
    setCurrentLecture(lecture);
    if (section) {
      setCurrentSection(section);
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleVideoLoad = (payload) => {
    setDuration(payload.duration);
    setVideoLoading(false);
  };

  const handleVideoProgress = (progress) => {
    setCurrentTime(progress.currentTime);
  };

  const handleVideoEnd = async () => {
    if (currentLecture && currentSection && user) {
      // Mark lecture as completed
      await toggleLectureCompletion(user.uid, courseId, currentSection.id, currentLecture.id);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return duration > 0 ? (currentTime / duration) * 100 : 0;
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading course content...</Text>
      </SafeAreaView>
    );
  }

  // No course data
  if (!course) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color="#DC2626" />
        <Text style={styles.errorText}>Failed to load course</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {course.title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Video Player Section */}
      <View style={styles.videoContainer}>
        {currentLecture && (
          <>
            {currentLecture.videoUrl ? (
              <Video
                ref={videoRef}
                source={{ uri: currentLecture.videoUrl }}
                style={styles.videoPlayer}
                controls={true}
                resizeMode="contain"
                onLoad={handleVideoLoad}
                onProgress={handleVideoProgress}
                onEnd={handleVideoEnd}
                onLoadStart={() => setVideoLoading(true)}
                paused={!isPlaying}
                fullscreen={isFullscreen}
                onFullscreenPlayerWillPresent={() => setIsFullscreen(true)}
                onFullscreenPlayerWillDismiss={() => setIsFullscreen(false)}
              />
            ) : (
              <View style={styles.noVideoContainer}>
                <MaterialCommunityIcons name="video-off" size={64} color="#9CA3AF" />
                <Text style={styles.noVideoText}>No video available for this lecture</Text>
                <Text style={styles.noVideoSubText}>
                  The video URL might be missing or corrupted
                </Text>
              </View>
            )}

            {videoLoading && (
              <View style={styles.videoLoadingOverlay}>
                <ActivityIndicator size="large" color="#DC2626" />
              </View>
            )}

            {/* Current Lecture Info */}
            <View style={styles.lectureInfo}>
              <Text style={styles.lectureTitle}>{currentLecture.title}</Text>
              <Text style={styles.lectureDuration}>
                Duration: {currentLecture.duration}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Course Content */}
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Chapters Section */}
        <View style={styles.chaptersContainer}>
          <Text style={styles.sectionTitle}>Course Content</Text>

          {course.sections.map((section, sectionIndex) => (
            <View key={section.id} style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="book-open-variant" size={20} color="#DC2626" />
                <Text style={styles.sectionTitle}>
                  Chapter {sectionIndex + 1}: {section.title}
                </Text>
                <Text style={styles.sectionStats}>
                  {section.completed}/{section.lectures} completed
                </Text>
              </View>

              {/* Lectures */}
              {section.lecturesList.map((lecture, lectureIndex) => (
                <TouchableOpacity
                  key={lecture.id}
                  style={[
                    styles.lectureItem,
                    currentLecture?.id === lecture.id && styles.currentLectureItem,
                    lecture.isCompleted && styles.completedLectureItem
                  ]}
                  onPress={() => handleLectureSelect(lecture, section)}
                  activeOpacity={0.7}
                >
                  <View style={styles.lectureItemLeft}>
                    <View style={[
                      styles.lectureNumber,
                      lecture.isCompleted && styles.completedLectureNumber
                    ]}>
                      {lecture.isCompleted ? (
                        <MaterialCommunityIcons name="check" size={16} color="#FFF" />
                      ) : (
                        <Text style={styles.lectureNumberText}>{lectureIndex + 1}</Text>
                      )}
                    </View>

                    <View style={styles.lectureDetails}>
                      <Text style={[
                        styles.lectureItemTitle,
                        currentLecture?.id === lecture.id && styles.currentLectureTitle,
                        lecture.isCompleted && styles.completedLectureTitle
                      ]}>
                        {lecture.title}
                      </Text>
                      <Text style={styles.lectureItemDuration}>
                        {lecture.duration}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.lectureItemRight}>
                    {lecture.isPreviewFree && !course.isPurchased && (
                      <View style={styles.previewBadge}>
                        <Text style={styles.previewText}>FREE</Text>
                      </View>
                    )}
                    {currentLecture?.id === lecture.id && (
                      <MaterialCommunityIcons name="play" size={20} color="#DC2626" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    height:40,
    width:70,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 32,
    backgroundColor: '#000',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40,
  },
  videoContainer: {
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: width,
    height: width * 0.5625, // 16:9 aspect ratio
    backgroundColor: '#000',
  },
  videoLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  noVideoContainer: {
    width: width,
    height: width * 0.5625, // 16:9 aspect ratio
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noVideoText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  noVideoSubText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  lectureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  lectureDuration: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#111',
  },
  chaptersContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionStats: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 'auto',
  },
  lectureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    marginBottom: 8,
  },
  currentLectureItem: {
    backgroundColor: '#DC2626',
  },
  completedLectureItem: {
    backgroundColor: '#065F46',
  },
  lectureItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  lectureNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedLectureNumber: {
    backgroundColor: '#10B981',
  },
  lectureNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  lectureDetails: {
    flex: 1,
  },
  lectureItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2,
  },
  currentLectureTitle: {
    color: '#FFF',
  },
  completedLectureTitle: {
    color: '#FFF',
  },
  lectureItemDuration: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  lectureItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  previewText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default VideoPlayerScreen;