export interface AuthUser {
  uid: string
  email: string | null
  emailVerified: boolean
  displayName: string | null
  photoURL: string | null
  phoneNumber: string | null
  // Custom properties
  createdAt?: Date | null
  lastLoginAt?: Date | null
  mfaEnabled: boolean
  mfaMethods: MFAMethod[]
  passwordLastChanged?: Date
  accountStatus: 'active' | 'suspended' | 'locked'
  loginAttempts: number
  metadata?: UserMetadata
}

export interface UserMetadata {
  accountCreatedFrom?: string // IP or location
  emailVerifiedAt?: Date
  phoneVerifiedAt?: Date
  twoFactorEnabledAt?: Date
  lastPasswordChangeAt?: Date
  createdAt?: Date | null
  lastLoginAt?: Date | null
  preferences?: {
    sessionDuration?: number // in days
    emailNotifications?: boolean
    smsNotifications?: boolean
  }
}

export type MFAMethod = 'sms' | 'email' | 'authenticator'

export interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: AuthError | null
  isAuthenticated: boolean
  session: Session | null
}

export interface Session {
  sessionId: string
  id?: string
  userId: string
  deviceId?: string
  deviceInfo: DeviceInfo
  createdAt: Date
  expiresAt: Date
  lastActivityAt: Date
  ipAddress: string
  isActive: boolean
}

export interface DeviceInfo {
  userAgent: string
  browser: string
  os: string
  device: string
  isMobile: boolean
  location?: string
}

export interface AuthError {
  code: string
  message: string
  details?: string
}

// Authentication credentials
export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface SignupCredentials {
  email: string
  password: string
  displayName?: string
  phoneNumber?: string
  acceptTerms?: boolean
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordChangeRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// Phone verification
export interface PhoneVerificationRequest {
  phoneNumber: string
  method: 'sms' | 'call'
}

export interface PhoneVerificationConfirm {
  verificationId: string
  code: string
}

// Security and validation
export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  preventCommonPasswords: boolean
  preventPasswordReuse: number // number of previous passwords to check
  preventCommon?: boolean
  preventReuse?: number
}

export interface PasswordStrength {
  score: number // 0-4
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'
  feedback: string[]
  passesPolicy: boolean
}

// Rate limiting
export interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  lockoutDurationMs: number
}

export interface RateLimitStatus {
  allowed: boolean
  remainingAttempts?: number
  resetAt?: Date
  lockedUntil?: Date
  remaining?: number
  resetIn?: number
}

// Activity logging
export interface ActivityLog {
  id: string
  userId: string
  action: ActivityAction
  timestamp: Date
  deviceInfo: DeviceInfo
  ipAddress: string
  success: boolean
  details?: Record<string, any>
  metadata?: any
  userAgent?: string
}

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'signup'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'password_change'
  | 'email_verification'
  | 'phone_verification'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'session_created'
  | 'session_revoked'
  | 'account_locked'
  | 'account_unlocked'
  | 'email_verification_sent'
  | 'phone_verification_sent'
  | 'login_failed'
  | 'email_verified'
  | 'phone_verified'
