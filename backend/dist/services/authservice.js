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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.optionalAuth = exports.requireAuth = exports.isTokenBlacklisted = exports.blacklistToken = exports.authService = exports.AuthService = exports.otpVerifySchema = exports.otpRequestSchema = void 0;
const z = __importStar(require("zod"));
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../config/database"));
const crypto = __importStar(require("crypto"));
const jwt = __importStar(require("jsonwebtoken"));
const emailservice_1 = require("./emailservice");
// ===============================
// VALIDATION SCHEMAS
// ===============================
exports.otpRequestSchema = z.object({
    email: z.string().email("Invalid email address"),
    purpose: z.enum(["signup", "login"], {
        errorMap: () => ({ message: "Purpose must be either 'signup' or 'login'" }),
    }),
});
exports.otpVerifySchema = z.object({
    email: z.string().email("Invalid email address"),
    otpCode: z
        .string()
        .min(6, "OTP code must be 6 digits")
        .max(6, "OTP code must be 6 digits"),
    purpose: z.enum(["signup", "login"], {
        errorMap: () => ({ message: "Purpose must be either 'signup' or 'login'" }),
    }),
});
// ===============================
// SERVICE CLASS
// ===============================
class AuthService {
    constructor() {
        this.tempOTPStorage = new Map();
        this.JWT_SECRET = process.env.JWT_SECRET || "default-secret";
        this.JWT_REFRESH_SECRET =
            process.env.JWT_REFRESH_SECRET || "default-refresh-secret";
    }
    /**
     * Store temporary OTP data for signups
     */
    setTempOTPData(email, otpData) {
        this.tempOTPStorage.set(email, otpData);
        // Auto-cleanup after 10 minutes
        setTimeout(() => {
            this.tempOTPStorage.delete(email);
        }, 10 * 60 * 1000);
    }
    /**
     * Get temporary OTP data for signups
     */
    getTempOTPData(email) {
        return this.tempOTPStorage.get(email);
    }
    /**
     * Request OTP for signup or login
     */
    async requestOTP(email, purpose) {
        const { OTPService } = await Promise.resolve().then(() => __importStar(require("./otpservice")));
        try {
            // Check if user exists
            const existingUser = await database_1.default.user.findUnique({
                where: { email },
                select: {
                    id: true,
                    email: true,
                    otpCode: true,
                    otpExpiry: true,
                    otpAttempts: true,
                    otpLastSent: true,
                    status: true,
                },
            });
            // For login, user must exist
            if (purpose === "login" && !existingUser) {
                throw new Error("No account found with this email. Please sign up first.");
            }
            // For signup, user must not exist
            if (purpose === "signup" && existingUser) {
                throw new Error("Account already exists with this email. Please log in instead.");
            }
            // Check cooldown period
            if (existingUser?.otpLastSent &&
                !OTPService.canRequestNewOTP(existingUser.otpLastSent)) {
                const remainingSeconds = OTPService.getRemainingCooldown(existingUser.otpLastSent);
                throw new Error(`Please wait ${remainingSeconds} seconds before requesting a new code`);
            }
            // Check max attempts (reset after cooldown)
            if (existingUser &&
                OTPService.hasExceededAttempts(existingUser.otpAttempts)) {
                // Reset attempts if cooldown has passed
                if (!existingUser.otpLastSent ||
                    OTPService.canRequestNewOTP(existingUser.otpLastSent)) {
                    await database_1.default.user.update({
                        where: { id: existingUser.id },
                        data: { otpAttempts: 0 },
                    });
                }
                else {
                    throw new Error("Too many failed attempts. Please wait before trying again.");
                }
            }
            // Generate new OTP
            const otpCode = OTPService.generateOTP();
            const otpExpiry = OTPService.generateOTPExpiry();
            // For login: update existing user
            if (purpose === "login" && existingUser) {
                await database_1.default.user.update({
                    where: { id: existingUser.id },
                    data: {
                        otpCode,
                        otpExpiry,
                        otpLastSent: new Date(),
                        otpAttempts: 0, // Reset attempts on new request
                    },
                });
            }
            // For signup: store OTP temporarily
            let userId = existingUser?.id;
            if (purpose === "signup") {
                // Store OTP data temporarily - we'll use a simple in-memory store
                // In production, this could be Redis or a temporary database table
                this.setTempOTPData(email, {
                    otpCode,
                    otpExpiry,
                    otpLastSent: new Date(),
                    otpAttempts: 0,
                });
            }
            // Send OTP email
            await emailservice_1.emailService.sendOTPEmail(email, otpCode, purpose);
            return {
                userId,
                message: "Verification code sent to your email",
                expiresAt: otpExpiry,
            };
        }
        catch (error) {
            console.error("RequestOTP error:", error);
            throw new Error(error.message || "Failed to send verification code");
        }
    }
    /**
     * Verify OTP and authenticate user (signup or login)
     */
    async verifyOTP(email, otpCode, purpose) {
        const { OTPService } = await Promise.resolve().then(() => __importStar(require("./otpservice")));
        try {
            let user;
            let otpData;
            if (purpose === "login") {
                // For login: get user from database
                user = await database_1.default.user.findUnique({
                    where: { email },
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        status: true,
                        emailVerified: true,
                        otpCode: true,
                        otpExpiry: true,
                        otpAttempts: true,
                        otpLastSent: true,
                    },
                });
                if (!user) {
                    throw new Error("User not found");
                }
                otpData = {
                    otpCode: user.otpCode,
                    otpExpiry: user.otpExpiry,
                    otpAttempts: user.otpAttempts,
                };
            }
            else {
                // For signup: get OTP from temporary storage
                otpData = this.getTempOTPData(email);
                if (!otpData) {
                    throw new Error("OTP expired or not found. Please request a new code.");
                }
            }
            // Validate OTP
            const isValidOTP = OTPService.validateOTP(otpCode, otpData.otpCode, otpData.otpExpiry);
            if (!isValidOTP) {
                // Increment attempts for existing users
                if (purpose === "login" && user) {
                    await database_1.default.user.update({
                        where: { id: user.id },
                        data: { otpAttempts: (otpData.otpAttempts || 0) + 1 },
                    });
                }
                else if (purpose === "signup") {
                    // Increment attempts in temporary storage
                    otpData.otpAttempts = (otpData.otpAttempts || 0) + 1;
                    this.setTempOTPData(email, otpData);
                }
                throw new Error("Invalid or expired verification code");
            }
            // Handle signup: create new user
            if (purpose === "signup") {
                user = await database_1.default.user.create({
                    data: {
                        email,
                        role: client_1.UserRole.CUSTOMER,
                        status: client_1.UserStatus.ACTIVE,
                        emailVerified: new Date(),
                        // Clear OTP fields after successful verification
                        otpCode: null,
                        otpExpiry: null,
                        otpAttempts: 0,
                        otpLastSent: null,
                    },
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        status: true,
                        emailVerified: true,
                    },
                });
                // Clean up temporary storage
                this.tempOTPStorage.delete(email);
            }
            else {
                // Handle login: clear OTP fields and mark as verified
                if (!user) {
                    throw new Error("User not found for login");
                }
                user = await database_1.default.user.update({
                    where: { id: user.id },
                    data: {
                        emailVerified: new Date(),
                        lastLoginAt: new Date(),
                        // Clear OTP fields after successful verification
                        otpCode: null,
                        otpExpiry: null,
                        otpAttempts: 0,
                        otpLastSent: null,
                    },
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        status: true,
                        emailVerified: true,
                    },
                });
            }
            // Ensure user is defined before generating tokens
            if (!user) {
                throw new Error("User creation or update failed");
            }
            // Generate tokens
            const authUser = {
                id: user.id,
                email: user.email,
                role: user.role,
                status: user.status,
                emailVerified: user.emailVerified,
            };
            const tokens = this.generateTokens(authUser);
            return {
                user: authUser,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                isNewUser: purpose === "signup",
            };
        }
        catch (error) {
            console.error("VerifyOTP error:", error);
            throw new Error(error.message || "Failed to verify OTP");
        }
    }
    /**
     * Generate JWT access and refresh tokens
     */
    generateTokens(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
        };
        const accessToken = jwt.sign(payload, this.JWT_SECRET, {
            expiresIn: "1h",
        });
        const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
            expiresIn: "7d",
        });
        return { accessToken, refreshToken };
    }
    /**
     * Verify JWT token
     */
    verifyToken(token, isRefreshToken = false) {
        const secret = isRefreshToken ? this.JWT_REFRESH_SECRET : this.JWT_SECRET;
        return jwt.verify(token, secret);
    }
    /**
     * Get user by ID (for middleware)
     */
    async getUserById(userId) {
        const user = await database_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                emailVerified: true,
            },
        });
        return user;
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshToken) {
        try {
            const decoded = this.verifyToken(refreshToken, true);
            const user = await this.getUserById(decoded.userId);
            if (!user) {
                throw new Error("User not found");
            }
            if (user.status !== client_1.UserStatus.ACTIVE) {
                throw new Error("Account is not active");
            }
            const tokens = this.generateTokens(user);
            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user,
            };
        }
        catch (error) {
            throw new Error("Invalid refresh token");
        }
    }
    /**
     * Verify email by token (placeholder for email verification)
     */
    async verifyEmailByToken(token) {
        // This would typically verify an email verification token
        // For now, we'll just decode it as a JWT
        try {
            const decoded = this.verifyToken(token);
            const user = await this.getUserById(decoded.userId);
            if (!user) {
                throw new Error("User not found");
            }
            // Update user as email verified
            await database_1.default.user.update({
                where: { id: user.id },
                data: { emailVerified: new Date() },
            });
            return { ...user, emailVerified: new Date() };
        }
        catch (error) {
            throw new Error("Invalid verification token");
        }
    }
    /**
     * Resend verification email
     */
    async resendVerification(userId) {
        const user = await this.getUserById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        if (user.emailVerified) {
            throw new Error("Email is already verified");
        }
        // Generate verification token and send email
        const verificationToken = this.generateTokens(user).accessToken;
        await emailservice_1.emailService.sendEmailVerification(user.email, verificationToken);
    }
    /**
     * Initiate forgot password process
     */
    async forgotPassword(email) {
        const user = await database_1.default.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                emailVerified: true,
            },
        });
        if (!user) {
            // Don't reveal if user exists or not for security
            return;
        }
        // Generate reset token and send email
        const resetToken = this.generateTokens(user).accessToken;
        await emailservice_1.emailService.sendPasswordResetEmail(email, resetToken);
    }
    /**
     * Update user profile
     */
    async updateProfile(userId, updateData) {
        const user = await database_1.default.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                emailVerified: true,
            },
        });
        return user;
    }
    /**
     * Rotate refresh token
     */
    async rotateRefreshToken(oldRefreshToken) {
        try {
            const decoded = this.verifyToken(oldRefreshToken, true);
            const user = await this.getUserById(decoded.userId);
            if (!user) {
                throw new Error("User not found");
            }
            const tokens = this.generateTokens(user);
            return tokens.refreshToken;
        }
        catch (error) {
            throw new Error("Invalid refresh token");
        }
    }
    /**
     * Issue new access token
     */
    issueAccessToken(user) {
        const tokens = this.generateTokens(user);
        return tokens.accessToken;
    }
    /**
     * Blacklist token (placeholder - in production use Redis or database)
     */
    async blacklistToken(token) {
        try {
            const payload = this.verifyToken(token);
            const expiresAt = new Date(payload.exp * 1000);
            const tokenHash = hashToken(token);
            await database_1.default.blacklistedToken.create({
                data: {
                    tokenHash,
                    expiresAt,
                    userId: payload.userId,
                },
            });
            console.log(`Token blacklisted: ${token.substring(0, 20)}...`);
        }
        catch (error) {
            console.error("Error blacklisting token:", error);
            throw new Error("Failed to blacklist token");
        }
    }
}
exports.AuthService = AuthService;
// Export singleton instance
exports.authService = new AuthService();
// Export blacklistToken function for compatibility
const blacklistToken = (token) => exports.authService.blacklistToken(token);
exports.blacklistToken = blacklistToken;
// Check if token is blacklisted
const isTokenBlacklisted = async (token) => {
    try {
        const tokenHash = hashToken(token);
        const blacklistedToken = await database_1.default.blacklistedToken.findUnique({
            where: { tokenHash },
        });
        return !!blacklistedToken;
    }
    catch (error) {
        console.error("Error checking blacklisted token:", error);
        return false;
    }
};
exports.isTokenBlacklisted = isTokenBlacklisted;
// Hash a token for secure storage
function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}
/**
 * Middleware to require authentication with optional role check
 */
