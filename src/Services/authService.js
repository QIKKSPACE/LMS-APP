import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Sign up function
export const signupUser = async (name, email, password) => {
  try {
    console.log('Creating user account...');

    // Create user with email and password
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Update user profile with display name
    await user.updateProfile({
      displayName: name
    });

    // Create user profile data
    const userData = {
      uid: user.uid,
      email: user.email,
      name: name,
      displayName: name,
      mobileNumber: '',
      address: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('User account created successfully');

    return {
      success: true,
      user: userData
    };

  } catch (error) {
    console.error('Signup error:', error);

    let errorMessage = 'An error occurred during signup';

    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'This email is already registered';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password is too weak';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your connection';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

// Login function
export const loginUser = async (email, password) => {
  try {
    console.log('Signing in user...');

    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Create user profile data
    const userData = {
      uid: user.uid,
      email: user.email,
      name: user.displayName || user.email.split('@')[0],
      displayName: user.displayName || user.email.split('@')[0],
      mobileNumber: '',
      address: '',
      createdAt: user.metadata.creationTime || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('User signed in successfully');

    return {
      success: true,
      user: userData
    };

  } catch (error) {
    console.error('Login error:', error);

    let errorMessage = 'An error occurred during login';

    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your connection';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

// Logout function
export const logoutUser = async () => {
  try {
    console.log('Signing out user...');

    await auth().signOut();

    console.log('User signed out successfully');

    return {
      success: true
    };

  } catch (error) {
    console.error('Logout error:', error);

    return {
      success: false,
      error: error.message || 'An error occurred during logout'
    };
  }
};

// Update user profile function
export const updateUserProfile = async (userId, userData) => {
  try {
    console.log('Updating user profile...');

    const user = auth().currentUser;

    if (user && user.uid === userId) {
      // Update display name if provided
      if (userData.name || userData.displayName) {
        await user.updateProfile({
          displayName: userData.name || userData.displayName
        });
      }

      // Update email if provided and different
      if (userData.email && userData.email !== user.email) {
        await user.updateEmail(userData.email);
      }

      // Create updated profile data
      const updatedProfile = {
        uid: user.uid,
        email: userData.email || user.email,
        name: userData.name || user.displayName || user.email.split('@')[0],
        displayName: userData.name || user.displayName || user.email.split('@')[0],
        mobileNumber: userData.mobileNumber || '',
        address: userData.address || '',
        createdAt: userData.createdAt || user.metadata.creationTime || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('User profile updated successfully');

      return {
        success: true,
        user: updatedProfile
      };
    } else {
      throw new Error('User not authenticated or mismatched user ID');
    }

  } catch (error) {
    console.error('Update profile error:', error);

    let errorMessage = 'An error occurred while updating profile';

    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'This email is already registered';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/requires-recent-login':
        errorMessage = 'Please log in again to update your profile';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your connection';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

// Get user profile function
export const getUserProfile = async (userId) => {
  try {
    console.log('Getting user profile...');

    const user = auth().currentUser;

    if (user && user.uid === userId) {
      const userData = {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        displayName: user.displayName || user.email.split('@')[0],
        mobileNumber: '',
        address: '',
        createdAt: user.metadata.creationTime || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('User profile retrieved successfully');

      return {
        success: true,
        user: userData
      };
    } else {
      throw new Error('User not authenticated or mismatched user ID');
    }

  } catch (error) {
    console.error('Get profile error:', error);

    return {
      success: false,
      error: error.message || 'Failed to get user profile'
    };
  }
};

// Auth state change listener
export const onAuthChange = (callback) => {
  return auth().onAuthStateChanged((firebaseUser) => {
    console.log('Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');

    if (firebaseUser) {
      // User is signed in
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        mobileNumber: '',
        address: '',
        createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      callback(userData);
    } else {
      // User is signed out
      callback(null);
    }
  });
};