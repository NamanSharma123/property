// Mock OTP Service
// Replacing the Firebase/Twilio implementation with a mock version since Firebase was removed.

export type OTPChannel = "email" | "sms"
export type OTPProvider = "mock"

interface OTPServiceConfig {
  provider: OTPProvider
}

class OTPService {
  private config: OTPServiceConfig

  constructor(config: OTPServiceConfig) {
    this.config = config
  }

  async sendEmailOTP(email: string): Promise<{ success: boolean; message: string }> {
    console.log(`[Mock OTP] Sending email OTP to ${email}`)
    return {
      success: true,
      message: "Password reset email sent (Mock)",
    }
  }

  async sendSMSOTP(
    phoneNumber: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _recaptchaVerifier?: unknown
  ): Promise<{ success: boolean; message: string; verificationId?: string }> {
    console.log(`[Mock OTP] Sending SMS OTP to ${phoneNumber}`)
    return {
      success: true,
      message: "SMS OTP sent (Mock)",
      verificationId: "mock-verification-id-" + Date.now(),
    }
  }

  async verifyOTP(
    _identifier: string,
    code: string
  ): Promise<{ success: boolean; message: string }> {
    console.log(`[Mock OTP] Verifying OTP code: ${code}`)
    if (code === "123456") {
      return {
        success: true,
        message: "OTP verified successfully (Mock)",
      }
    }
    return {
      success: false,
      message: "Invalid OTP (Mock - use 123456)",
    }
  }
}

export const otpService = new OTPService({
  provider: "mock",
})

export default otpService
