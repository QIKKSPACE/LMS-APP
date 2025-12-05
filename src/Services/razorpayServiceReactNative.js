// src/services/razorpayServiceReactNative.js
import RazorpayCheckout from 'react-native-razorpay';
import { getRazorpayKeyId, COMPANY_INFO, PAYMENT_CONFIG } from '../Config/razorpayConfig';
import { enrollInCourse } from './courseService';
import { db } from '../firebase';

/**
 * Initiate Razorpay payment in React Native
 * @param {Object} courseData - Course information
 * @param {Object} userInfo - User information
 * @param {Function} onPaymentSuccess - Callback after successful payment
 * @returns {Promise<Object>} Payment result
 */
export const initiateRazorpayPayment = async (courseData, userInfo, onPaymentSuccess = null) => {
  try {
    console.log('=== REACT NATIVE PAYMENT INITIATION ===');
    console.log('Course Data:', courseData);
    console.log('Course ID:', courseData.id || courseData.courseId);
    console.log('Course Title:', courseData.title || courseData.courseName || courseData.name);
    console.log('Course Price:', courseData.price);
    console.log('User Info:', userInfo);
    console.log('========================================');

    // Validate course data
    if (!courseData || !courseData.price) {
      throw new Error('Invalid course data');
    }

    // Validate user info
    if (!userInfo || !userInfo.uid) {
      throw new Error('User not logged in');
    }

    // Get Razorpay Key
    const razorpayKey = getRazorpayKeyId();

    if (!razorpayKey) {
      throw new Error('Payment gateway not configured. Please contact support.');
    }

    // Prepare payment details
    const amount = Math.round(courseData.price * 100); // Convert to paise
    const currency = PAYMENT_CONFIG.currency;

    // Generate unique receipt ID
    const receiptId = `rcpt_${Date.now()}_${(courseData.id || '').substring(0, 8)}`;

    console.log('Payment details:', {
      amount,
      currency,
      receiptId,
      courseId: courseData.id,
      userId: userInfo.uid
    });

    // Create Razorpay options for React Native
    const options = {
      description: `${courseData.title || 'Course Purchase'}`,
      image: COMPANY_INFO.logo,
      currency: currency,
      key: razorpayKey,
      amount: amount,
      name: COMPANY_INFO.name,
      order_id: '', // Optional order ID if you have one
      prefill: {
        email: userInfo.email || '',
        contact: userInfo.phoneNumber || '',
        name: userInfo.displayName || userInfo.name || 'Student',
      },
      theme: { color: PAYMENT_CONFIG.theme.color }
    };

    console.log('Opening Razorpay checkout with options:', options);

    // Open Razorpay checkout
    const paymentData = await RazorpayCheckout.open(options);

    console.log('Payment successful:', paymentData);

    // Handle successful payment
    const result = await handlePaymentSuccess({
      razorpayPaymentId: paymentData.razorpay_payment_id,
      razorpayOrderId: paymentData.razorpay_order_id,
      razorpaySignature: paymentData.razorpay_signature,
      courseId: courseData.id,
      courseTitle: courseData.title,
      amount: courseData.price,
      currency: currency,
      userId: userInfo.uid,
      userEmail: userInfo.email,
      userName: userInfo.displayName || userInfo.name,
      receiptId: receiptId,
    });

    // Call callback if provided
    if (onPaymentSuccess && result.success) {
      onPaymentSuccess(result);
    }

    return { success: true, paymentData, result };

  } catch (error) {
    console.error('Payment failed or cancelled:', error);

    if (error.code === 0) {
      // Payment was cancelled by user
      throw new Error('Payment cancelled by user');
    } else {
      // Payment failed
      throw new Error(`Payment failed: ${error.description || error.message || 'Unknown error'}`);
    }
  }
};

/**
 * Handle successful payment - Save to Firestore
 */
const handlePaymentSuccess = async (paymentData) => {
  try {
    console.log('Saving payment data to Firestore...');
    console.log('Payment data received:', paymentData);

    const timestamp = new Date().toISOString();

    // Validate required fields
    if (!paymentData.userId || !paymentData.courseId) {
      throw new Error('Missing required payment data');
    }

    // 1. Enroll user in course
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year access
    const expiryDateStr = expiryDate.toISOString().split('T')[0];

    const enrollmentResult = await enrollInCourse(
      paymentData.userId,
      paymentData.courseId,
      expiryDateStr
    );

    if (!enrollmentResult.success) {
      throw new Error('Failed to enroll user in course: ' + enrollmentResult.error);
    }

    console.log('✅ User enrolled in course successfully');

    // 2. Save payment transaction record
    const transactionData = {
      razorpayPaymentId: paymentData.razorpayPaymentId || '',
      razorpayOrderId: paymentData.razorpayOrderId || '',
      razorpaySignature: paymentData.razorpaySignature || '',
      receiptId: paymentData.receiptId || '',
      courseId: paymentData.courseId || '',
      courseTitle: paymentData.courseTitle || 'Course',
      amount: paymentData.amount || 0,
      currency: paymentData.currency || 'INR',
      userId: paymentData.userId || '',
      userEmail: paymentData.userEmail || '',
      userName: paymentData.userName || '',
      status: 'SUCCESS',
      paymentMethod: 'razorpay',
      paymentDate: timestamp,
      createdAt: timestamp,
    };

    // Remove any undefined values
    Object.keys(transactionData).forEach(key => {
      if (transactionData[key] === undefined) {
        delete transactionData[key];
      }
    });

    console.log('Saving transaction with data:', transactionData);

    // Use React Native Firebase Firestore API
    const transactionRef = db.collection('transactions').doc();
    await transactionRef.set(transactionData);

    console.log('✅ Transaction record saved with ID:', transactionRef.id);

    return {
      success: true,
      transactionId: transactionRef.id,
      enrollmentResult
    };

  } catch (error) {
    console.error('Error saving payment data:', error);
    console.error('Error details:', error.message);
    throw error;
  }
};

/**
 * Verify if user has purchased a course
 */
export const verifyCoursePurchase = async (userId, courseId) => {
  try {
    // This should use the existing courseService function
    const { getUserCourses } = await import('./courseService');
    const userCourses = await getUserCourses(userId);
    return userCourses.some(course => course.id === courseId);
  } catch (error) {
    console.error('Error verifying purchase:', error);
    return false;
  }
};

/**
 * Get user's transaction history
 */
export const getUserTransactions = async (userId) => {
  try {
    console.log('Fetching transactions for user:', userId);
    // This would typically query the transactions collection
    // For now, return empty array as the web version does
    return { success: true, transactions: [] };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return { success: false, error: error.message, transactions: [] };
  }
};