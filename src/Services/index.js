// Service configuration
// Set USE_MOCK_AUTH to true for development without Firebase
export const USE_MOCK_AUTH = true; // Change to false when Firebase is configured

// Import both services
import * as authService from './authService';
import mockService from './mockAuthService';

// Export appropriate service based on configuration
export const useAuthService = () => {
  if (USE_MOCK_AUTH) {
    console.log('🧪 Using Mock Authentication Service');
    return {
      signupUser: mockService.signupUser,
      loginUser: mockService.loginUser,
      logoutUser: mockService.logoutUser,
      updateUserProfile: mockService.updateUserProfile,
      getUserProfile: mockService.getUserProfile,
      onAuthChange: mockService.onAuthChange,
      // Mock specific methods
      getCurrentMockUser: mockService.getCurrentMockUser,
      setMockUser: mockService.setMockUser
    };
  } else {
    console.log('🔥 Using Firebase Authentication Service');
    return {
      signupUser: authService.signupUser,
      loginUser: authService.loginUser,
      logoutUser: authService.logoutUser,
      updateUserProfile: authService.updateUserProfile,
      getUserProfile: authService.getUserProfile,
      onAuthChange: authService.onAuthChange
    };
  }
};

// Default export with current configuration
export const {
  signupUser,
  loginUser,
  logoutUser,
  updateUserProfile,
  getUserProfile,
  onAuthChange
} = useAuthService();

export default useAuthService;