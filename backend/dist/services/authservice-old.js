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
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = exports.updateProfileSchema = exports.changePasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
exports.blacklistToken = blacklistToken;
exports.isTokenBlacklisted = isTokenBlacklisted;
// MAR ABU PROJECTS SERVICES LLC - Authentication Service (FULLY FIXED)
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const crypto = __importStar(require("crypto"));
const zod_1 = require("zod");
const emailservice_1 = require("./emailservice"); // Import email service
const prisma = new client_1.PrismaClient();
// ===============================
// VALIDATION SCHEMAS
// ===============================
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address"),
    phone: zod_1.z.string().optional(),
    role: zod_1.z.nativeEnum(client_1.UserRole).optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address"),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, "Current password is required"),
    newPassword: zod_1.z.string().min(8, "New password must be at least 8 characters"),
});
exports.updateProfileSchema = zod_1.z.object({
    phone: zod_1.z.string().optional(),
    avatar: zod_1.z.string().url().optional(),
});
// ===============================
// AUTHENTICATION SERVICE CLASS
// ===============================
class AuthService {
    /**
     * The constructor function sets secure default values for JWT secrets and expiration times, with
     * warnings and validation for production environments.
     */
    constructor() {
        this.tempOTPStore = new Map(); // Temporary OTP storage for signups
        // FIXED: Use environment variables with secure defaults for development only
        this.JWT_SECRET =
            process.env.JWT_SECRET ||
                "mar-abu-projects-dev-secret-CHANGE-IN-PRODUCTION";
        this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
        this.JWT_REFRESH_SECRET =
            process.env.JWT_REFRESH_SECRET ||
                "mar-abu-projects-refresh-dev-secret-CHANGE-IN-PRODUCTION";
        this.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";
        // Warn in development if using default secrets
        if (process.env.NODE_ENV !== "production") {
            if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
                console.warn("⚠️  WARNING: Using default JWT secrets. Set JWT_SECRET and JWT_REFRESH_SECRET in .env file!");
            }
        }
        // Validate that secrets are provided in production
        if (process.env.NODE_ENV === "production") {
            if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
                throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be set in production");
            }
            if (process.env.JWT_SECRET.length < 32 ||
                process.env.JWT_REFRESH_SECRET.length < 32) {
                throw new Error("JWT secrets must be at least 32 characters long in production");
            }
        }
    }
    // ===============================
    // TEMPORARY OTP STORAGE (for signups)
    // ===============================
    setTempOTPData(email, otpData) {
        this.tempOTPStore.set(email.toLowerCase(), otpData);
    }
    getTempOTPData(email) {
        return this.tempOTPStore.get(email.toLowerCase());
    }
    deleteTempOTPData(email) {
        this.tempOTPStore.delete(email.toLowerCase());
    }
    // ===============================
    // PASSWORDLESS OTP METHODS
    // ===============================
    /**
     * Request OTP for signup or login
     */
    async requestOTP(email, purpose) {
        const { OTPService } = await Promise.resolve().then(() => __importStar(require('./otpservice')));
        try {
            // Check if user exists
            const existingUser = await prisma.user.findUnique({
                where: { email },
                select: {
                    id: true,
                    email: true,
                    otpCode: true,
                    otpExpiry: true,
                    otpAttempts: true,
                    otpLastSent: true,
                    status: true
                }
            });
            // For login, user must exist
            if (purpose === 'login' && !existingUser) {
                throw new Error('No account found with this email. Please sign up first.');
            }
            // For signup, user must not exist
            if (purpose === 'signup' && existingUser) {
                throw new Error('Account already exists with this email. Please log in instead.');
            }
            // Check cooldown period
            if (existingUser?.otpLastSent && !OTPService.canRequestNewOTP(existingUser.otpLastSent)) {
                const remainingSeconds = OTPService.getRemainingCooldown(existingUser.otpLastSent);
                throw new Error(`Please wait ${remainingSeconds} seconds before requesting a new code`);
            }
            // Check max attempts (reset after cooldown)
            if (existingUser && OTPService.hasExceededAttempts(existingUser.otpAttempts)) {
                // Reset attempts if cooldown has passed
                if (!existingUser.otpLastSent || OTPService.canRequestNewOTP(existingUser.otpLastSent)) {
                    await prisma.user.update({
                        where: { id: existingUser.id },
                        data: { otpAttempts: 0 }
                    });
                }
                else {
                    throw new Error('Too many failed attempts. Please wait before trying again.');
                }
            }
            // Generate new OTP
            const otpCode = OTPService.generateOTP();
            const otpExpiry = OTPService.generateOTPExpiry();
            // For login: update existing user
            if (purpose === 'login' && existingUser) {
                await prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        otpCode,
                        otpExpiry,
                        otpLastSent: new Date(),
                        otpAttempts: 0 // Reset attempts on new request
                    }
                });
            }
            // For signup: store OTP temporarily
            let userId = existingUser?.id;
            if (purpose === 'signup') {
                // Store OTP data temporarily - we'll use a simple in-memory store
                // In production, this could be Redis or a temporary database table
                this.setTempOTPData(email, {
                    otpCode,
                    otpExpiry,
                    otpLastSent: new Date(),
                    otpAttempts: 0
                });
            }
            // Send OTP email
            await emailservice_1.emailService.sendOTPEmail(email, otpCode, purpose);
            return {
                userId,
                message: 'Verification code sent to your email',
                expiresAt: otpExpiry
            };
        }
        catch (error) {
            console.error('RequestOTP error:', error);
            throw new Error(error.message || 'Failed to send verification code');
        }
    }
    /**
     * Verify OTP and authenticate user (signup or login)
     */
    async verifyOTP(email, otpCode, purpose) {
        const { OTPService } = await Promise.resolve().then(() => __importStar(require('./otpservice')));
        try {
            // Validate OTP format
            if (!OTPService.isValidOTPFormat(otpCode)) {
                throw new Error('Please enter a valid 6-digit code');
            }
            // For login: find existing user
            if (purpose === 'login') {
                const user = await prisma.user.findUnique({
                    where: { email }
                });
                if (!user) {
                    throw new Error('No account found with this email');
                }
                // Check if OTP exists and is valid
                if (!user.otpCode || !user.otpExpiry) {
                    throw new Error('No verification code found. Please request a new one');
                }
                // Check if OTP is expired
                if (OTPService.isOTPExpired(user.otpExpiry)) {
                    throw new Error('Verification code has expired. Please request a new one');
                }
                // Check max attempts
                if (OTPService.hasExceededAttempts(user.otpAttempts)) {
                    throw new Error('Too many failed attempts. Please request a new code');
                }
                // Verify OTP
                if (user.otpCode !== otpCode) {
                    // Increment failed attempts
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { otpAttempts: user.otpAttempts + 1 }
                    });
                    throw new Error('Invalid verification code');
                }
                // Clear OTP data and update last login
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        otpCode: null,
                        otpExpiry: null,
                        otpAttempts: 0,
                        otpLastSent: null,
                        lastLoginAt: new Date()
                    }
                });
                // Generate tokens
                const accessToken = this.generateAccessToken(user);
                const refreshToken = await this.generateRefreshToken(user.id);
                return {
                    user: this.sanitizeUser(user),
                    accessToken,
                    refreshToken,
                    isNewUser: false
                };
            }
            // For signup: validate OTP and create new user
            if (purpose === 'signup') {
                // Get temporary OTP data
                const tempOTPData = this.getTempOTPData(email);
                if (!tempOTPData || !tempOTPData.otpCode || !tempOTPData.otpExpiry) {
                    throw new Error('No verification code found. Please request a new one');
                }
                // Check if OTP is expired
                if (OTPService.isOTPExpired(tempOTPData.otpExpiry)) {
                    this.deleteTempOTPData(email);
                    throw new Error('Verification code has expired. Please request a new one');
                }
                // Check max attempts
                if (OTPService.hasExceededAttempts(tempOTPData.otpAttempts)) {
                    throw new Error('Too many failed attempts. Please request a new code');
                }
                // Verify OTP
                if (tempOTPData.otpCode !== otpCode) {
                    // Increment failed attempts
                    tempOTPData.otpAttempts = (tempOTPData.otpAttempts || 0) + 1;
                    this.setTempOTPData(email, tempOTPData);
                    throw new Error('Invalid verification code');
                }
                // Clear temporary OTP data
                this.deleteTempOTPData(email);
                // Create new user account
                const newUser = await prisma.user.create({
                    data: {
                        email,
                        role: client_1.UserRole.CUSTOMER,
                        status: client_1.UserStatus.ACTIVE,
                        emailVerified: new Date(),
                        lastLoginAt: new Date()
                    }
                });
                // Send welcome email
                await emailservice_1.emailService.sendWelcomeEmail(email);
                // Generate tokens
                const accessToken = this.generateAccessToken(newUser);
                const refreshToken = await this.generateRefreshToken(newUser.id);
                return {
                    user: this.sanitizeUser(newUser),
                    accessToken,
                    refreshToken,
                    isNewUser: true
                };
            }
            throw new Error('Invalid purpose specified');
        }
        catch (error) {
            console.error('VerifyOTP error:', error);
            throw new Error(error.message || 'Failed to verify code');
        }
    }
    /**
     * Register new user (DEPRECATED - Use OTP flow)
     */
    async register(userData, ipAddress, userAgent) {
        try {
            // Validate input
            const validatedData = exports.registerSchema.parse(userData);
            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: validatedData.email },
            });
            if (existingUser) {
                throw new Error("User already exists with this email");
            }
            // Hash password
            const hashedPassword = await "" /* password hash removed */;
            // Create user
            const user = await prisma.user.create({
                data: {
                    email: validatedData.email, phone: validatedData.phone,
                    role: validatedData.role || client_1.UserRole.CUSTOMER,
                    status: client_1.UserStatus.PENDING_VERIFICATION,
                },
                select: {
                    id: true,
                    email: true, role: true,
                    status: true,
                    emailVerified: true,
                },
            });
            // Generate verification token
            const verificationToken = crypto.randomBytes(32).toString("hex");
            // Store token and expiry in database
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    verificationToken, // 24 hours
                },
            });
            // Log audit
            await this.logAudit(user.id, "CREATE", "User", user.id, {
                ipAddress,
                userAgent,
                registrationTime: new Date(),
            });
            return { user, verificationToken };
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(", ")}`);
            }
            throw error;
        }
    }
    /**
     * Login user
     */
    async login(email, ipAddress, userAgent) {
        try {
            // Validate input
            const validatedCredentials = exports.loginSchema.parse({ email, password });
            // Find user
            const user = await prisma.user.findUnique({
                where: { email: validatedCredentials.email },
            });
            if (!user) {
                throw new Error("No user found");
            }
            // Check user status
            if (user.status === client_1.UserStatus.SUSPENDED) {
                throw new Error("Account suspended. Please contact support.");
            }
            // Verify password
            const isPasswordValid = await bcrypt.compare(
            /* validatedCredentials.password */ )
            /* validatedCredentials.password */ ;
            ;
            if (!isPasswordValid) {
                throw new Error("Invalid email or password");
            }
            // Update last login (only if lastLoginAt field exists)
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    lastLoginAt: new Date(),
                },
            });
            // Log audit
            await this.logAudit(user.id, "LOGIN", "User", user.id, {
                ipAddress,
                userAgent,
                loginTime: new Date(),
            });
            // Generate tokens
            const { ...userWithoutPassword } = user;
            return this.generateTokens(userWithoutPassword);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(", ")}`);
            }
            throw error;
        }
    }
    /**
     * Generate JWT tokens - FIXED with proper typing and conversion
     */
    /**
     * Generate access token for user
     */
    generateAccessToken(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };
        return jwt.sign(payload, this.JWT_SECRET, {
            expiresIn: this.JWT_EXPIRES_IN,
        });
    }
    /**
     * Generate refresh token for user
     */
    async generateRefreshToken(userId) {
        const payload = {
            userId,
            type: "refresh",
        };
        const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
            expiresIn: this.JWT_REFRESH_EXPIRES_IN,
        });
        // Store refresh token in database
        const tokenHash = this.hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await prisma.refreshToken.create({
            data: {
                tokenHash,
                userId,
                expiresAt,
            },
        });
        return refreshToken;
    }
    /**
     * Hash token for secure storage
     */
    hashToken(token) {
        return crypto.createHash("sha256").update(token).digest("hex");
    }
    async generateTokens(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };
        // FIXED: Ensure expiresIn is a string and use proper type casting
        const accessToken = jwt.sign(payload, this.JWT_SECRET, {
            expiresIn: String(this.JWT_EXPIRES_IN),
        });
        const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
            expiresIn: String(this.JWT_REFRESH_EXPIRES_IN),
        });
        return {
            accessToken,
            refreshToken,
            user,
        };
    }
    /**
     * Verify JWT token
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, this.JWT_SECRET);
        }
        catch (error) {
            throw new Error("Invalid or expired token");
        }
    }
    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        try {
            // Verify the refresh token using the refresh secret
            const payload = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET);
            // Get updated user data
            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: {
                    id: true,
                    email: true, role: true,
                    status: true,
                    emailVerified: true,
                },
            });
            if (!user) {
                throw new Error("User not found");
            }
            // Check if user account is active or allow pending verification
            if (user.status === client_1.UserStatus.SUSPENDED) {
                throw new Error("User account is suspended");
            }
            // Generate new tokens
            return await this.generateTokens(user);
        }
        catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new Error("Invalid refresh token");
            }
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error("Refresh token expired");
            }
            throw error;
        }
    }
    /**
     * Change user password with correct signature
     */
    async changePassword(userId, currentPassword, newPassword) {
        try {
            // Validate input using existing schema
            const validatedData = exports.changePasswordSchema.parse({
                currentPassword,
                newPassword,
            });
            // Get user
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, },
            });
            if (!user) {
                throw new Error("User not found");
            }
            // Verify current password
            const isCurrentPasswordValid = await bcrypt.compare(validatedData.currentPassword);
            if (!isCurrentPasswordValid) {
                throw new Error("Current password is incorrect");
            }
            // Hash new password
            const hashedNewPassword = await bcrypt.hash(validatedData.newPassword, 12);
            // Update password
            await prisma.user.update({
                where: { id: userId },
                data: {},
            });
            // Log audit
            await this.logAudit(userId, "UPDATE", "User", userId, {
                action: "Password changed",
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(", ")}`);
            }
            throw error;
        }
    }
    /**
     * Forgot password
     */
    async forgotPassword(email) {
        try {
            // Find user by email
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase().trim() },
            });
            if (!user)
                return;
            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString("hex");
            const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            // TODO: Uncomment after running database migration
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    resetToken,
                    resetTokenExpiry,
                },
            });
            // Send password reset email
            await emailservice_1.emailService.sendPasswordResetEmail(user.email, resetToken);
            // Log audit
            await this.logAudit(user.id, "UPDATE", "User", user.id, {
                action: "Password reset requested",
            });
            // For now, just log the reset token (remove in production)
            if (process.env.NODE_ENV !== "production") {
                console.log(`Reset token for ${email}: ${resetToken}`);
            }
        }
        catch (error) {
            console.error("Forgot password error:", error);
        }
    }
    /**
     * Reset password
     */
    async resetPassword(token, newPassword) {
        // TEMPORARY: For now, just validate the token format
        if (!token || token.length < 32) {
            throw new Error("Invalid reset token format");
        }
        // Validate new password
        if (!newPassword || newPassword.length < 8) {
            throw new Error("Password must be at least 8 characters long");
        }
        // Find user by reset token
        const user = await prisma.user.findFirst({
            where: { resetTokenExpiry: {
                    gt: new Date(),
                },
            },
        });
        if (!user) {
            throw new Error("Invalid or expired reset token");
        }
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        // Update password and clear reset token
        await prisma.user.update({
            where: { id: user.id },
            data: { resetTokenExpiry: null,
            },
        });
        // Log audit
        await this.logAudit(user.id, "UPDATE", "User", user.id, {
            action: "Password reset completed",
        });
        await emailservice_1.emailService.sendPasswordChangeNotification(user.email);
    }
    /**
     * Update user profile method
     */
    async updateProfile(userId, profileData) {
        try {
            // Validate input
            const validatedData = exports.updateProfileSchema.parse(profileData);
            // Get current user
            const currentUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true },
            });
            if (!currentUser) {
                throw new Error("User not found");
            }
            // Update user profile (skip fields that don't exist yet)
            const updateData = {};
            if (false /* field removed */)
                // assignment removed
                if (false /* field removed */) // assignment removed
                    if (validatedData.phone)
                        updateData.phone = validatedData.phone;
            if (validatedData.avatar)
                updateData.avatar = validatedData.avatar;
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: updateData,
                select: {
                    id: true,
                    email: true, role: true,
                    status: true,
                    emailVerified: true,
                    phone: true,
                    avatar: true,
                },
            });
            // Log audit
            await this.logAudit(userId, "UPDATE", "User", userId, {
                action: "Profile updated",
                changes: updateData,
            });
            return updatedUser;
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(", ")}`);
            }
            throw error;
        }
    }
    /**
     * Verify email
     */
    async verifyEmail(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                emailVerified: true, status: true,
            },
        });
        if (!user)
            throw new Error("User not found");
        if (user.emailVerified)
            return; // Already verified
        await prisma.user.update({
            where: { id: userId },
            data: {
                emailVerified: new Date(),
                status: client_1.UserStatus.ACTIVE,
            },
        });
        await this.logAudit(userId, "UPDATE", "User", userId, {
            action: "Email verified (authenticated route)",
        });
    }
    /**
     * Resend email verification
     */
    async resendVerification(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true, status: true,
                emailVerified: true,
            },
        });
        if (!user)
            throw new Error("User not found");
        if (user.emailVerified)
            throw new Error("Email already verified");
        // Reuse valid, unexpired token (optional) or always issue new
        let reuse = false;
        if (
        /* user.verificationToken */ 
            &&
                /* user.verificationToken */ Expiry &&
            /* user.verificationToken */ Expiry > new Date()) {
            reuse = true;
        }
        let verificationToken =  /* user.verificationToken */;
        let verificationTokenExpiry = /* user.verificationToken */ Expiry;
        if (!reuse) {
            verificationToken = crypto.randomBytes(32).toString("hex");
            verificationTokenExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1h
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    verificationToken,
                    verificationTokenExpiry,
                },
            });
        }
        await emailservice_1.emailService.sendEmailVerification(user.email, verificationToken);
        await this.logAudit(user.id, "UPDATE", "User", user.id, {
            action: "Verification email resent",
            reused: reuse,
        });
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const user = await prisma.user.findUnique({
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
     * Sanitize user data for API responses
     */
    sanitizeUser(user) {
        return {
            id: user.id,
            email: user.email, // No longer used in passwordless auth// No longer used in passwordless auth
            role: user.role,
            status: user.status,
            emailVerified: user.emailVerified,
        };
    }
    /**
     * Check if user has permission
     */
    hasPermission(userRole, requiredRole) {
        const roleHierarchy = {
            [client_1.UserRole.CUSTOMER]: 0,
            [client_1.UserRole.ADMIN]: 1,
        };
        return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
    }
    /**
     * Logout user
     */
    async logout(userId) {
        await this.logAudit(userId, "LOGOUT", "User", userId, {
            logoutTime: new Date(),
        });
    }
    /**
     * Log audit trail
     */
    async logAudit(userId, action, entity, entityId, changes) {
        try {
            await prisma.auditLog.create({
                data: {
                    userId,
                    action,
                    entity,
                    entityId,
                    changes: changes || {},
                },
            });
        }
        catch (error) {
            // Log error but don't throw to avoid disrupting main flow
            console.error("Failed to log audit:", error);
        }
    }
    /**
     * Token-based email verification
     */
    async verifyEmailByToken(token) {
        const user = await prisma.user.findFirst({
            where: {},
        }, select, {
            id: true,
            email: true,
        });
    }
    ;
    if(, user) {
        throw new Error("Invalid or expired verification token");
    }
}
exports.AuthService = AuthService;
await prisma.user.update({
    where: { id: user.id },
    data: {
        emailVerified: new Date(),
        status: client_1.UserStatus.ACTIVE,
    },
});
// Log audit if needed
await this.logAudit(user.id, "UPDATE", "User", user.id, {
    action: "Email verified by token",
});
return user;
/**
 * Issue a new refresh token for the user
 */
async;
issueRefreshToken(userId, string, expiresInMs, number = 7 * 24 * 60 * 60 * 1000);
Promise < string > {
    const: token = crypto.randomBytes(64).toString("hex"),
    const: tokenHash = crypto.createHash("sha256").update(token).digest("hex"),
    const: expiresAt = new Date(Date.now() + expiresInMs),
    await, prisma, : .refreshToken.create({
        data: {
            tokenHash,
            userId,
            expiresAt,
        },
    }),
    return: token
};
async;
getRefreshTokenOwner(token, string);
Promise < { userId: string, expiresAt: Date, revoked: boolean } | null > {
    const: tokenHash = crypto.createHash("sha256").update(token).digest("hex"),
    const: found = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        select: { userId: true, expiresAt: true, revoked: true },
    }),
    return: found ?? null
};
/**
 * Rotate refresh token
 */
