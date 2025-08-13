"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = exports.updateProfileSchema = exports.changePasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
// MAR ABU PROJECTS SERVICES LLC - Authentication Service (FULLY FIXED)
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const zod_1 = require("zod");
const emailservice_1 = require("./emailservice"); // Import email service
const prisma = new client_1.PrismaClient();
// ===============================
// VALIDATION SCHEMAS
// ===============================
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address"),
    firstName: zod_1.z.string().min(2, "First name must be at least 2 characters"),
    lastName: zod_1.z.string().min(2, "Last name must be at least 2 characters"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters"),
    phone: zod_1.z.string().optional(),
    role: zod_1.z.nativeEnum(client_1.UserRole).optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address"),
    password: zod_1.z.string().min(1, "Password is required"),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, "Current password is required"),
    newPassword: zod_1.z.string().min(8, "New password must be at least 8 characters"),
});
exports.updateProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(2).optional(),
    lastName: zod_1.z.string().min(2).optional(),
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
    /**
     * Register new user
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
            const hashedPassword = await bcryptjs_1.default.hash(validatedData.password, 12);
            // Create user
            const user = await prisma.user.create({
                data: {
                    email: validatedData.email,
                    firstName: validatedData.firstName,
                    lastName: validatedData.lastName,
                    password: hashedPassword,
                    phone: validatedData.phone,
                    role: validatedData.role || client_1.UserRole.CUSTOMER,
                    status: client_1.UserStatus.PENDING_VERIFICATION,
                },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    status: true,
                    emailVerified: true,
                },
            });
            // Generate verification token
            const verificationToken = crypto_1.default.randomBytes(32).toString("hex");
            // Store token and expiry in database
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    verificationToken,
                    verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
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
    async login(email, password, ipAddress, userAgent) {
        try {
            // Validate input
            const validatedCredentials = exports.loginSchema.parse({ email, password });
            // Find user
            const user = await prisma.user.findUnique({
                where: { email: validatedCredentials.email },
            });
            if (!user) {
                throw new Error("Invalid email or password");
            }
            // Check user status
            if (user.status === client_1.UserStatus.SUSPENDED) {
                throw new Error("Account suspended. Please contact support.");
            }
            // Verify password
            const isPasswordValid = await bcryptjs_1.default.compare(validatedCredentials.password, user.password);
            if (!isPasswordValid) {
                throw new Error("Invalid email or password");
            }
            // Update last login (only if lastLoginAt field exists)
            try {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        lastLoginAt: new Date(), // Commented out until DB migration
                    },
                });
            }
            catch (updateError) {
                // Continue if lastLoginAt field doesn't exist yet
                console.log("Note: lastLoginAt field not found in database");
            }
            // Log audit
            await this.logAudit(user.id, "LOGIN", "User", user.id, {
                ipAddress,
                userAgent,
                loginTime: new Date(),
            });
            // Generate tokens
            const { password: _, ...userWithoutPassword } = user;
            const tokens = await this.generateTokens(userWithoutPassword);
            return tokens;
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
    async generateTokens(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };
        // FIXED: Ensure expiresIn is a string and use proper type casting
        const accessToken = jsonwebtoken_1.default.sign(payload, this.JWT_SECRET, {
            expiresIn: String(this.JWT_EXPIRES_IN),
        });
        const refreshToken = jsonwebtoken_1.default.sign(payload, this.JWT_REFRESH_SECRET, {
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
            return jsonwebtoken_1.default.verify(token, this.JWT_SECRET);
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
            const payload = jsonwebtoken_1.default.verify(refreshToken, this.JWT_REFRESH_SECRET);
            // Get updated user data
            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
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
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new Error("Invalid refresh token");
            }
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
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
                select: { id: true, password: true },
            });
            if (!user) {
                throw new Error("User not found");
            }
            // Verify current password
            const isCurrentPasswordValid = await bcryptjs_1.default.compare(validatedData.currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                throw new Error("Current password is incorrect");
            }
            // Hash new password
            const hashedNewPassword = await bcryptjs_1.default.hash(validatedData.newPassword, 12);
            // Update password
            await prisma.user.update({
                where: { id: userId },
                data: { password: hashedNewPassword },
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
     * Forgot password method - TEMPORARILY DISABLED until DB migration
     */
    async forgotPassword(email) {
        try {
            // Find user by email
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase().trim() },
            });
            if (!user) {
                // Don't reveal if email exists for security reasons
                return;
            }
            // Generate reset token
            const resetToken = crypto_1.default.randomBytes(32).toString("hex");
            const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            // TEMPORARY: Skip database update until migration is complete
            console.log(`Password reset requested for ${email}. Token: ${resetToken}`);
            console.log("Note: Database update skipped until migration is complete");
            // TODO: Uncomment after running database migration
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    resetToken,
                    resetTokenExpiry,
                },
            });
            // Send password reset email
            await emailservice_1.emailService.sendPasswordResetEmail(email, resetToken);
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
     * Reset password method - TEMPORARILY DISABLED until DB migration
     */
    async resetPassword(token, newPassword) {
        try {
            // Validate new password
            if (!newPassword || newPassword.length < 8) {
                throw new Error("Password must be at least 8 characters long");
            }
            // TEMPORARY: For now, just validate the token format
            if (!token || token.length < 32) {
                throw new Error("Invalid reset token format");
            }
            console.log("Password reset attempted with token:", token);
            console.log("Note: Database lookup skipped until migration is complete");
            // TODO: Uncomment after running database migration
            // Find user by reset token
            const user = await prisma.user.findFirst({
                where: {
                    resetToken: token,
                    resetTokenExpiry: {
                        gt: new Date(), // Token must not be expired
                    },
                },
            });
            if (!user) {
                throw new Error("Invalid or expired reset token");
            }
            // Hash new password
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
            // Update password and clear reset token
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    resetToken: null,
                    resetTokenExpiry: null,
                },
            });
            // Log audit
            await this.logAudit(user.id, "UPDATE", "User", user.id, {
                action: "Password reset completed",
            });
            throw new Error("Password reset temporarily disabled until database migration is complete");
        }
        catch (error) {
            throw error;
        }
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
            if (validatedData.firstName)
                updateData.firstName = validatedData.firstName;
            if (validatedData.lastName)
                updateData.lastName = validatedData.lastName;
            if (validatedData.phone)
                updateData.phone = validatedData.phone;
            // Skip avatar until DB migration: if (validatedData.avatar) updateData.avatar = validatedData.avatar
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: updateData,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    status: true,
                    emailVerified: true,
                    phone: true,
                    // avatar: true, // Skip until DB migration
                },
            });
            // Log audit
            await this.logAudit(userId, "UPDATE", "User", userId, {
                action: "Profile updated",
                changes: validatedData,
            });
            return updatedUser;
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(", ")}`);
            }
            console.error("Update profile error:", error);
            throw error;
        }
    }
    /**
     * Verify email
     */
    async verifyEmail(userId) {
        try {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    emailVerified: new Date(),
                    status: client_1.UserStatus.ACTIVE,
                },
            });
            await this.logAudit(userId, "UPDATE", "User", userId, {
                action: "Email verified",
            });
        }
        catch (error) {
            console.error("Verify email error:", error);
            throw error;
        }
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
                firstName: true,
                lastName: true,
                role: true,
                status: true,
                emailVerified: true,
            },
        });
        return user;
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
            where: {
                verificationToken: token,
                verificationTokenExpiry: { gt: new Date() },
            },
        });
        if (!user) {
            throw new Error("Invalid or expired verification token");
        }
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: new Date(),
                status: client_1.UserStatus.ACTIVE,
                verificationToken: null,
                verificationTokenExpiry: null,
            },
        });
        // Log audit if needed
        await this.logAudit(user.id, "UPDATE", "User", user.id, {
            action: "Email verified by token",
        });
    }
}
exports.AuthService = AuthService;
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
