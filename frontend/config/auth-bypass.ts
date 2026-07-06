/**
 * Authentication Bypass Configuration
 * 
 * DEVELOPMENT ONLY: Set BYPASS_AUTH to true to skip Firebase authentication
 * and use mock credentials for testing.
 * 
 * IMPORTANT: Set to false in production!
 */

export const AUTH_BYPASS_CONFIG = {
  // Toggle bypass mode
  BYPASS_AUTH: true, // Set to false to use real Firebase auth
  
  // Demo credentials
  DEMO_EMAIL: 'demo@properly.com',
  DEMO_PASSWORD: 'properly@123',
  
  // Mock user data
  MOCK_USER: {
    uid: 'demo-user-123',
    email: 'demo@properly.com',
    emailVerified: true,
    displayName: 'Demo User',
    phoneNumber: null,
    photoURL: null,
  }
} as const;