async;
rotateRefreshToken(oldToken, string, userId, string);
Promise < string > {
    const: oldTokenHash = crypto
        .createHash("sha256")
        .update(oldToken)
        .digest("hex"),
    const: found = await prisma.refreshToken.findUnique({
        where: { tokenHash: oldTokenHash },
    }),
    if(, found) { }
} ||
    found.revoked ||
    found.expiresAt < new Date() ||
    found.userId !== userId;
{
    throw new Error("Invalid or expired refresh token");
}
// Revoke old token
await prisma.refreshToken.update({
    where: { tokenHash: oldTokenHash },
    data: { revoked: true },
});
// Issue new token
return await this.issueRefreshToken(userId);
issueAccessToken(user, AuthUser);
string;
{
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };
    return jwt.sign(payload, this.JWT_SECRET, {
        expiresIn: String(this.JWT_EXPIRES_IN),
    });
}
// ===============================
// MIDDLEWARE FUNCTIONS
// ===============================
exports.authService = new AuthService();
/**
 * Authentication middleware
 */
function requireAuth(options) {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({
                    success: false,
                    message: "Access token required",
                });
            }
            const token = authHeader.substring(7);
            // Blacklist check
            if (await isTokenBlacklisted(token)) {
                return res.status(401).json({
                    success: false,
                    message: "Token is blacklisted",
                });
            }
            const payload = exports.authService.verifyToken(token);
            // Get user data
            const user = await exports.authService.getUserById(payload.userId);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "User not found",
                });
            }
            // Check role permission if required
            const allowedStatuses = [client_1.UserStatus.ACTIVE];
            if (options?.allowPending) {
                allowedStatuses.push(client_1.UserStatus.PENDING_VERIFICATION);
            }
            if (options?.role &&
                !exports.authService.hasPermission(user.role, options.role)) {
                return res.status(403).json({
                    success: false,
                    message: "Unauthorized permissions",
                });
            }
            req.user = user;
            next();
        }
        catch (error) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token",
            });
        }
    };
}
/**
 * Optional authentication middleware
 */
function optionalAuth() {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                const token = authHeader.substring(7);
                const payload = exports.authService.verifyToken(token);
                const user = await exports.authService.getUserById(payload.userId);
                if (user && user.status === client_1.UserStatus.ACTIVE) {
                    req.user = user;
                }
            }
            next();
        }
        catch (error) {
            // Continue without authentication
            next();
        }
    };
}
// Hash a token for secure storage
function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}
// Add token to blacklist
async function blacklistToken(token, expiresAt, userId) {
    const tokenHash = hashToken(token);
    await prisma.blacklistedToken.create({
        data: {
            tokenHash,
            expiresAt,
            userId,
        },
    });
}
// Check if token is blacklisted
async function isTokenBlacklisted(token) {
    const tokenHash = hashToken(token);
    const found = await prisma.blacklistedToken.findUnique({
        where: { tokenHash },
    });
    return !!found;
}
