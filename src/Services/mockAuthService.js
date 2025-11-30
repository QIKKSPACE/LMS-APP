// Mock Authentication Service for Development
// Use this when Firebase is not properly configured

// Mock user data storage
let mockUser = null;

// Pre-populated test users for development
let users = [
  {
    uid: 'test_user_1',
    email: 'test@example.com',
    name: 'Test User',
    displayName: 'Test User',
    password: 'password123',
    mobileNumber: '+1234567890',
    address: '123 Test Street',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString()
  },
  {
    uid: 'demo_user_1',
    email: 'demo@lms.com',
    name: 'Demo User',
    displayName: 'Demo User',
    password: 'demo123',
    mobileNumber: '+0987654321',
    address: '456 Demo Avenue',
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date('2024-01-15').toISOString()
  },
  {
    uid: 'admin_user_1',
    email: 'admin@lms.com',
    name: 'Admin User',
    displayName: 'Admin User',
    password: 'admin123',
    mobileNumber: '+1122334455',
    address: '789 Admin Road',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString()
  }
];

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
    password: password, // Store password (in real app, this would be hashed)
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

  // Validate password - store password hash with user
  if (user.password !== password) {
    return {
      success: false,
      error: 'Incorrect password'
    };
  }

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
    // Add default password for test user if not provided
    if (!user.password) {
      user.password = 'password123';
    }
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