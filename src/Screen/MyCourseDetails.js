import React, { useState, useRef, useEffect } from 'react';
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
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getCourseById, toggleLectureCompletion as toggleLectureInFirestore } from '../Services/courseService';
import { initializeCourseProgress, toggleLectureCompletion } from '../unities/progressTracker';
import { checkCourseExpiry } from '../unities/courseExpiry';
import { useAuth } from '../Context/AuthContext';
import Toast from 'react-native-toast-message';
 
const { width, height } = Dimensions.get('window');

const MyCourseDetails = ({ route, navigation }) => {
  const { courseId } = route.params;
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef(null);

  // Fetch course and initialize progress
  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId || !user) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('📚 Fetching course details:', courseId);
        setIsLoading(true);

        const result = await getCourseById(courseId);

        if (result.success && result.course) {
          console.log('✅ Course fetched:', result.course);
          console.log('📊 Sections found:', result.course.sections?.length || 0);

          // Get saved progress from Firestore
          const { getCourseProgress } = await import('../Services/courseService');
          const progressResult = await getCourseProgress(user.uid, courseId);
          
          console.log('📈 Progress data:', progressResult);

          // Initialize course with progress
          const savedProgress = progressResult.success && progressResult.progress 
            ? progressResult.progress 
            : { progress: 0, completedLectures: [], status: 'IN_PROGRESS' };

          const initializedCourse = initializeCourseProgress(result.course, savedProgress);
          const courseWithExpiry = checkCourseExpiry(initializedCourse);
          
          console.log('✅ Course initialized with progress:', courseWithExpiry.progress + '%');
          console.log('📝 Completed lectures:', savedProgress.completedLectures?.length || 0);
          
          setCourse(courseWithExpiry);

          // Set first section and lecture as default
          if (courseWithExpiry.sections && courseWithExpiry.sections.length > 0) {
            const firstSection = courseWithExpiry.sections[0];
            setSelectedSection(firstSection);
            if (firstSection.lecturesList && firstSection.lecturesList.length > 0) {
              setSelectedLecture(firstSection.lecturesList[0]);
            }
            setExpandedSections(new Set([firstSection.id]));
          }
        } else {
          console.error('❌ Failed to fetch course:', result.error);
          Toast.show({
            type: 'error',
            text1: 'Failed to load course',
          });
        }
      } catch (error) {
        console.error('❌ Error fetching course:', error);
        Toast.show({
          type: 'error',
          text1: 'An error occurred while loading the course',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, user]);

  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const selectLecture = (section, lecture) => {
    setSelectedSection(section);
    setSelectedLecture(lecture);
    setIsPlaying(true);
    setVideoProgress(0);
    setHasMarkedComplete(false);
    setCurrentTime(0);
  };

  // Auto-mark lecture as complete when 90% watched
  const handleVideoProgress = async (data) => {
    if (!selectedLecture || !selectedSection) return;
    
    const progress = (data.currentTime / data.seekableDuration) * 100;
    setCurrentTime(data.currentTime);
    setDuration(data.seekableDuration);
    setVideoProgress(progress);
    
    // Auto-complete when 90% watched and not already marked complete
    if (progress >= 90 && !selectedLecture.isCompleted && !hasMarkedComplete) {
      console.log('🎯 Lecture 90% complete, auto-marking as done');
      setHasMarkedComplete(true);
      
      await handleToggleLectureCompletion(selectedSection.id, selectedLecture.id);
      
      Toast.show({
        type: 'success',
        text1: '✅ Lecture completed!',
      });
    }
  };

  // Handle lecture completion toggle with proper Firestore sync
  const handleToggleLectureCompletion = async (sectionId, lectureId) => {
    if (!course || !user) return;
    
    try {
      console.log('🔄 Toggling lecture completion:', { sectionId, lectureId });
      
      // Update local state immediately for UI responsiveness
      const updatedCourse = toggleLectureCompletion(course, sectionId, lectureId);
      setCourse(updatedCourse);
      
      console.log('✅ Local state updated, new progress:', updatedCourse.progress + '%');
      
      // Update Firestore in background
      const result = await toggleLectureInFirestore(user.uid, courseId, sectionId, lectureId);
      
      if (result.success) {
        console.log('✅ Firestore updated successfully');
        Toast.show({
          type: 'success',
          text1: 'Progress saved!',
        });
      } else {
        console.error('❌ Failed to update Firestore:', result.error);
        Toast.show({
          type: 'error',
          text1: 'Failed to save progress',
        });
        // Revert local state if Firestore update failed
        setCourse(course);
      }
      
      // Update selected section and lecture if they match
      const updatedSection = updatedCourse.sections.find(s => s.id === sectionId);
      if (updatedSection) {
        setSelectedSection(updatedSection);
        const updatedLecture = updatedSection.lecturesList.find(l => l.id === lectureId);
        if (updatedLecture) {
          setSelectedLecture(updatedLecture);
        }
      }
    } catch (error) {
      console.error('❌ Error toggling lecture completion:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to update progress',
      });
    }
  };

  const handleVideoEnd = async () => {
    console.log('🎬 Video ended');
    if (selectedLecture && !selectedLecture.isCompleted) {
      await handleToggleLectureCompletion(selectedSection.id, selectedLecture.id);
      Toast.show({
        type: 'success',
        text1: '✅ Lecture completed!',
      });
    }
  };

  const getTotalLectures = () => {
    if (!course?.sections) return 0;
    return course.sections.reduce((sum, s) => sum + (s.lecturesList?.length || 0), 0);
  };

  const getCompletedLectures = () => {
    if (!course?.sections) return 0;
    return course.sections.reduce((sum, s) => sum + (s.lecturesList?.filter(l => l.isCompleted).length || 0), 0);
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#9333ea" />
          <Text style={styles.loadingText}>Loading course...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (!course) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Course not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // No sections state
  if (!course.sections || course.sections.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1f2937" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {course.courseTitle || course.title}
          </Text>
        </View>

        <View style={styles.centerContainer}>
          <View style={styles.warningIcon}>
            <Text style={styles.warningEmoji}>⚠️</Text>
          </View>
          <Text style={styles.errorText}>Course content not available</Text>
          <Text style={styles.errorSubtext}>
            This course doesn't have any sections or lectures yet.
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: '#dc2626' }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1f2937" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {course.courseTitle || course.title}
          </Text>
        </View>
        <Text style={styles.progressBadge}>
          {course.progress || 0}%
        </Text>
      </View>

      {/* Video Player */}
      <View style={styles.videoContainer}>
        {selectedLecture && selectedLecture.url ? (
          <Video
            ref={videoRef}
            source={{ uri: selectedLecture.url }}
            style={styles.video}
            controls={true}
            resizeMode="contain"
            onProgress={handleVideoProgress}
            onEnd={handleVideoEnd}
            paused={!isPlaying}
            onLoad={(data) => setDuration(data.duration)}
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => setIsPlaying(!isPlaying)}
            >
              <Icon
                name={isPlaying ? 'pause' : 'play-arrow'}
                size={40}
                color="#fff"
              />
            </TouchableOpacity>
            <Text style={styles.videoPlaceholderText}>
              {selectedLecture ? selectedLecture.title : 'Select a lecture'}
            </Text>
            {selectedLecture && !selectedLecture.url && (
              <Text style={styles.videoPlaceholderSubtext}>
                Video URL not available
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Course Content */}
      <View style={styles.contentContainer}>
        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Course Progress</Text>
            <Text style={styles.progressValue}>{course.progress || 0}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${course.progress || 0}%` },
              ]}
            />
          </View>
          <Text style={styles.progressSubtext}>
            {getCompletedLectures()} of {getTotalLectures()} lectures completed
          </Text>
        </View>

        {/* Sections List */}
        <ScrollView style={styles.sectionsList} showsVerticalScrollIndicator={false}>
          {course.sections.map((section) => (
            <View key={section.id} style={styles.sectionItem}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.id)}
              >
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {section.lecturesList?.filter(l => l.isCompleted).length || 0} /{' '}
                    {section.lecturesList?.length || 0} completed
                  </Text>
                </View>
                <Icon
                  name={expandedSections.has(section.id) ? 'expand-less' : 'expand-more'}
                  size={24}
                  color="#9ca3af"
                />
              </TouchableOpacity>

              {expandedSections.has(section.id) && section.lecturesList && (
                <View style={styles.lecturesList}>
                  {section.lecturesList.map((lecture) => (
                    <TouchableOpacity
                      key={lecture.id}
                      style={[
                        styles.lectureItem,
                        selectedLecture?.id === lecture.id && styles.lectureItemActive,
                      ]}
                      onPress={() => selectLecture(section, lecture)}
                    >
                      <TouchableOpacity
                        onPress={() => handleToggleLectureCompletion(section.id, lecture.id)}
                        style={styles.checkboxContainer}
                      >
                        <Icon
                          name={lecture.isCompleted ? 'check-circle' : 'radio-button-unchecked'}
                          size={18}
                          color={lecture.isCompleted ? '#10b981' : '#6b7280'}
                        />
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.lectureTitle,
                          lecture.isCompleted && styles.lectureTitleCompleted,
                        ]}
                        numberOfLines={2}
                      >
                        {lecture.title}
                      </Text>
                      <Text style={styles.lectureDuration}>
                        {lecture.duration || '5'} min
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 16,
  },
  errorSubtext: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  warningIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#eab308',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningEmoji: {
    fontSize: 32,
  },
  backButton: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backIconButton: {
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  progressBadge: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  videoContainer: {
    width: width,
    height: height * 0.3,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  videoPlaceholderText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  videoPlaceholderSubtext: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#1f2937',
  },
  progressSection: {
    padding: 16,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  progressValue: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressSubtext: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  sectionsList: {
    flex: 1,
    padding: 16,
  },
  sectionItem: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  lecturesList: {
    marginTop: 8,
  },
  lectureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  lectureItemActive: {
    backgroundColor: '#374151',
    borderLeftWidth: 4,
    borderLeftColor: '#9333ea',
  },
  checkboxContainer: {
    marginRight: 8,
  },
  lectureTitle: {
    flex: 1,
    color: '#d1d5db',
    fontSize: 14,
  },
  lectureTitleCompleted: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  lectureDuration: {
    color: '#6b7280',
    fontSize: 12,
    marginLeft: 8,
  },
});

export default MyCourseDetails;