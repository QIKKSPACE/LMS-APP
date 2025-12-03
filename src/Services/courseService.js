// src/services/courseService.js
import firestore from '@react-native-firebase/firestore';
  import { db } from '../firebase';
  
  /**
   * Convert admin course structure to frontend format
   */
  const convertCourseFormat = (adminCourse, userEnrollment = null) => {
    const course = {
      id: adminCourse.id,
      title: adminCourse.courseTitle,
      thumbnail: adminCourse.courseThumbnail,
      description: adminCourse.courseDescription,
      price: adminCourse.price,
      discount: adminCourse.discount || 0,
      membershipType: 'PREMIUM', // Default
      chapters: adminCourse.courseContent?.length || 0,
      category: 'all',
      
      // Convert courseContent (chapters) to sections
      sections: adminCourse.courseContent?.map(chapter => ({
        id: chapter.chapterId,
        title: chapter.chapterTitle,
        lectures: chapter.chapterContent?.length || 0,
        completed: 0, // Will be calculated from user progress
        duration: calculateSectionDuration(chapter.chapterContent),
        lecturesList: chapter.chapterContent?.map(lecture => ({
          id: lecture.lectureId,
          title: lecture.lectureTitle,
          duration: formatDuration(lecture.lectureDuration),
          isCompleted: false, // Will be updated from user progress
          videoUrl: lecture.lectureUrl,
          isPreviewFree: lecture.isPreviewFree || false,
          order: lecture.lectureOrder
        })).sort((a, b) => a.order - b.order) || []
      })).sort((a, b) => a.id.localeCompare(b.id)) || [],
  
      // Live lectures
      liveLectures: adminCourse.liveLectures || [],
    };
  
    // If user enrollment exists, add purchase info
    if (userEnrollment) {
      course.isPurchased = true;
      course.enrolledAt = userEnrollment.enrolledAt;
      course.expiryDate = userEnrollment.expiryDate;
      course.progress = userEnrollment.progress || 0;
      course.status = calculateCourseStatus(userEnrollment);
      
      // Update completed lectures from user progress
      if (userEnrollment.completedLectures) {
        course.sections = course.sections.map(section => ({
          ...section,
          lecturesList: section.lecturesList.map(lecture => ({
            ...lecture,
            isCompleted: userEnrollment.completedLectures.includes(lecture.id)
          })),
          completed: section.lecturesList.filter(lecture => 
            userEnrollment.completedLectures.includes(lecture.id)
          ).length
        }));
      }
    } else {
      course.isPurchased = false;
      course.progress = 0;
      course.status = 'PAID';
    }
  
    return course;
  };
  
  /**
   * Calculate total duration of a section
   */
  const calculateSectionDuration = (lectures = []) => {
    const totalMinutes = lectures.reduce((sum, lecture) => sum + (lecture.lectureDuration || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}hr ${minutes}min`;
  };
  
  /**
   * Format lecture duration
   */
  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes}:00`;
    }
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}`;
  };
  
  /**
   * Calculate course status
   */
  const calculateCourseStatus = (enrollment) => {
    const now = new Date();
    const expiry = new Date(enrollment.expiryDate);
    
    if (enrollment.progress === 100) {
      return 'COMPLETED';
    } else if (expiry < now) {
      return 'EXPIRED';
    } else if (enrollment.progress > 0) {
      return 'IN_PROGRESS';
    } else {
      return 'PAID';
    }
  };
  
  /**
   * Fetch all courses from Firestore
   */
  export const getAllCourses = async () => {
    try {
      const snapshot = await db.collection('courses').get();

      const courses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return courses.map(course => convertCourseFormat(course));
    } catch (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
  };
  
  /**
   * Fetch single course by ID
   */
  export const getCourseById = async (courseId) => {
    try {
      const courseSnap = await db.collection('courses').doc(courseId).get();

      if (courseSnap.exists) {
        return convertCourseFormat({
          id: courseSnap.id,
          ...courseSnap.data()
        });
      }
      return null;
    } catch (error) {
      console.error('Error fetching course:', error);
      return null;
    }
  };
  
  /**
   * Fetch user's enrolled courses
   */
  export const getUserCourses = async (userId) => {
    try {
      // Get user enrollments
      const enrollmentSnap = await db.collection('enrollments').where('userId', '==', userId).get();

      if (enrollmentSnap.empty) {
        return [];
      }

      const enrollments = {};
      enrollmentSnap.docs.forEach(doc => {
        enrollments[doc.data().courseId] = {
          ...doc.data(),
          enrollmentId: doc.id
        };
      });

      // Get all courses
      const coursesSnap = await db.collection('courses').get();

      // Filter and convert enrolled courses
      const userCourses = coursesSnap.docs
        .filter(doc => enrollments[doc.id])
        .map(doc => {
          const courseData = { id: doc.id, ...doc.data() };
          const enrollment = enrollments[doc.id];
          return convertCourseFormat(courseData, enrollment);
        });

      return userCourses;
    } catch (error) {
      console.error('Error fetching user courses:', error);
      return [];
    }
  };
  
  /**
   * Enroll user in a course (purchase)
   */
  export const enrollInCourse = async (userId, courseId, expiryDate) => {
    try {
      const enrollmentRef = db.collection('enrollments').doc();

      await enrollmentRef.set({
        userId,
        courseId,
        enrolledAt: firestore.FieldValue.serverTimestamp(),
        expiryDate: expiryDate || getDefaultExpiryDate(),
        progress: 0,
        completedLectures: [],
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      });

      return { success: true, enrollmentId: enrollmentRef.id };
    } catch (error) {
      console.error('Error enrolling in course:', error);
      return { success: false, error: error.message };
    }
  };
  
  /**
   * Update course progress
   */
  export const updateCourseProgress = async (userId, courseId, completedLectures) => {
    try {
      // Find enrollment document
      const enrollmentSnap = await db.collection('enrollments')
        .where('userId', '==', userId)
        .where('courseId', '==', courseId)
        .get();

      if (enrollmentSnap.empty) {
        throw new Error('Enrollment not found');
      }

      const enrollmentDoc = enrollmentSnap.docs[0];
      const enrollmentRef = db.collection('enrollments').doc(enrollmentDoc.id);

      // Get course to calculate progress
      const course = await getCourseById(courseId);
      const totalLectures = course.sections.reduce((sum, section) =>
        sum + section.lecturesList.length, 0
      );

      const progress = Math.round((completedLectures.length / totalLectures) * 100);

      await enrollmentRef.update({
        completedLectures,
        progress,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating progress:', error);
      return { success: false, error: error.message };
    }
  };
  
  /**
   * Toggle lecture completion
   */
  export const toggleLectureCompletion = async (userId, courseId, lectureId) => {
    try {
      const enrollmentSnap = await db.collection('enrollments')
        .where('userId', '==', userId)
        .where('courseId', '==', courseId)
        .get();

      if (enrollmentSnap.empty) {
        throw new Error('Enrollment not found');
      }

      const enrollmentDoc = enrollmentSnap.docs[0];
      const enrollmentData = enrollmentDoc.data();
      const completedLectures = enrollmentData.completedLectures || [];

      const isCompleted = completedLectures.includes(lectureId);

      const enrollmentRef = db.collection('enrollments').doc(enrollmentDoc.id);

      if (isCompleted) {
        // Remove from completed
        await enrollmentRef.update({
          completedLectures: arrayRemove(lectureId),
          updatedAt: firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Add to completed
        await enrollmentRef.update({
          completedLectures: arrayUnion(lectureId),
          updatedAt: firestore.FieldValue.serverTimestamp()
        });
      }

      // Recalculate progress
      const newCompletedLectures = isCompleted
        ? completedLectures.filter(id => id !== lectureId)
        : [...completedLectures, lectureId];

      await updateCourseProgress(userId, courseId, newCompletedLectures);

      return { success: true };
    } catch (error) {
      console.error('Error toggling lecture:', error);
      return { success: false, error: error.message };
    }
  };
  
  /**
   * Get default expiry date (1 year from now)
   */
  const getDefaultExpiryDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };
  
  /**
   * Search courses
   */
  export const searchCourses = async (searchTerm) => {
    try {
      const allCourses = await getAllCourses();
      
      if (!searchTerm.trim()) {
        return allCourses;
      }
  
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      return allCourses.filter(course => 
        course.title.toLowerCase().includes(lowerSearchTerm) ||
        course.description?.toLowerCase().includes(lowerSearchTerm)
      );
    } catch (error) {
      console.error('Error searching courses:', error);
      return [];
    }
  };