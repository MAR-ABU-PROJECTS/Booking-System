import * as crypto from "crypto";

export class OTPService {
  private static readonly OTP_LENGTH = 6;
  private static readonly OTP_EXPIRY_MINUTES = 10;
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly COOLDOWN_MINUTES = 5; // Prevent spam

  /**
   * Generate a 6-digit OTP code
   */
  static generateOTP(): string {
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * Generate OTP expiry time (10 minutes from now)
   */
  static generateOTPExpiry(): Date {
    return new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
  }

  /**
   * Check if OTP is expired
   */
  static isOTPExpired(expiry: Date): boolean {
    return new Date() > expiry;
  }

  /**
   * Check if user has exceeded max attempts
   */
  static hasExceededAttempts(attempts: number): boolean {
    return attempts >= this.MAX_ATTEMPTS;
  }

  /**
   * Check if user can request new OTP (cooldown period)
   */
  static canRequestNewOTP(lastSent?: Date): boolean {
    if (!lastSent) return true;

    const cooldownEnd = new Date(
      lastSent.getTime() + this.COOLDOWN_MINUTES * 60 * 1000
    );
    return new Date() > cooldownEnd;
  }

  /**
   * Get remaining cooldown time in seconds
   */
  static getRemainingCooldown(lastSent?: Date): number {
    if (!lastSent) return 0;

    const cooldownEnd = new Date(
      lastSent.getTime() + this.COOLDOWN_MINUTES * 60 * 1000
    );
    const remaining = cooldownEnd.getTime() - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000));
  }

  /**
   * Validate OTP format (6 digits)
   */
  static isValidOTPFormat(otp: string): boolean {
    return /^\d{6}$/.test(otp);
  }

  /**
   * Hash OTP for secure storage (optional - for extra security)
   */
  static hashOTP(otp: string): string {
    return crypto.createHash("sha256").update(otp).digest("hex");
  }

  /**
   * Compare OTP with hash (if using hashed storage)
   */
  static compareOTP(otp: string, hash: string): boolean {
    return this.hashOTP(otp) === hash;
  }

  /**
   * Validate OTP code against stored OTP and expiry
   */
  static validateOTP(
    inputOTP: string,
    storedOTP: string | null,
    expiry: Date | null
  ): boolean {
    if (!inputOTP || !storedOTP || !expiry) {
      return false;
    }

    if (!this.isValidOTPFormat(inputOTP)) {
      return false;
    }

    if (this.isOTPExpired(expiry)) {
      return false;
    }

    return inputOTP === storedOTP;
  }

  /**
   * Get user-friendly error messages
   */
  static getErrorMessage(errorType: string, data?: any): string {
    switch (errorType) {
      case "INVALID_FORMAT":
        return "Please enter a valid 6-digit code";
      case "EXPIRED":
        return "Verification code has expired. Please request a new one";
      case "MAX_ATTEMPTS":
        return "Too many failed attempts. Please wait before trying again";
      case "COOLDOWN":
        return `Please wait ${data?.seconds || 0} seconds before requesting a new code`;
      case "NOT_FOUND":
        return "No verification code found. Please request a new one";
      case "ALREADY_USED":
        return "This verification code has already been used";
      default:
        return "Invalid verification code. Please try again";
    }
  }

  /**
   * Constants for easy access
   */
  static readonly CONSTANTS = {
    OTP_LENGTH: this.OTP_LENGTH,
    EXPIRY_MINUTES: this.OTP_EXPIRY_MINUTES,
    MAX_ATTEMPTS: this.MAX_ATTEMPTS,
    COOLDOWN_MINUTES: this.COOLDOWN_MINUTES,
  };
}
