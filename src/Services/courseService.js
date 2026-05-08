// src/services/courseService.js
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const db = firestore();

/**
 * ✅ Convert Firestore Timestamp or various formats to ISO string safely
 */
const convertTimestampToISO = (timestamp) => {
  try {
    if (!timestamp) return null;
    
    // If it's already a string
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    
    // If it's a Firestore Timestamp (@react-native-firebase version)
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    
    // If it's a Date object
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    
    // If it's a timestamp object with seconds (common in plain objects)
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toISOString();
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error converting timestamp:', error);
    return null;
  }
};

/**
 * ✅ Transform course data from Firestore to app format
 */
const transformCourseData = (courseId, firestoreData, isOverlay = false) => {
  if (!firestoreData) {
    // Gracefully handle missing data as requested
    return null;
  }

  console.log('🔄 Transforming course data for:', courseId);
  
  let sections = [];
  let totalLecturesCount = 0;
  
  if (firestoreData.courseContent && Array.isArray(firestoreData.courseContent)) {
    sections = firestoreData.courseContent.map((chapter, index) => {
      const lecturesList = chapter.chapterContent && Array.isArray(chapter.chapterContent)
        ? chapter.chapterContent.map((lecture, lectureIndex) => {
            const rawType = lecture.lectureType;
            const url = lecture.lectureUrl || lecture.videoUrl || lecture.url || '';
            let looksPdf = rawType === 'pdf' || /\.pdf(\?|#|$)/i.test(url);
            if (!looksPdf && url) {
              try {
                looksPdf = decodeURIComponent(url).toLowerCase().includes('.pdf');
              } catch {
                /* ignore */
              }
            }
            const lectureType = looksPdf ? 'pdf' : 'video';
            return {
            id: lecture.lectureId || `lect_${Date.now()}_${lectureIndex}`,
            title: lecture.lectureTitle || `Lecture ${lectureIndex + 1}`,
            duration: lecture.lectureDuration ?? (lectureType === 'pdf' ? 0 : '30'),
            url,
            videoUrl: url,
            lectureType,
            order: lecture.lectureOrder || lectureIndex + 1,
            isPreviewFree: lecture.isPreviewFree || false,
            processing: lecture.processing || false,
            isCompleted: false,
          };
          })
        : [];
      
      totalLecturesCount += lecturesList.length;
      
      return {
        id: chapter.chapterId || `ch_${Date.now()}_${index}`,
        title: chapter.chapterTitle || `Section ${index + 1}`,
        order: chapter.chapterOrder || index + 1,
        lecturesList: lecturesList,
        lectures: lecturesList.length,
        completed: 0,
        duration: lecturesList.reduce((total, lec) => total + parseInt(lec.duration || 0), 0) + ' min'
      };
    });
  }
  
  return {
    id: courseId,
    title: firestoreData.courseTitle || 'Untitled Course',
    courseTitle: firestoreData.courseTitle,
    courseName: firestoreData.courseTitle,
    thumbnail: firestoreData.courseThumbnail || 'https://via.placeholder.com/800x400?text=Course',
    courseThumbnail: firestoreData.courseThumbnail,
    thumbnailUrl: firestoreData.courseThumbnail,
    imageUrl: firestoreData.courseThumbnail,
    description: firestoreData.courseDescription || '',
    courseDescription: firestoreData.courseDescription,
    price: firestoreData.price || 0,
    discount: firestoreData.discount || 0,
    membershipType: firestoreData.membershipType || 'Standard',
    educatorId: firestoreData.educatorId || '',
    sections: sections,
    chapters: sections.length,
    totalLectures: totalLecturesCount,
    liveLectures: firestoreData.liveLectures || [],
    createdAt: convertTimestampToISO(firestoreData.createdAt),
    updatedAt: convertTimestampToISO(firestoreData.updatedAt),
    courseValidity: firestoreData.courseValidityMonths?.toString() || firestoreData.courseValidity?.toString() || '1',
    status: 'NOT_STARTED',
    progress: 0,
    isPurchased: false,
    isOverlay: isOverlay,
    baseCourseId: firestoreData.courseId || courseId, // The "true" course ID for lectures/ownership
  };
};

/**
 * ✅ Calculate expiry date with proper validation
 */
const calculateExpiryDate = (assignedAt, validityMonths) => {
  try {
    if (!assignedAt || !validityMonths) {
      console.warn('⚠️ Missing assignedAt or validityMonths');
      return null;
    }

    let startDate;
    if (assignedAt && typeof assignedAt.toDate === 'function') {
      startDate = assignedAt.toDate();
    } else if (typeof assignedAt === 'string') {
      startDate = new Date(assignedAt);
    } else if (assignedAt instanceof Date) {
      startDate = assignedAt;
    } else if (assignedAt && typeof assignedAt === 'object' && assignedAt.seconds) {
      startDate = new Date(assignedAt.seconds * 1000);
    } else {
      console.error('❌ Invalid assignedAt format:', assignedAt);
      return null;
    }

    if (isNaN(startDate.getTime())) {
      console.error('❌ Invalid date after conversion:', startDate);
      return null;
    }

    const expiryDate = new Date(startDate);
    const months = parseInt(validityMonths);
    
    if (isNaN(months) || months <= 0) {
      console.error('❌ Invalid validityMonths:', validityMonths);
      return null;
    }
    
    expiryDate.setMonth(expiryDate.getMonth() + months);
    return expiryDate.toISOString();
  } catch (error) {
    console.error('❌ Error calculating expiry date:', error);
    return null;
  }
};

/**
 * ✅ Check if course is expired
 */
const checkIfExpired = (expiryDate) => {
  try {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) return false;
    return expiry < new Date();
  } catch (error) {
    return false;
  }
};

