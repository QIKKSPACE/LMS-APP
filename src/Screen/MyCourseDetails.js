import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  StatusBar,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';
import { getCourseById, toggleLectureCompletion as toggleLectureInFirestore } from '../Services/courseService';
import { initializeCourseProgress, toggleLectureCompletion } from '../unities/progressTracker';
import { checkCourseExpiry } from '../unities/courseExpiry';
import { useAuth } from '../Context/AuthContext';

const { width, height } = Dimensions.get('window');

const MyCourseDetails = ({ route, navigation }) => {
  const { courseId } = route.params || {};
  const { user } = useAuth();

  const onBack = () => {
    navigation.goBack();
  };
  const [course, setCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);
  const videoRef = useRef(null);

  // Toast helper function
  const showToast = (message, duration = 'SHORT') => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, duration === 'SHORT' ? ToastAndroid.SHORT : ToastAndroid.LONG);
    } else {
      Alert.alert('', message);
    }
  };

  // ✅ Fetch course and initialize progress
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

          // Get saved progress from enrollment data
          const { getUserCourses } = await import('../Services/courseService');
          const userCourses = await getUserCourses(user.uid);
          const courseEnrollment = userCourses.find(course => course.id === courseId);

          console.log('📈 Progress data:', courseEnrollment);

          // Initialize course with progress
          const savedProgress = courseEnrollment
            ? {
                progress: courseEnrollment.progress || 0,
                completedLectures: courseEnrollment.completedLectures || [],
                status: courseEnrollment.status || 'IN_PROGRESS'
              }
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
          showToast('Failed to load course');
        }
      } catch (error) {
        console.error('❌ Error fetching course:', error);
        showToast('An error occurred while loading the course');
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
  };

  // ✅ Auto-mark lecture as complete when 90% watched
  const handleVideoProgress = async (data) => {
    if (!selectedLecture || !selectedSection) return;
    
    const progress = (data.currentTime / data.seekableDuration) * 100;
    setVideoProgress(progress);
    
    // Auto-complete when 90% watched and not already marked complete
    if (progress >= 90 && !selectedLecture.isCompleted && !hasMarkedComplete) {
      console.log('🎯 Lecture 90% complete, auto-marking as done');
      setHasMarkedComplete(true);
      
      await handleToggleLectureCompletion(selectedSection.id, selectedLecture.id);
      showToast('✅ Lecture completed!');
    }
  };

  // ✅ Handle lecture completion toggle with proper Firestore sync
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
        showToast('Progress saved!');
      } else {
        console.error('❌ Failed to update Firestore:', result.error);
        showToast('Failed to save progress');
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
      showToast('Failed to update progress');
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNextLecture = () => {
    if (!course || !selectedSection || !selectedLecture) return;
    
    const currentSectionIndex = course.sections.findIndex(s => s.id === selectedSection.id);
    const currentLectureIndex = selectedSection.lecturesList.findIndex(l => l.id === selectedLecture.id);
    
    if (currentLectureIndex < selectedSection.lecturesList.length - 1) {
      const nextLecture = selectedSection.lecturesList[currentLectureIndex + 1];
      selectLecture(selectedSection, nextLecture);
    } else if (currentSectionIndex < course.sections.length - 1) {
      const nextSection = course.sections[currentSectionIndex + 1];
      if (nextSection.lecturesList && nextSection.lecturesList.length > 0) {
        selectLecture(nextSection, nextSection.lecturesList[0]);
      }
    }
  };

  const handlePreviousLecture = () => {
    if (!course || !selectedSection || !selectedLecture) return;
    
    const currentSectionIndex = course.sections.findIndex(s => s.id === selectedSection.id);
    const currentLectureIndex = selectedSection.lecturesList.findIndex(l => l.id === selectedLecture.id);
    
    if (currentLectureIndex > 0) {
      const prevLecture = selectedSection.lecturesList[currentLectureIndex - 1];
      selectLecture(selectedSection, prevLecture);
    } else if (currentSectionIndex > 0) {
      const prevSection = course.sections[currentSectionIndex - 1];
      if (prevSection.lecturesList && prevSection.lecturesList.length > 0) {
        selectLecture(prevSection, prevSection.lecturesList[prevSection.lecturesList.length - 1]);
      }
    }
  };

  const getTotalLectures = () => {
    return course?.sections.reduce((sum, s) => sum + (s.lecturesList?.length || 0), 0) || 0;
  };

  const getCompletedLectures = () => {
    return course?.sections.reduce((sum, s) => sum + (s.lecturesList?.filter(l => l.isCompleted).length || 0), 0) || 0;
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <View style={styles.centerContent}>
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
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Course not found</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onBack}
          >
            <Text style={styles.buttonText}>Go Back</Text>
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
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.headerButton}>
            <Icon name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {course.courseTitle || course.title}
          </Text>
        </View>

        <View style={styles.centerContent}>
          <View style={styles.warningIcon}>
            <Text style={styles.warningEmoji}>⚠️</Text>
          </View>
          <Text style={styles.errorText}>Course content not available</Text>
          <Text style={styles.errorSubtext}>
            This course doesn't have any sections or lectures yet.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: '#dc2626' }]}
            onPress={onBack}
          >
            <Text style={styles.buttonText}>Go Back</Text>
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
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {course.courseTitle || course.title}
          </Text>
        </View>
        <Text style={styles.progressBadge}>{course.progress || 0}%</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Video Section */}
        <View style={styles.videoContainer}>
          {selectedLecture && selectedLecture.url ? (
            <Video
              ref={videoRef}
              source={{ uri: selectedLecture.url }}
              style={styles.video}
              controls={true}
              resizeMode="contain"
              onProgress={handleVideoProgress}
              onEnd={async () => {
                console.log('🎬 Video ended');
                if (!selectedLecture.isCompleted) {
                  await handleToggleLectureCompletion(selectedSection.id, selectedLecture.id);
                  showToast('✅ Lecture completed!');
                }
              }}
              paused={!isPlaying}
            />
          ) : (
            <View style={styles.videoPlaceholder}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlayPause}
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
                <Text style={styles.videoPlaceholderSubtext}>Video URL not available</Text>
              )}
            </View>
          )}
        </View>

        {/* Progress Bar Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Course Progress</Text>
            <Text style={styles.progressValue}>{course.progress || 0}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBarFill, { width: `${course.progress || 0}%` }]}
            />
          </View>
          <Text style={styles.progressSubtext}>
            {getCompletedLectures()} of {getTotalLectures()} lectures completed
          </Text>
        </View>

        {/* Sections List */}
        <View style={styles.sectionsContainer}>
          {course.sections.map((section) => (
            <View key={section.id} style={styles.sectionBlock}>
              {/* Section Header */}
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.id)}
              >
                <View style={styles.sectionHeaderLeft}>
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

              {/* Lectures List */}
              {expandedSections.has(section.id) && section.lecturesList && (
                <View style={styles.lecturesContainer}>
                  {section.lecturesList.map((lecture) => (
                    <View key={lecture.id}>
                      <TouchableOpacity
                        style={[
                          styles.lectureItem,
                          selectedLecture?.id === lecture.id && styles.lectureItemActive,
                        ]}
                        onPress={() => selectLecture(section, lecture)}
                      >
                        <View style={styles.lectureLeft}>
                          <TouchableOpacity
                            onPress={() => handleToggleLectureCompletion(section.id, lecture.id)}
                            style={styles.checkboxButton}
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
                        </View>
                        <Text style={styles.lectureDuration}>{lecture.duration || '5'} min</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollContainer: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  progressBadge: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  videoContainer: {
    width: '100%',
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
    padding: 20,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    textAlign: 'center',
  },
  progressSection: {
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressSubtext: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  sectionsContainer: {
    padding: 16,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
  },
  sectionHeaderLeft: {
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
  lecturesContainer: {
    marginTop: 8,
  },
  lectureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  lectureLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxButton: {
    padding: 4,
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