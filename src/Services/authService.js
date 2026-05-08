// src/services/authService.js
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

/**
 * Sign up a new user with email and password
 */
export const signupUser = async (name, email, password, mobileNumber = '', address = '', phoneVerified = false) => {
  try {
    if (!name || !email || !password) return { success: false, error: 'Please fill in all fields' };
    if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters long' };

    console.log('📝 Creating user with email:', email);
    const userCredential = await auth().createUserWithEmailAndPassword(email.trim(), password.trim());
    const user = userCredential.user;

    await user.updateProfile({ displayName: name });

    const userProfile = {
      uid: user.uid,
      name: name,
      email: email.trim(),
      mobileNumber: mobileNumber,
      phoneVerified: phoneVerified,
      address: address,
      purchasedCourses: [],
      EnrolledCourses: [],
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp()
    };

    await firestore().collection('users').doc(user.uid).set(userProfile);
    console.log('✅ User profile created in Firestore');

    return { 
      success: true, 
      user: { 
        ...userProfile, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      } 
    };
  } catch (error) {
    console.error("❌ Signup error:", error);
    return { success: false, error: getErrorMessage(error.code) };
  }
};

/**
 * Sign in existing user with email and password
 */
export const loginUser = async (email, password) => {
  try {
    if (!email || !password) return { success: false, error: 'Please enter email and password' };

    console.log('🔐 Login attempt for:', email);
    const userCredential = await auth().signInWithEmailAndPassword(email.trim(), password.trim());
    const user = userCredential.user;

    const userDoc = await firestore().collection('users').doc(user.uid).get();

    if (userDoc.exists) {
      console.log('✅ User profile found in Firestore');
      const userProfile = userDoc.data() || {};
      return {
        success: true,
        user: {
          ...userProfile,
          uid: user.uid,
          purchasedCourses: userProfile.purchasedCourses || [],
          EnrolledCourses: userProfile.EnrolledCourses || [],
          phoneVerified: userProfile.phoneVerified || false,
          createdAt: userProfile.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: userProfile.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        }
      };
    } else {
      console.log('⚠️ User profile not found, creating new one');
      const userProfile = {
        uid: user.uid,
        name: user.displayName || email.split('@')[0],
        email: user.email,
        mobileNumber: '',
        phoneVerified: false,
        address: '',
        purchasedCourses: [],
        EnrolledCourses: [],
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      };
      await firestore().collection('users').doc(user.uid).set(userProfile);
      return { 
        success: true, 
        user: { 
          ...userProfile, 
          createdAt: new Date().toISOString(), 
          updatedAt: new Date().toISOString() 
        } 
      };
    }
  } catch (error) {
    console.error("❌ Login error:", error);
    return { success: false, error: getErrorMessage(error.code) };
  }
};

/**
 * Send OTP for Phone Verification
 */
export const verifyPhoneNumber = async (phoneNumber) => {
  try {
    console.log('📱 Starting phone verification for:', phoneNumber);

    if (!phoneNumber || phoneNumber.length < 7) {
      return { success: false, error: 'Invalid phone number format. Please include country code.' };
    }

    const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    // React Native Firebase handles reCAPTCHA automatically
    const confirmation = await auth().signInWithPhoneNumber(formattedNumber);

    console.log('✅ OTP sent successfully');
    return {
      success: true,
      confirmation: confirmation,
      message: 'OTP sent successfully to your mobile number.'
    };
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    return {
      success: false,
      error: getErrorMessage(error.code) || error.message
    };
  }
};

/**
 * Verify OTP Code
 */
