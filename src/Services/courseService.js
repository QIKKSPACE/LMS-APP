// src/services/courseService.js - FIXED PROGRESS TRACKING
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Use firestore() directly to avoid any import issues
const db = firestore();

/**
 * Check if there are Firebase Security Rules issues
 */
const checkFirestoreAccess = async (userId) => {
  try {
    console.log('🔍 Checking Firestore access patterns...');

    // Test 1: Try to read the user document with different methods
    const userDocRef = db.collection('users').doc(userId);

    // Method 1: Direct get
    const directGet = await userDocRef.get();
    console.log('📄 Direct get result:', {
      exists: directGet.exists,
      hasData: !!directGet.data(),
      metadata: directGet.metadata
    });

    // Method 2: Collection query
    const queryResult = await db.collection('users').where('uid', '==', userId).get();
    console.log('📄 Query result:', {
      size: queryResult.size,
      empty: queryResult.empty,
      docs: queryResult.docs.map(doc => ({ id: doc.id, hasData: !!doc.data() }))
    });

    return {
      directAccess: directGet.exists && !!directGet.data(),
      queryAccess: !queryResult.empty && queryResult.docs.every(doc => doc.data())
    };

  } catch (accessError) {
    console.error('❌ Firestore access check failed:', accessError);
    return {
      directAccess: false,
      queryAccess: false,
      error: accessError.message
    };
  }
};

/**
 * Repair corrupted user document using Firebase Auth data
 */
const repairUserDocument = async (userId) => {
  try {
    console.log('🔧 Attempting to repair corrupted user document:', userId);

    // Get current authenticated user
    const currentUser = auth().currentUser;
    if (!currentUser || currentUser.uid !== userId) {
      console.error('❌ Cannot repair user document - user not authenticated or UID mismatch');
      return null;
    }

    // Create new user document from auth data
    const repairedUserData = {
      uid: currentUser.uid,
      email: currentUser.email || '',
      name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
      mobileNumber: currentUser.phoneNumber || '',
      address: '',
      purchasedCourses: [],
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp()
    };

    console.log('🔧 Creating new user document with data:', {
      uid: repairedUserData.uid,
      email: repairedUserData.email,
      name: repairedUserData.name
    });

    // Overwrite the corrupted document
    await db.collection('users').doc(userId).set(repairedUserData);

    console.log('✅ User document repaired successfully');
    return repairedUserData;

  } catch (repairError) {
    console.error('❌ Failed to repair user document:', repairError);
    return null;
  }
};

// Test Firestore connection (only log once)
if (!global.firestoreLogged) {
  console.log('🔥 Firestore instance type:', typeof db);
  console.log('🔥 Firestore initialized successfully');
  global.firestoreLogged = true;
}

/**
 * ✅ FIXED: Transform Firestore course data with correct lecture counting
 */