const requireAuth = (options) => {
    return async (req, res, next) => {
        try {
            const token = req.headers.authorization?.replace("Bearer ", "");
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: "Access token required",
                });
            }
            // Check if token is blacklisted
            if (await (0, exports.isTokenBlacklisted)(token)) {
                return res.status(401).json({
                    success: false,
                    message: "Token is blacklisted",
                });
            }
            const decoded = exports.authService.verifyToken(token);
            const user = await exports.authService.getUserById(decoded.userId);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid token",
                });
            }
            if (user.status !== client_1.UserStatus.ACTIVE && !options?.allowPending) {
                return res.status(401).json({
                    success: false,
                    message: "Account is not active",
                });
            }
            // Check role if specified
            if (options?.role && user.role !== options.role) {
                return res.status(403).json({
                    success: false,
                    message: "Insufficient permissions",
                });
            }
            req.user = user;
            next();
        }
        catch (error) {
            return res.status(401).json({
                success: false,
                message: "Invalid token",
            });
        }
    };
};
exports.requireAuth = requireAuth;
/**
 * Middleware for optional authentication
 */
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (token) {
            const decoded = exports.authService.verifyToken(token);
            const user = await exports.authService.getUserById(decoded.userId);
            req.user = user || undefined;
        }
        next();
    }
    catch (error) {
        // For optional auth, continue without user if token is invalid
        next();
    }
};
exports.optionalAuth = optionalAuth;
/**
 * Middleware to check if user is admin
 */
exports.requireAdmin = (0, exports.requireAuth)({ role: client_1.UserRole.ADMIN });
