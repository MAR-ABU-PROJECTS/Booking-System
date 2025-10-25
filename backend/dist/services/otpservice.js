"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPService = void 0;
const crypto = __importStar(require("crypto"));
class OTPService {
    /**
     * Generate a 6-digit OTP code
     */
    static generateOTP() {
        const min = Math.pow(10, this.OTP_LENGTH - 1);
        const max = Math.pow(10, this.OTP_LENGTH) - 1;
        return Math.floor(Math.random() * (max - min + 1) + min).toString();
    }
    /**
     * Generate OTP expiry time (10 minutes from now)
     */
    static generateOTPExpiry() {
        return new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
    }
    /**
     * Check if OTP is expired
     */
    static isOTPExpired(expiry) {
        return new Date() > expiry;
    }
    /**
     * Check if user has exceeded max attempts
     */
    static hasExceededAttempts(attempts) {
        return attempts >= this.MAX_ATTEMPTS;
    }
    /**
     * Check if user can request new OTP (cooldown period)
     */
    static canRequestNewOTP(lastSent) {
        if (!lastSent)
            return true;
        const cooldownEnd = new Date(lastSent.getTime() + this.COOLDOWN_MINUTES * 60 * 1000);
        return new Date() > cooldownEnd;
    }
    /**
     * Get remaining cooldown time in seconds
     */
    static getRemainingCooldown(lastSent) {
        if (!lastSent)
            return 0;
        const cooldownEnd = new Date(lastSent.getTime() + this.COOLDOWN_MINUTES * 60 * 1000);
        const remaining = cooldownEnd.getTime() - Date.now();
        return Math.max(0, Math.ceil(remaining / 1000));
    }
    /**
     * Validate OTP format (6 digits)
     */
    static isValidOTPFormat(otp) {
        return /^\d{6}$/.test(otp);
    }
    /**
     * Hash OTP for secure storage (optional - for extra security)
     */
    static hashOTP(otp) {
        return crypto.createHash("sha256").update(otp).digest("hex");
    }
    /**
     * Compare OTP with hash (if using hashed storage)
     */
    static compareOTP(otp, hash) {
        return this.hashOTP(otp) === hash;
    }
    /**
     * Validate OTP code against stored OTP and expiry
     */
    static validateOTP(inputOTP, storedOTP, expiry) {
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
    static getErrorMessage(errorType, data) {
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
}
exports.OTPService = OTPService;
_a = OTPService;
OTPService.OTP_LENGTH = 6;
OTPService.OTP_EXPIRY_MINUTES = 10;
OTPService.MAX_ATTEMPTS = 5;
OTPService.COOLDOWN_MINUTES = 5; // Prevent spam
/**
 * Constants for easy access
 */
OTPService.CONSTANTS = {
    OTP_LENGTH: _a.OTP_LENGTH,
    EXPIRY_MINUTES: _a.OTP_EXPIRY_MINUTES,
    MAX_ATTEMPTS: _a.MAX_ATTEMPTS,
    COOLDOWN_MINUTES: _a.COOLDOWN_MINUTES,
};
