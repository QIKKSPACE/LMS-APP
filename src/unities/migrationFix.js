// src/unities/migrationFix.js - Fix broken progress documents

import { db } from "../firebase";

/**
 * ✅ FIX MIGRATION: Repair all progress documents with totalLectures = 0
 * Run this once to fix existing data
 */
export const fixBrokenProgressDocuments = async (userId) => {
  try {
    console.log('🔧 Starting migration: Fixing broken progress documents...');

    // Get all progress documents for this user
    const progressSnapshot = await db.collection('userCourseProgress').get();

    let fixedCount = 0;
    let errorCount = 0;

    // React Native Firebase uses .docs property to get the array of documents
    const progressDocs = progressSnapshot.docs || [];
    for (const progressDoc of progressDocs) {
      const progressData = progressDoc.data();
      
      // Only process this user's progress documents
      if (progressData.userId !== userId) {
        continue;
      }
      
      // Check if totalLectures is 0 or missing
      if (!progressData.totalLectures || progressData.totalLectures === 0) {
        console.log(`⚠️ Found broken progress for course: ${progressData.courseId}`);
        
        try {
          // Fetch the course to get correct totalLectures
          const courseSnap = await db.collection('courses').doc(progressData.courseId).get();

          if (!courseSnap.exists) {
            console.error(`❌ Course not found: ${progressData.courseId}`);
            errorCount++;
            continue;
          }
          
          const courseData = courseSnap.data();
          
          // Calculate totalLectures from courseContent
          let totalLectures = 0;
          if (courseData.courseContent && Array.isArray(courseData.courseContent)) {
            courseData.courseContent.forEach(chapter => {
              if (chapter.chapterContent && Array.isArray(chapter.chapterContent)) {
                totalLectures += chapter.chapterContent.length;
              }
            });
          }
          
          if (totalLectures === 0) {
            console.error(`❌ Course ${progressData.courseId} has no lectures!`);
            errorCount++;
            continue;
          }
          
          console.log(`✅ Course ${progressData.courseId} has ${totalLectures} lectures`);
          
          // Recalculate progress
          const completedLectures = progressData.completedLectures || [];
          const progress = Math.round((completedLectures.length / totalLectures) * 100);
          
          let status = 'IN_PROGRESS';
          if (progress === 100) {
            status = 'COMPLETED';
          } else if (progress === 0) {
            status = 'NOT_STARTED';
          }
          
          console.log(`📊 Recalculated progress: ${progress}% (${completedLectures.length}/${totalLectures})`);
          
          // Update the progress document
          const progressRef = db.collection('userCourseProgress').doc(progressDoc.id);
          await progressRef.update({
            totalLectures: totalLectures,
            progress: progress,
            status: status
          });
          
          console.log(`✅ Fixed progress for course: ${progressData.courseId}`);
          fixedCount++;
          
        } catch (error) {
          console.error(`❌ Error fixing progress for ${progressData.courseId}:`, error);
          errorCount++;
        }
      } else {
        console.log(`✅ Course ${progressData.courseId} progress is OK (${progressData.totalLectures} lectures)`);
      }
    }
    
    console.log('🎉 Migration complete!');
    console.log(`✅ Fixed: ${fixedCount} documents`);
    console.log(`❌ Errors: ${errorCount} documents`);
    
    return { 
      success: true, 
      fixed: fixedCount, 
      errors: errorCount 
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Check if user needs migration
 */
export const checkIfMigrationNeeded = async (userId) => {
  try {
    const progressSnapshot = await db.collection('userCourseProgress').get();

    let needsMigration = false;

    // React Native Firebase uses .docs property to get the array of documents
    const progressDocs = progressSnapshot.docs || [];
    for (const progressDoc of progressDocs) {
      const progressData = progressDoc.data();
      
      if (progressData.userId === userId) {
        if (!progressData.totalLectures || progressData.totalLectures === 0) {
          needsMigration = true;
          console.log(`⚠️ Migration needed for course: ${progressData.courseId}`);
        }
      }
    }
    
    if (!needsMigration) {
      console.log('✅ No migration needed - all progress documents are valid');
    }
    
    return needsMigration;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
};