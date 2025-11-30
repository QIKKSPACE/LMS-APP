// Development Configuration
// This file helps with switching between mock and real Firebase during development

export const DEV_CONFIG = {
  // Set to true for development/testing without Firebase
  // Set to false when you want to use real Firebase
  USE_MOCK_AUTH: true,

  // Mock user for testing (when USE_MOCK_AUTH is true)
  MOCK_USER: {
    uid: 'mock_user_123',
    email: 'test@example.com',
    name: 'Test User',
    displayName: 'Test User',
    mobileNumber: '+1234567890',
    address: '123 Test Street, Test City',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // Auto-login with mock user (helps with development)
  AUTO_LOGIN_MOCK: false,

  // Enable debug logging
  DEBUG_MODE: true
};

export const switchToMockAuth = () => {
  console.log('🧪 Switching to Mock Authentication');
  DEV_CONFIG.USE_MOCK_AUTH = true;
};

export const switchToFirebaseAuth = () => {
  console.log('🔥 Switching to Firebase Authentication');
  DEV_CONFIG.USE_MOCK_AUTH = false;
};

export const enableAutoLogin = () => {
  console.log('🚀 Enabling Auto Login with Mock User');
  DEV_CONFIG.AUTO_LOGIN_MOCK = true;
};

export const disableAutoLogin = () => {
  console.log('🛑 Disabling Auto Login');
  DEV_CONFIG.AUTO_LOGIN_MOCK = false;
};

export default DEV_CONFIG;