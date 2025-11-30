// Mock Authentication Service for Development
// Use this when Firebase is not properly configured

// Mock user data storage
let mockUser = null;
let users = [];

export const mockSignupUser = async (name, email, password) => {
  console.log('Mock signup for:', email);

  // Check if user already exists
  if (users.find(u => u.email === email)) {
    return {
      success: false,
      error: 'This email is already registered'
    };
  }

  // Create new user
  const newUser = {
    uid: `mock_${Date.now()}`,
    email: email,
    name: name,
    displayName: name,
    mobileNumber: '',
    address: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  users.push(newUser);
  mockUser = newUser;

  console.log('Mock signup successful');

  return {
    success: true,
    user: newUser
  };
};

export const mockLoginUser = async (email, password) => {
  console.log('Mock login for:', email);

  // Find user in mock database
  const user = users.find(u => u.email === email);

  if (!user) {
    return {
      success: false,
      error: 'No account found with this email'
    };
  }

  // In mock, we don't validate password (or you could add simple validation)
  mockUser = user;

  console.log('Mock login successful');

  return {
    success: true,
    user: user
  };
};

export const mockLogoutUser = async () => {
  console.log('Mock logout');
  mockUser = null;

  return {
    success: true
  };
};

export const mockUpdateUserProfile = async (userId, userData) => {
  console.log('Mock updating user profile...');

  const userIndex = users.findIndex(u => u.uid === userId);

  if (userIndex === -1) {
    return {
      success: false,
      error: 'User not found'
    };
  }

  // Update user data
  users[userIndex] = {
    ...users[userIndex],
    ...userData,
    updatedAt: new Date().toISOString()
  };

  mockUser = users[userIndex];

  console.log('Mock profile update successful');

  return {
    success: true,
    user: mockUser
  };
};

export const mockGetUserProfile = async (userId) => {
  console.log('Mock getting user profile...');

  const user = users.find(u => u.uid === userId);

  if (!user) {
    return {
      success: false,
      error: 'User not found'
    };
  }

  console.log('Mock user profile retrieved successfully');

  return {
    success: true,
    user: user
  };
};

// Mock auth state change listener
export const mockOnAuthChange = (callback) => {
  // In mock, we'll just return the current user
  setTimeout(() => {
    callback(mockUser);
  }, 100);

  // Return unsubscribe function
  return () => {
    console.log('Mock auth change listener unsubscribed');
  };
};

// Get current mock user
export const getCurrentMockUser = () => {
  return mockUser;
};

// Set mock user (useful for testing)
export const setMockUser = (user) => {
  mockUser = user;
  if (user && !users.find(u => u.uid === user.uid)) {
    users.push(user);
  }
};

export default {
  signupUser: mockSignupUser,
  loginUser: mockLoginUser,
  logoutUser: mockLogoutUser,
  updateUserProfile: mockUpdateUserProfile,
  getUserProfile: mockGetUserProfile,
  onAuthChange: mockOnAuthChange,
  getCurrentMockUser,
  setMockUser
};