/**
 * ✅ Update enrollment status based on expiry
 */
const updateEnrollmentStatus = async (userId, courseId, currentStatus, expiryDate) => {
  try {
    const isExpired = checkIfExpired(expiryDate);
    
    if (isExpired && currentStatus === 'active') {
      console.log('⏰ Course expired, updating status:', courseId);
      
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();
      
      if (!userSnap.exists) return false;

      const userData = userSnap.data() || {};
      const enrolledCourses = userData.EnrolledCourses || [];
      
      const updatedEnrolledCourses = enrolledCourses.map(enrollment => {
        if (enrollment.courseId === courseId) {
          return { ...enrollment, enrolledStatus: 'expired' };
        }
        return enrollment;
      });

      await userRef.update({
        EnrolledCourses: updatedEnrolledCourses,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });

      console.log('✅ Status updated to expired');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error updating enrollment:', error);
    return false;
  }
};

/**
 * Fetch all courses
 */
export const getAllCourses = async () => {
  try {
    console.log('📚 Fetching all courses...');
    const coursesSnapshot = await db.collection('courses').get();
    
    const courses = [];
    coursesSnapshot.forEach((doc) => {
      const courseData = transformCourseData(doc.id, doc.data(), false);
      if (courseData) courses.push(courseData);
    });

    console.log(`✅ Fetched ${courses.length} courses`);
    return { success: true, courses };
  } catch (error) {
    console.error("❌ Error fetching courses:", error);
    return { success: false, error: "Failed to fetch courses", courses: [] };
  }
};

/**
 * Fetch course by ID
 */
export const getCourseById = async (courseId) => {
  try {
    console.log('🔍 Fetching course:', courseId);

    let courseDocRef = db.collection('courses').doc(courseId);
    let courseDocSnap = await courseDocRef.get();
    let isOverlay = false;

    if (!courseDocSnap.exists) {
      console.log('🔍 Checking overlayCourses...');
      courseDocRef = db.collection('overlayCourses').doc(courseId);
      courseDocSnap = await courseDocRef.get();
      isOverlay = true;
    }

    if (courseDocSnap.exists) {
      let finalData = courseDocSnap.data();
      let finalId = courseDocSnap.id;
      
      if (isOverlay && finalData.courseId) {
        console.log('🔄 Merging overlay with base course:', finalData.courseId);
        const baseDocSnap = await db.collection('courses').doc(finalData.courseId).get();
        if (baseDocSnap.exists) {
          const baseData = baseDocSnap.data();
          finalData = {
            ...baseData,
            ...finalData,
            courseContent: baseData.courseContent || [],
          };
        }
      }

      const courseData = transformCourseData(finalId, finalData, isOverlay);
      
      if (!courseData) {
        return { success: false, error: 'Course data is invalid or missing' };
      }

      return { success: true, course: courseData };
    } else {
      return { success: false, error: 'Course not found' };
    }
  } catch (error) {
    console.error("❌ Error fetching course:", error);
    return { success: false, error: "Failed to fetch course" };
  }
};

/**
 * ✅ Get course progress
 */
export const getCourseProgress = async (userId, courseId) => {
  try {
    const progressId = `${userId}_${courseId}`;
    const progressSnap = await db.collection('userCourseProgress').doc(progressId).get();

    if (progressSnap.exists) {
      const progressData = progressSnap.data();
      return { 
        success: true, 
        progress: {
          ...progressData,
          enrolledAt: convertTimestampToISO(progressData.enrolledAt),
          lastAccessedAt: convertTimestampToISO(progressData.lastAccessedAt),
          expiryDate: convertTimestampToISO(progressData.expiryDate),
        }
      };
    }
    return { success: false, progress: null };
  } catch (error) {
    console.error('❌ Error getting progress:', error);
    return { success: false, error: error.message, progress: null };
  }
};

/**
 * ✅ Mark lecture as completed
 */
export const markLectureAsCompleted = async (userId, courseId, sectionId, lectureId) => {
  try {
    const progressId = `${userId}_${courseId}`;
    const progressRef = db.collection('userCourseProgress').doc(progressId);
    const progressSnap = await progressRef.get();

    if (!progressSnap.exists) {
      const courseResult = await getCourseById(courseId);
      if (!courseResult.success) return { success: false, error: 'Course not found' };
      
      const totalLectures = courseResult.course.totalLectures || 0;
      if (totalLectures === 0) return { success: false, error: 'Course has no lectures' };
      
      const initialProgress = Math.round((1 / totalLectures) * 100);
      
      await progressRef.set({
        progressId,
        userId,
        courseId,
        progress: initialProgress,
        status: initialProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
        completedLectures: [`${sectionId}_${lectureId}`],
        totalLectures: totalLectures,
        enrolledAt: firestore.FieldValue.serverTimestamp(),
        lastAccessedAt: firestore.FieldValue.serverTimestamp(),
      });
      return { success: true };
    }

    const progressData = progressSnap.data();
    const completedLectures = progressData.completedLectures || [];
    const lectureKey = `${sectionId}_${lectureId}`;

    if (completedLectures.includes(lectureKey)) return { success: true, alreadyCompleted: true };

    const courseResult = await getCourseById(courseId);
    const totalLectures = courseResult.success ? courseResult.course.totalLectures : (progressData.totalLectures || 1);

    const updatedLectures = [...new Set([...completedLectures, lectureKey])];
    const progress = Math.min(100, Math.round((updatedLectures.length / totalLectures) * 100));
    
    await progressRef.update({
      completedLectures: updatedLectures,
      progress: progress,
      status: progress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
      totalLectures: totalLectures,
      lastAccessedAt: firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * ✅ Toggle lecture completion
 */
export const toggleLectureCompletion = async (userId, courseId, sectionId, lectureId) => {
  try {
    const progressId = `${userId}_${courseId}`;
    const progressRef = db.collection('userCourseProgress').doc(progressId);
    const progressSnap = await progressRef.get();

    if (!progressSnap.exists) {
      return markLectureAsCompleted(userId, courseId, sectionId, lectureId);
    }

    const progressData = progressSnap.data();
    const completedLectures = progressData.completedLectures || [];
    const lectureKey = `${sectionId}_${lectureId}`;

    const courseResult = await getCourseById(courseId);
    const totalLectures = courseResult.success ? courseResult.course.totalLectures : (progressData.totalLectures || 1);

    const updatedLectures = [...new Set(completedLectures.includes(lectureKey) 
      ? completedLectures.filter(l => l !== lectureKey)
      : [...completedLectures, lectureKey])];

    const progress = Math.min(100, Math.round((updatedLectures.length / totalLectures) * 100));
    
    let status = 'IN_PROGRESS';
    if (progress === 100) status = 'COMPLETED';
    else if (progress === 0) status = 'NOT_STARTED';

    await progressRef.update({
      completedLectures: updatedLectures,
      progress: progress,
      status: status,
      totalLectures: totalLectures,
      lastAccessedAt: firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * ✅ Enroll user
 */
export const enrollInCourse = async (userId, courseId, validityMonths = 1) => {
  try {
    const courseResult = await getCourseById(courseId);
    if (!courseResult.success) return { success: false, error: 'Course not found' };
    
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return { success: false, error: 'User not found' };
    
    const userData = userSnap.data() || {};
    const currentPurchasedCourses = userData.purchasedCourses || [];
    if (currentPurchasedCourses.includes(courseId)) return { success: true, alreadyPurchased: true };
    
    const now = new Date();
    const expiryISO = calculateExpiryDate(now, validityMonths);
    if (!expiryISO) return { success: false, error: 'Failed to calculate expiry' };
    
    const enrollmentData = {
      courseId: courseId,
      assignedAt: firestore.Timestamp.fromDate(now),
      expiryDate: firestore.Timestamp.fromDate(new Date(expiryISO)),
      validityMonths: parseInt(validityMonths),
      enrolledStatus: 'active',
    };
    
    await userRef.update({
      purchasedCourses: firestore.FieldValue.arrayUnion(courseId),
      EnrolledCourses: firestore.FieldValue.arrayUnion(enrollmentData),
      updatedAt: firestore.FieldValue.serverTimestamp()
    });
    
    const progressId = `${userId}_${courseId}`;
    await db.collection('userCourseProgress').doc(progressId).set({
      progressId,
      userId,
      courseId,
      progress: 0,
      status: 'IN_PROGRESS',
      completedLectures: [],
      totalLectures: courseResult.course.totalLectures,
      enrolledAt: firestore.FieldValue.serverTimestamp(),
      lastAccessedAt: firestore.FieldValue.serverTimestamp(),
      expiryDate: firestore.Timestamp.fromDate(new Date(expiryISO)),
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * ✅ Get user courses
 */
export const getUserCourses = async (userId) => {
  try {
    const userDocSnap = await db.collection('users').doc(userId).get();
    if (!userDocSnap.exists) {
      return { success: true, courses: [] };
    }

    const userData = userDocSnap.data() || {};
    const purchasedCourseIds = userData.purchasedCourses || [];
    const enrolledCourses = userData.EnrolledCourses || [];
    
    const allCourseIds = [...new Set([...purchasedCourseIds, ...enrolledCourses.map(ec => ec.courseId)].filter(Boolean))];

    const courses = [];
    for (const courseId of allCourseIds) {
      const result = await getCourseById(courseId);
      
      if (result.success && result.course) {
        const progressResult = await getCourseProgress(userId, courseId);
        const enrollmentData = enrolledCourses.find(ec => ec.courseId === courseId);
        
        let expiryDate = convertTimestampToISO(enrollmentData?.expiryDate);
        const assignedAt = convertTimestampToISO(enrollmentData?.assignedAt);

        const courseConfiguredValidity = parseInt(result.course.courseValidity || '1', 10);
        let validityMonths = parseInt(enrollmentData?.validityMonths || '1', 10);
        
        if (validityMonths === 1 && courseConfiguredValidity > 1) {
          validityMonths = courseConfiguredValidity;
          if (assignedAt) {
            const correctedExpiry = new Date(assignedAt);
            correctedExpiry.setMonth(correctedExpiry.getMonth() + validityMonths);
            expiryDate = correctedExpiry.toISOString();
          }
        }

        let enrolledStatus = enrollmentData?.enrolledStatus || 'active';
        if (expiryDate && checkIfExpired(expiryDate) && enrolledStatus === 'active') {
          await updateEnrollmentStatus(userId, courseId, enrolledStatus, expiryDate);
          enrolledStatus = 'expired';
        }
        
        const courseWithMetaData = {
          ...result.course,
          progress: progressResult.progress?.progress || 0,
          status: progressResult.progress?.status || 'NOT_STARTED',
          expiryDate: expiryDate,
          validityMonths: validityMonths,
          assignedAt: assignedAt,
          enrolledStatus: enrolledStatus,
          isPurchased: true,
          isExpired: enrolledStatus === 'expired',
        };
        courses.push(courseWithMetaData);
      }
    }
    return { success: true, courses };
  } catch (error) {
    return { success: false, error: error.message, courses: [] };
  }
};

/**
 * Search and category filtering
 */
export const getCoursesByCategory = async (category) => {
  const q = await db.collection('courses').where('membershipType', '==', category).get();
  const courses = [];
  q.forEach(doc => {
    const data = transformCourseData(doc.id, doc.data());
    if (data) courses.push(data);
  });
  return { success: true, courses };
};

export const searchCourses = async (searchTerm) => {
  const result = await getAllCourses();
  if (!result.success) return result;
  const lower = searchTerm.toLowerCase();
  const filtered = result.courses.filter(c => 
    c.title?.toLowerCase().includes(lower) || 
    c.description?.toLowerCase().includes(lower)
  );
  return { success: true, courses: filtered };
};