export const verifyOTP = async (confirmation, otpCode) => {
  try {
    console.log('🔐 Verifying OTP code...');

    if (!otpCode || otpCode.length !== 6) {
      return { success: false, error: 'Invalid OTP. Must be 6 digits.' };
    }

    if (!confirmation) {
      return { success: false, error: 'No verification in progress. Please request OTP again.' };
    }

    const userCredential = await confirmation.confirm(otpCode);
    const user = userCredential.user;

    console.log('✅ OTP verified successfully for user:', user.uid);

    // Sync profile
    const userDoc = await firestore().collection('users').doc(user.uid).get();
    let userProfile;

    if (userDoc.exists) {
      userProfile = userDoc.data() || {};
      // Ensure mobile number is updated if it was empty (use merge — update() throws
      // firestore/not-found if the doc is missing on server but cache said exists)
      if (!userProfile.mobileNumber) {
        await firestore().collection('users').doc(user.uid).set(
          {
            uid: user.uid,
            mobileNumber: user.phoneNumber || '',
            phoneVerified: true,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        userProfile.mobileNumber = user.phoneNumber || '';
        userProfile.phoneVerified = true;
      }
    } else {
      userProfile = {
        uid: user.uid,
        name: 'User ' + user.uid.substring(0, 5),
        email: '',
        mobileNumber: user.phoneNumber || '',
        phoneVerified: true,
        address: '',
        purchasedCourses: [],
        EnrolledCourses: [],
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      };
      await firestore().collection('users').doc(user.uid).set(userProfile);
    }

    return {
      success: true,
      user: {
        ...userProfile,
        uid: user.uid,
        purchasedCourses: userProfile.purchasedCourses || [],
        EnrolledCourses: userProfile.EnrolledCourses || [],
        phoneVerified: userProfile.phoneVerified ?? true,
        createdAt: userProfile.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: userProfile.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      },
      message: 'Phone number verified successfully'
    };
  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    return {
      success: false,
      error: getErrorMessage(error.code) || 'Invalid OTP code'
    };
  }
};

/**
 * Get user profile by mobile number
 */
export const getUserByMobileNumber = async (mobileNumber) => {
  try {
    if (!mobileNumber) return null;
    console.log('🔍 Fetching user by mobile number:', mobileNumber);
    
    const formattedNumber = mobileNumber.startsWith('+') ? mobileNumber : `+${mobileNumber.trim()}`;
    const querySnapshot = await firestore()
      .collection('users')
      .where('mobileNumber', '==', formattedNumber)
      .get();

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const data = userDoc.data() || {};
      return { id: userDoc.id, ...data };
    }
    return null;
  } catch (error) {
    console.error("❌ Error fetching user by mobile number:", error);
    return null;
  }
};

/**
 * Check if a mobile number is already registered
 */
export const checkMobileNumberExists = async (mobileNumber) => {
  try {
    if (!mobileNumber) return false;
    console.log('🔍 Checking if mobile number exists:', mobileNumber);
    
    const formattedNumber = mobileNumber.startsWith('+91') ? mobileNumber : `+91${mobileNumber.trim()}`;
    const querySnapshot = await firestore()
      .collection('users')
      .where('mobileNumber', '==', formattedNumber)
      .get();

    return !querySnapshot.empty;
  } catch (error) {
    console.error("❌ Error checking mobile number:", error);
    return false;
  }
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (userId) => {
  try {
    if (!userId) return { success: false, error: 'User ID is required' };
    console.log('📥 Fetching profile for user:', userId);
    
    const userDocRef = firestore().collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();

    if (userDocSnap.exists) {
      const userData = userDocSnap.data() || {};
      return {
        success: true,
        user: {
          ...userData,
          uid: userId,
          purchasedCourses: userData.purchasedCourses || [],
          EnrolledCourses: userData.EnrolledCourses || [],
          phoneVerified: userData.phoneVerified || false,
          createdAt: userData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: userData.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        }
      };
    }
    return { success: false, error: "User profile not found" };
  } catch (error) {
    console.error("❌ Get profile error:", error);
    return { success: false, error: "Failed to fetch profile" };
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    if (!userId) return { success: false, error: 'User ID is required' };
    console.log('📝 Updating profile for user:', userId);

    const userDocRef = firestore().collection('users').doc(userId);
    const updateData = {
      ...updates,
      updatedAt: firestore.FieldValue.serverTimestamp()
    };

    await userDocRef.update(updateData);
    const updatedDocSnap = await userDocRef.get();

    if (updatedDocSnap.exists) {
      const updatedUser = updatedDocSnap.data() || {};
      return {
        success: true,
        user: {
          ...updatedUser,
          uid: userId,
          purchasedCourses: updatedUser.purchasedCourses || [],
          EnrolledCourses: updatedUser.EnrolledCourses || [],
          createdAt: updatedUser.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: updatedUser.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        }
      };
    }
    return { success: false, error: 'Failed to fetch updated profile' };
  } catch (error) {
    console.error("❌ Update profile error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete current user account and profile
 */
export const deleteUserAccount = async () => {
  try {
    const user = auth().currentUser;
    if (!user) return { success: false, error: 'No user signed in' };

    console.log('🗑️ Deleting account for user:', user.uid);
    await firestore().collection('users').doc(user.uid).delete();
    await user.delete();
    
    return { success: true };
  } catch (error) {
    console.error("❌ Delete account error:", error);
    if (error.code === 'auth/requires-recent-login') {
      return {
        success: false,
        requiresRecentLogin: true,
        error: "For security reasons, this action requires a recent login."
      };
    }
    return { success: false, error: getErrorMessage(error.code) };
  }
};

/**
 * Request account deletion (Unauthenticated)
 */
export const requestAccountDeletion = async (email, mobile, reason = '') => {
  try {
    if (!email || !mobile) return { success: false, error: 'Email and Mobile Number are required' };

    console.log('📝 Submitting deletion request for:', email);
    const requestData = {
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      reason: reason.trim(),
      status: 'pending',
      requestedAt: firestore.FieldValue.serverTimestamp(),
      platform: 'mobile-lms'
    };

    await firestore().collection('deletion_requests').add(requestData);
    return { success: true };
  } catch (error) {
    console.error("❌ Error submitting deletion request:", error);
    return { success: false, error: "Failed to submit request." };
  }
};

/**
 * Sign out current user
 */
export const logoutUser = async () => {
  try {
    await auth().signOut();
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to logout" };
  }
};

/**
 * Listen to authentication state changes
 */
export const onAuthChange = (callback) => {
  return auth().onAuthStateChanged((firebaseUser) => {
    callback(firebaseUser);
  });
};

/**
 * Convert Firebase error codes to user-friendly messages
 */
const getErrorMessage = (errorCode) => {
  const errorMessages = {
    'auth/email-already-in-use': 'This email is already registered',
    'auth/invalid-email': 'Invalid email address',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/user-not-found': 'Invalid email or password',
    'auth/wrong-password': 'Invalid email or password',
    'auth/invalid-credential': 'Invalid credentials. Please try again.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/invalid-phone-number': 'Invalid phone number format',
    'auth/missing-phone-number': 'Phone number is required',
    'auth/captcha-check-failed': 'Security verification failed',
    'auth/invalid-verification-code': 'Invalid OTP code',
    'auth/code-expired': 'OTP has expired',
    'auth/network-request-failed': 'Network connection failed',
    'firestore/not-found': 'Could not save your profile. Please try again.',
  };

  return errorMessages[errorCode] || `Authentication error (${errorCode || 'Unknown'})`;
};