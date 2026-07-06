/**
 * Security Utilities
 * Provides rate limiting, input validation, and error handling for authentication
 */

// Rate limiting store (in-memory for now, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

/**
 * Rate limiting for authentication attempts
 * Prevents brute force attacks by limiting login/signup attempts
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remainingAttempts: number; resetAt: number } {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  // Clean expired records
  if (record && now > record.resetAt) {
    rateLimitStore.delete(identifier)
  }

  const currentRecord = rateLimitStore.get(identifier)

  if (!currentRecord) {
    // First attempt
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remainingAttempts: maxAttempts - 1, resetAt: now + windowMs }
  }

  if (currentRecord.count >= maxAttempts) {
    // Rate limit exceeded
    return {
      allowed: false,
      remainingAttempts: 0,
      resetAt: currentRecord.resetAt,
    }
  }

  // Increment attempts
  currentRecord.count++
  rateLimitStore.set(identifier, currentRecord)

  return {
    allowed: true,
    remainingAttempts: maxAttempts - currentRecord.count,
    resetAt: currentRecord.resetAt,
  }
}

/**
 * Reset rate limit for an identifier (e.g., after successful login)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier)
}

/**
 * Email validation with comprehensive regex
 */
export function validateEmail(email: string): { valid: boolean; message?: string } {
  if (!email) {
    return { valid: false, message: 'Email is required' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Invalid email format' }
  }

  // Check for common disposable email domains
  const disposableDomains = ['tempmail.com', 'throwaway.email', '10minutemail.com']
  const domain = email.split('@')[1]?.toLowerCase()
  if (disposableDomains.includes(domain)) {
    return { valid: false, message: 'Disposable email addresses are not allowed' }
  }

  return { valid: true }
}

/**
 * Password validation with strength requirements
 */
export function validatePassword(password: string): {
  valid: boolean
  message?: string
  strength: 'weak' | 'medium' | 'strong'
} {
  if (!password) {
    return { valid: false, message: 'Password is required', strength: 'weak' }
  }

  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters', strength: 'weak' }
  }

  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  let score = 0

  // Length check
  if (password.length >= 8) score++
  if (password.length >= 12) score++

  // Complexity checks
  if (/[a-z]/.test(password)) score++ // lowercase
  if (/[A-Z]/.test(password)) score++ // uppercase
  if (/[0-9]/.test(password)) score++ // numbers
  if (/[^a-zA-Z0-9]/.test(password)) score++ // special characters

  if (score >= 5) strength = 'strong'
  else if (score >= 3) strength = 'medium'

  // Minimum requirements for Firebase (at least 6 characters)
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters', strength }
  }

  return { valid: true, strength }
}

/**
 * Phone number validation (international format)
 */
export function validatePhoneNumber(phone: string): { valid: boolean; message?: string } {
  if (!phone) {
    return { valid: false, message: 'Phone number is required' }
  }

  // Remove spaces and hyphens
  const cleaned = phone.replace(/[\s-]/g, '')

  // Check for international format (+country code)
  if (!/^\+[1-9]\d{1,14}$/.test(cleaned)) {
    return {
      valid: false,
      message: 'Phone number must be in international format (e.g., +1234567890)',
    }
  }

  return { valid: true }
}

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
}

/**
 * Generate secure random token for CSRF protection
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  const randomValues = new Uint8Array(length)
  
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomValues)
  } else {
    // Fallback for server-side (use crypto module in production)
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256)
    }
  }

  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length]
  }

  return token
}

/**
 * Format error messages for user display
 */
export function formatAuthError(error: unknown): string {
  if (typeof error === 'string') return error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errorCode = (error as any)?.code
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errorMessage = (error as any)?.message

  // Firebase-specific errors
  if (errorCode) {
    switch (errorCode) {
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again'
      case 'auth/timeout':
        return 'Request timed out. Please try again'
      case 'auth/internal-error':
        return 'An internal error occurred. Please try again later'
      default:
        return errorMessage || 'An error occurred. Please try again'
    }
  }

  return errorMessage || 'An unexpected error occurred'
}

/**
 * Log security events (can be extended to send to monitoring service)
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, unknown>,
  severity: 'info' | 'warning' | 'error' = 'info'
): void {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    event,
    severity,
    details,
  }

  // Log to console (in production, send to monitoring service like Sentry)
  if (severity === 'error') {
    console.error('[Security Event]', logEntry)
  } else if (severity === 'warning') {
    console.warn('[Security Event]', logEntry)
  } else {
    console.log('[Security Event]', logEntry)
  }

  // TODO: Send to monitoring service
  // Example: Sentry.captureMessage(event, { level: severity, extra: details })
}

/**
 * Check if password has been compromised (mock implementation)
 * In production, integrate with Have I Been Pwned API
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function checkPasswordCompromised(_password: string): Promise<boolean> {
  // TODO: Implement actual check with Have I Been Pwned API
  // For now, return false (not compromised)
  return false
}