const transformCourseData = (courseId, firestoreData) => {
  console.log('📄 Transforming course data for:', courseId);
  console.log('📦 Raw Firestore data:', firestoreData);
  
  // ✅ Extract sections from courseContent array
  let sections = [];
  let totalLecturesCount = 0; // Track total lectures correctly
  
  if (firestoreData.courseContent && Array.isArray(firestoreData.courseContent)) {
    console.log('✅ Found courseContent with', firestoreData.courseContent.length, 'chapters');
    
    sections = firestoreData.courseContent.map((chapter, index) => {
      // Extract lectures from chapterContent
      const lecturesList = chapter.chapterContent && Array.isArray(chapter.chapterContent)
        ? chapter.chapterContent.map((lecture, lectureIndex) => ({
            id: lecture.lectureId || `lect_${Date.now()}_${lectureIndex}`,
            title: lecture.lectureTitle || `Lecture ${lectureIndex + 1}`,
            duration: lecture.lectureDuration || '30',
            url: lecture.lectureUrl || '',
            order: lecture.lectureOrder || lectureIndex + 1,
            isPreviewFree: lecture.isPreviewFree || false,
            isCompleted: false,
          }))
        : [];
      
      // ✅ CRITICAL: Add to total lecture count
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
  
  console.log('✅ Transformed sections:', sections.length, 'sections');
  console.log('📊 Total lectures across all sections:', totalLecturesCount);
  
  // ✅ Return transformed course with correct totalLectures
  return {
    id: courseId,
    
    // Basic Info
    title: firestoreData.courseTitle || 'Untitled Course',
    courseTitle: firestoreData.courseTitle,
    courseName: firestoreData.courseTitle,
    
    // Thumbnail
    thumbnail: firestoreData.courseThumbnail || 'https://via.placeholder.com/800x400?text=Course',
    courseThumbnail: firestoreData.courseThumbnail,
    thumbnailUrl: firestoreData.courseThumbnail,
    imageUrl: firestoreData.courseThumbnail,
    
    // Description
    description: firestoreData.courseDescription || '',
    courseDescription: firestoreData.courseDescription,
    
    // Pricing
    price: firestoreData.price || 0,
    discount: firestoreData.discount || 0,
    
    // Category/Type
    membershipType: firestoreData.membershipType || 'Standard',
    
    // Educator
    educatorId: firestoreData.educatorId || '',
    
    // Content Structure
    sections: sections,
    chapters: sections.length,
    totalLectures: totalLecturesCount, // ✅ FIXED: Use correct count
    
    // Live Lectures
    liveLectures: firestoreData.liveLectures || [],
    
    // Timestamps
    createdAt: firestoreData.createdAt?.toDate?.()?.toISOString() || firestoreData.createdAt || null,
    updatedAt: firestoreData.updatedAt?.toDate?.()?.toISOString() || firestoreData.updatedAt || null,
    
    // Purchase/Progress (will be set based on user data)
    status: 'NOT_STARTED',
    progress: 0,
    isPurchased: false,
  };
};

/**
 * Fetch all courses from Firestore
 */
export const getAllCourses = async () => {
  try {
    console.log('📚 Fetching all courses from Firestore...');
    console.log('🔥 Testing db.collection method exists:', typeof db.collection);

    // Test basic Firestore connection
    if (!db.collection || typeof db.collection !== 'function') {
      throw new Error('db.collection is not a function - Firestore initialization issue');
    }

    const coursesCollection = db.collection('courses');
    console.log('🔗 Collection reference created:', typeof coursesCollection);

    const coursesSnapshot = await coursesCollection.get();
    console.log('📄 Snapshot received:', {
      exists: coursesSnapshot.exists,
      size: coursesSnapshot.size,
      empty: coursesSnapshot.empty
    });

    const courses = [];
    coursesSnapshot.forEach((doc) => {
      const courseData = transformCourseData(doc.id, doc.data());
      courses.push(courseData);
    });

    console.log(`✅ Fetched ${courses.length} courses from Firestore`);
    if (courses.length > 0) {
      console.log('📦 Sample course:', {
        id: courses[0].id,
        title: courses[0].courseTitle,
        totalLectures: courses[0].totalLectures,
        chapters: courses[0].chapters
      });
    }

    return { success: true, courses };
  } catch (error) {
    console.error("❌ Error fetching courses:", error);
    console.error("❌ Error type:", error.constructor.name);
    console.error("❌ Error message:", error.message);
    return {
      success: false,
      error: `Failed to fetch courses: ${error.message}`,
      courses: []
    };
  }
};

/**
 * Fetch a single course by ID
 */
export const getCourseById = async (courseId) => {
  try {
    console.log('🔍 Fetching course:', courseId);

    const courseDocSnap = await db.collection('courses').doc(courseId).get();

    if (courseDocSnap.exists) {
      const courseData = transformCourseData(courseDocSnap.id, courseDocSnap.data());

      console.log('✅ Course found:', courseId);
      console.log('📸 Thumbnail URL:', courseData.courseThumbnail);
      console.log('💰 Price:', courseData.price);
      console.log('📚 Sections:', courseData.sections?.length || 0);
      console.log('🎓 Total Lectures:', courseData.totalLectures);

      return {
        success: true,
        course: courseData
      };
    } else {
      console.log('❌ Course not found:', courseId);
      return {
        success: false,
        error: 'Course not found'
      };
    }
  } catch (error) {
    console.error("❌ Error fetching course:", error);
    return {
      success: false,
      error: "Failed to fetch course"
    };
  }
};

/**
 * ✅ FIXED: Get course progress with correct calculation
 */
export const getCourseProgress = async (userId, courseId) => {
  try {
    // Add validation for required parameters
    if (!userId) {
      console.error('❌ getCourseProgress: userId is required');
      return { success: false, error: 'User ID is required', progress: null };
    }

    if (!courseId) {
      console.error('❌ getCourseProgress: courseId is required');
      return { success: false, error: 'Course ID is required', progress: null };
    }

    console.log('📊 Getting progress for userId:', userId, 'courseId:', courseId);

    const progressId = `${userId}_${courseId}`;
    const progressSnap = await db.collection('userCourseProgress').doc(progressId).get();

    if (progressSnap.exists) {
      const progressData = progressSnap.data();

      console.log('📊 Found saved progress:', {
        progress: progressData.progress,
        completedLectures: progressData.completedLectures?.length || 0,
        totalLectures: progressData.totalLectures,
        status: progressData.status
      });

      return {
        success: true,
        progress: {
          ...progressData,
          enrolledAt: progressData.enrolledAt || null,
          lastAccessedAt: progressData.lastAccessedAt || null,
          expiryDate: progressData.expiryDate || null,
        }
      };
    }

    console.log('⚠️ No progress found for:', progressId);
    return { success: false, progress: null };
  } catch (error) {
    console.error('❌ Error getting course progress:', error);
    console.error('❌ Progress parameters - userId:', userId, 'courseId:', courseId);
    return { success: false, error: error.message, progress: null };
  }
};

/**
 * ✅ FIXED: Toggle lecture completion with correct progress calculation
 */
export const toggleLectureCompletion = async (userId, courseId, sectionId, lectureId) => {
  try {
    // Add validation for required parameters
    if (!userId || !courseId || !sectionId || !lectureId) {
      console.error('❌ toggleLectureCompletion: Missing required parameters', {
        hasUserId: !!userId,
        hasCourseId: !!courseId,
        hasSectionId: !!sectionId,
        hasLectureId: !!lectureId
      });
      return { success: false, error: 'Missing required parameters' };
    }

    console.log('🔄 Toggling lecture completion:', { userId, courseId, sectionId, lectureId });

    const progressId = `${userId}_${courseId}`;
    const progressRef = db.collection('userCourseProgress').doc(progressId);
    const progressSnap = await progressRef.get();

    if (!progressSnap.exists) {
      console.log('⚠️ Progress document not found, creating new one');

      // Get course to calculate total lectures
      const courseResult = await getCourseById(courseId);

      if (!courseResult.success) {
        return { success: false, error: 'Course not found' };
      }

      // ✅ CRITICAL: Use the correct totalLectures from transformed course
      const totalLectures = courseResult.course.totalLectures || 0;

      if (totalLectures === 0) {
        console.error('❌ Course has 0 total lectures! Cannot create progress.');
        return { success: false, error: 'Course has no lectures' };
      }

      console.log('📊 Creating progress with totalLectures:', totalLectures);

      const initialProgress = totalLectures > 0 ? Math.round((1 / totalLectures) * 100) : 0;

      await progressRef.set({
        progressId,
        userId,
        courseId,
        progress: initialProgress,
        status: 'IN_PROGRESS',
        completedLectures: [`${sectionId}_${lectureId}`],
        totalLectures: totalLectures,
        enrolledAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
      });

      console.log('✅ Progress document created with progress:', initialProgress + '%');
      return { success: true };
    }

    const progressData = progressSnap.data();
    const completedLectures = progressData.completedLectures || [];
    const lectureKey = `${sectionId}_${lectureId}`;

    console.log('📋 Current completed lectures:', completedLectures);
    console.log('🎯 Total lectures in course:', progressData.totalLectures);

    // ✅ CRITICAL FIX: If totalLectures is 0 or invalid, recalculate from course
    let totalLectures = progressData.totalLectures || 0;

    if (totalLectures === 0) {
      console.warn('⚠️ totalLectures is 0! Recalculating from course...');

      const courseResult = await getCourseById(courseId);
      if (courseResult.success && courseResult.course.totalLectures > 0) {
        totalLectures = courseResult.course.totalLectures;
        console.log('✅ Recalculated totalLectures:', totalLectures);

        // Update the progress document with correct totalLectures
        await progressRef.update({
          totalLectures: totalLectures
        });
      } else {
        console.error('❌ Cannot recalculate totalLectures! Course may be invalid.');
        return { success: false, error: 'Invalid course structure' };
      }
    }

    // Toggle completion
    let updatedLectures;
    if (completedLectures.includes(lectureKey)) {
      // Remove from completed
      updatedLectures = completedLectures.filter(l => l !== lectureKey);
      console.log('➖ Unmarking lecture as complete');
    } else {
      // Add to completed
      updatedLectures = [...completedLectures, lectureKey];
      console.log('✅ Marking lecture as complete');
    }

    // ✅ Calculate progress percentage
    const progress = Math.round((updatedLectures.length / totalLectures) * 100);

    // Determine status
    let status = 'IN_PROGRESS';
    if (progress === 100) {
      status = 'COMPLETED';
      console.log('🎉 COURSE COMPLETED!');
    } else if (progress === 0) {
      status = 'NOT_STARTED';
    }

    console.log('📊 New progress calculation:', {
      completedLectures: updatedLectures.length,
      totalLectures: totalLectures,
      progress: progress + '%',
      status: status
    });

    // Update Firestore
    await progressRef.update({
      completedLectures: updatedLectures,
      progress: progress,
      status: status,
      totalLectures: totalLectures, // ✅ Also update totalLectures in case it was recalculated
      lastAccessedAt: new Date().toISOString(),
    });

    console.log('✅ Lecture completion toggled successfully');
    console.log('📈 Course progress is now:', progress + '%');

    return { success: true };
  } catch (error) {
    console.error('❌ Error toggling lecture completion:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ✅ FIXED: Enroll user with correct totalLectures count
 */
export const enrollInCourse = async (userId, courseId, expiryDate = null) => {
  try {
    // Add validation for required parameters
    if (!userId || !courseId) {
      console.error('❌ enrollInCourse: Missing required parameters', {
        hasUserId: !!userId,
        hasCourseId: !!courseId
      });
      return { success: false, error: 'User ID and Course ID are required' };
    }

    console.log('📝 Enrolling user in course:', { userId, courseId, expiryDate });

    // Get course to calculate total lectures
    const courseResult = await getCourseById(courseId);
    if (!courseResult.success) {
      return { success: false, error: 'Course not found' };
    }

    // ✅ CRITICAL: Use correct totalLectures from transformed course
    const totalLectures = courseResult.course.totalLectures || 0;

    console.log('📊 Course has', totalLectures, 'total lectures');

    // Get current user data
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userSnap.data();
    console.log('📊 User data in enrollInCourse:', userData);
    console.log('📊 User data type in enrollInCourse:', typeof userData);

    if (!userData) {
      console.error('❌ User data is null or undefined in enrollInCourse - Firestore document corruption detected');
      console.error('🔍 Attempting to repair the corrupted user document for enrollment...');

      // Try to repair the user document first
      try {
        const repairedUserData = await repairUserDocument(userId);

        if (repairedUserData) {
          console.log('✅ User document repaired, proceeding with enrollment');

          // Now proceed with enrollment using the repaired data
          const updatedPurchasedCourses = [...repairedUserData.purchasedCourses, courseId];

          await userRef.update({
            purchasedCourses: updatedPurchasedCourses,
            updatedAt: new Date().toISOString()
          });

          console.log('✅ Course added to user purchases after repair:', updatedPurchasedCourses);

          // Create progress document with CORRECT totalLectures
          const progressId = `${userId}_${courseId}`;
          const progressRef = db.collection('userCourseProgress').doc(progressId);

          await progressRef.set({
            progressId,
            userId,
            courseId,
            progress: 0,
            status: 'IN_PROGRESS',
            completedLectures: [],
            totalLectures: totalLectures,
            enrolledAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString(),
            expiryDate: expiryDate,
          });

          console.log('✅ Course progress initialized with totalLectures:', totalLectures);

          return {
            success: true,
            updatedUser: {
              ...repairedUserData,
              purchasedCourses: updatedPurchasedCourses,
              updatedAt: new Date().toISOString()
            }
          };

        } else {
          console.error('❌ Failed to repair user document for enrollment');
          return { success: false, error: 'User data corrupted and repair failed during enrollment' };
        }
      } catch (repairError) {
        console.error('❌ User document repair failed during enrollment:', repairError);
        return { success: false, error: 'User data corruption could not be fixed during enrollment' };
      }
    }

    const currentPurchasedCourses = userData.purchasedCourses || [];

    // Check if already purchased
    if (currentPurchasedCourses.includes(courseId)) {
      console.log('⚠️ User already owns this course');
      return { success: true, alreadyPurchased: true };
    }

    // Add course to user's purchased courses
    const updatedPurchasedCourses = [...currentPurchasedCourses, courseId];

    await userRef.update({
      purchasedCourses: updatedPurchasedCourses,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Course added to user purchases:', updatedPurchasedCourses);

    // Create progress document with CORRECT totalLectures
    const progressId = `${userId}_${courseId}`;
    const progressRef = db.collection('userCourseProgress').doc(progressId);

    await progressRef.set({
      progressId,
      userId,
      courseId,
      progress: 0,
      status: 'IN_PROGRESS',
      completedLectures: [],
      totalLectures: totalLectures, // ✅ FIXED: Use correct count
      enrolledAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      expiryDate: expiryDate,
    });

    console.log('✅ Course progress initialized with totalLectures:', totalLectures);

    // Return updated user data
    return {
      success: true,
      updatedUser: {
        ...userData,
        purchasedCourses: updatedPurchasedCourses,
        updatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('❌ Error enrolling user:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch courses purchased by a specific user
 */
export const getUserCourses = async (userId) => {
  try {
    console.log('👤 getUserCourses called with userId:', userId);

    if (!userId) {
      console.error('❌ userId is null or undefined');
      return { success: false, error: 'User ID is required', courses: [] };
    }

    console.log('📖 Fetching user document from Firestore...');

    // First, get user's purchased courses from their profile
    const userDocRef = db.collection('users').doc(userId);
    console.log('🔗 User document reference:', userDocRef.path);

    const userDocSnap = await userDocRef.get();
    console.log('📄 User document exists:', userDocSnap.exists);
    console.log('📄 User document metadata:', {
      id: userDocSnap.id,
      metadata: userDocSnap.metadata,
      ref: userDocSnap.ref.path
    });

    if (!userDocSnap.exists) {
      console.log('❌ User document not found in Firestore');
      return { success: false, error: 'User not found in database', courses: [] };
    }

    const userData = userDocSnap.data();
    console.log('📊 IMMEDIATE DEBUG - Raw user data from Firestore:', userData);
    console.log('📊 IMMEDIATE DEBUG - User data type:', typeof userData);
    console.log('📊 IMMEDIATE DEBUG - User data is null:', userData === null);
    console.log('📊 IMMEDIATE DEBUG - User data is undefined:', userData === undefined);
    console.log('📊 IMMEDIATE DEBUG - User data keys:', userData ? Object.keys(userData) : 'N/A');
    console.log('📊 IMMEDIATE DEBUG - Document snapshot object:', {
      exists: userDocSnap.exists,
      id: userDocSnap.id,
      metadata: userDocSnap.metadata,
      ref: userDocSnap.ref.path
    });

    // Test if we can read data differently
    console.log('📊 ALTERNATIVE ACCESS TEST - Trying alternative data access...');
    try {
      const alternativeData = userDocSnap.get('uid');
      console.log('📊 Alternative access (uid):', alternativeData);
      const alternativeData2 = userDocSnap.get('email');
      console.log('📊 Alternative access (email):', alternativeData2);
    } catch (altError) {
      console.error('❌ Alternative access failed:', altError);
    }

    if (!userData) {
      console.error('🚨 CRITICAL DEBUG - User data is null or undefined - this indicates a Firestore document corruption or sync issue');
      console.error('🚨 AUTO-FIX - Attempting automatic user document repair...');

      try {
        // Automatic quick fix attempt
        console.log('🚀 AUTO-FIX - Running quick fix...');
        const quickFixResult = await quickFixUserDocument(userId);

        if (quickFixResult.success) {
          console.log('🚀 AUTO-FIX SUCCESS - User document fixed! Returning empty courses for now.');
          return { success: true, courses: [] };
        }

        console.error('🚀 AUTO-FIX FAILED - Quick fix did not work, running comprehensive diagnostics...');

        // First, check if this is a security rules issue
        console.error('🔍 Running Firestore access diagnostics...');
        const accessCheck = await checkFirestoreAccess(userId);
        console.log('📊 Access check results:', accessCheck);

        if (!accessCheck.directAccess && !accessCheck.queryAccess) {
          console.error('❌ This appears to be a Firebase Security Rules issue - no access to user documents');
          return { success: false, error: 'Firebase Security Rules blocking access to user data. Please check your Firestore security rules.', courses: [] };
        }

        console.error('🔍 Access check passed, attempting the manual repair process...');

        // Try to repair the user document
        const repairedUserData = await repairUserDocument(userId);
        console.log('🔧 Manual repair function returned:', repairedUserData);

        if (repairedUserData) {
          console.log('✅ Manual repair successful, proceeding with empty courses');
          // Return empty courses since the user has no purchased courses after repair
          return { success: true, courses: [] };
        } else {
          console.error('❌ All repair attempts failed - this is a critical Firestore issue');
          console.error('❌ POSSIBLE CAUSES:');
          console.error('   1. Firebase Security Rules are blocking write access');
          console.error('   2. Firebase project configuration issues');
          console.error('   3. Network connectivity problems');
          console.error('   4. Firebase account/permission issues');
          return { success: false, error: 'User data corruption could not be repaired. Please check Firebase console for security rules and project configuration.', courses: [] };
        }
      } catch (repairError) {
        console.error('❌ Exception during auto-repair process:', repairError);
        console.error('❌ Auto-repair error stack:', repairError.stack);
        return { success: false, error: 'Critical user data corruption error: ' + repairError.message, courses: [] };
      }
    }

    console.log('📊 User data retrieved:', {
      uid: userData.uid,
      email: userData.email,
      name: userData.name,
      purchasedCourses: userData.purchasedCourses
    });

    const purchasedCourseIds = userData.purchasedCourses || [];
    console.log('🛒 Purchased course IDs found:', purchasedCourseIds);

    if (purchasedCourseIds.length === 0) {
      console.log('ℹ️ User has no purchased courses');
      return { success: true, courses: [] };
    }

    console.log('🔄 Starting to fetch course details for', purchasedCourseIds.length, 'courses...');

    // Fetch all purchased courses with their progress
    const courses = [];
    for (const courseId of purchasedCourseIds) {
      console.log(`📚 Fetching course ${courseId}...`);
      try {
        // Double check that userId is still available
        if (!userId) {
          console.error('❌ userId became undefined during iteration');
          break;
        }

        const result = await getCourseById(courseId);
        if (result.success) {
          // Get progress for this course - but only if userId is still valid
          let progressResult;
          if (userId) {
            progressResult = await getCourseProgress(userId, courseId);
          } else {
            console.error('❌ Cannot get progress - userId is undefined');
            progressResult = { success: false, progress: null };
          }

          if (progressResult.success && progressResult.progress) {
            // Merge progress with course data
            const courseWithProgress = {
              ...result.course,
              progress: progressResult.progress.progress || 0,
              status: progressResult.progress.status || 'IN_PROGRESS',
              expiryDate: progressResult.progress.expiryDate || null,
              isPurchased: true,
            };

            console.log(`✅ Course ${courseId}: ${courseWithProgress.progress}% (${courseWithProgress.status})`);
            courses.push(courseWithProgress);
          } else {
            // No progress yet, add with defaults
            console.log(`⚠️ No progress for course ${courseId}, using defaults`);
            courses.push({
              ...result.course,
              progress: 0,
              status: 'NOT_STARTED',
              isPurchased: true,
            });
          }
        } else {
          console.error(`❌ Failed to fetch course ${courseId}:`, result.error);
        }
      } catch (courseError) {
        console.error(`❌ Exception fetching course ${courseId}:`, courseError);
      }
    }

    console.log(`✅ Successfully fetched ${courses.length} purchased courses for user`);
    return { success: true, courses };
  } catch (error) {
    console.error("❌ Top-level error in getUserCourses:", error);
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);

    return {
      success: false,
      error: `Failed to fetch user courses: ${error.message}`,
      courses: []
    };
  }
};

// Export other helper functions
export const subscribeToCoursesUpdates = (callback) => {
  try {
    console.log('👂 Setting up real-time course listener...');

    const unsubscribe = db.collection('courses').onSnapshot((snapshot) => {
      const courses = [];
      snapshot.forEach((doc) => {
        const courseData = transformCourseData(doc.id, doc.data());
        courses.push(courseData);
      });

      console.log(`🔄 Real-time update: ${courses.length} courses`);
      callback({ success: true, courses });
    }, (error) => {
      console.error("❌ Error in course listener:", error);
      callback({ success: false, error: "Failed to listen to courses", courses: [] });
    });

    return unsubscribe;
  } catch (error) {
    console.error("❌ Error setting up course listener:", error);
    return () => {}; // Return empty function
  }
};

export const getCoursesByCategory = async (category) => {
  try {
    console.log('🔍 Fetching courses by category:', category);

    const coursesSnapshot = await db.collection('courses').where('membershipType', '==', category).get();

    const courses = [];
    coursesSnapshot.forEach((doc) => {
      const courseData = transformCourseData(doc.id, doc.data());
      courses.push(courseData);
    });

    console.log(`✅ Fetched ${courses.length} courses in category: ${category}`);
    return { success: true, courses };
  } catch (error) {
    console.error("❌ Error fetching courses by category:", error);
    return {
      success: false,
      error: "Failed to fetch courses by category",
      courses: []
    };
  }
};

export const searchCourses = async (searchTerm) => {
  try {
    console.log('🔍 Searching courses:', searchTerm);

    // Firestore doesn't support full-text search, so we fetch all and filter
    const result = await getAllCourses();

    if (!result.success) {
      return result;
    }

    const searchLower = searchTerm.toLowerCase();
    const filteredCourses = result.courses.filter(course =>
      course.title?.toLowerCase().includes(searchLower) ||
      course.description?.toLowerCase().includes(searchLower) ||
      course.membershipType?.toLowerCase().includes(searchLower)
    );

    console.log(`✅ Found ${filteredCourses.length} courses matching: ${searchTerm}`);
    return { success: true, courses: filteredCourses };
  } catch (error) {
    console.error("❌ Error searching courses:", error);
    return {
      success: false,
      error: "Failed to search courses",
      courses: []
    };
  }
};

/**
 * Test function to manually check and fix user document issues
 */
export const testUserDocument = async (userId) => {
  try {
    console.log('🧪 TESTING USER DOCUMENT - Manual check for userId:', userId);

    // Step 1: Check if user is authenticated
    const currentUser = auth().currentUser;
    console.log('🧪 Current authenticated user:', currentUser ? currentUser.uid : 'None');

    if (!currentUser) {
      return { success: false, error: 'No authenticated user' };
    }

    // Step 2: Try direct document access
    const userDocRef = db.collection('users').doc(userId);
    console.log('🧪 Document reference:', userDocRef.path);

    const docSnap = await userDocRef.get();
    console.log('🧪 Document exists:', docSnap.exists);
    console.log('🧪 Document data:', docSnap.data());

    // Step 3: If no data, try to create it
    if (!docSnap.exists || !docSnap.data()) {
      console.log('🧪 Creating user document manually...');

      const newUserData = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        mobileNumber: currentUser.phoneNumber || '',
        address: '',
        purchasedCourses: [],
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      };

      await userDocRef.set(newUserData);
      console.log('🧪 User document created successfully');

      // Verify the creation
      const verifySnap = await userDocRef.get();
      const verifyData = verifySnap.data();
      console.log('🧪 Verification - Document data after creation:', verifyData);

      return { success: true, userData: verifyData };
    }

    return { success: true, userData: docSnap.data() };

  } catch (testError) {
    console.error('🧪 Test function error:', testError);
    return { success: false, error: testError.message };
  }
};

/**
 * Quick fix function - call this to immediately resolve user document issues
 */
export const quickFixUserDocument = async (userId) => {
  console.log('🚀 QUICK FIX - Attempting to fix user document for:', userId);

  try {
    const testResult = await testUserDocument(userId);
    if (testResult.success) {
      console.log('🚀 QUICK FIX - User document is now working!');
      return testResult;
    } else {
      console.error('🚀 QUICK FIX - Failed:', testResult.error);
      return testResult;
    }
  } catch (quickFixError) {
    console.error('🚀 QUICK FIX - Exception:', quickFixError);
    return { success: false, error: quickFixError.message };
  }
};