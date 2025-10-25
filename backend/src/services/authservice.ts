import * as z from "zod";
import { UserRole, UserStatus } from "@prisma/client";
import prisma from "../config/database";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { emailService } from "./emailservice";

// ===============================
// TYPES
// ===============================
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: Date | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp: number; // JWT expiration timestamp
}

// ===============================
// VALIDATION SCHEMAS
// ===============================
export const otpRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  purpose: z.enum(["signup", "login"], {
    errorMap: () => ({ message: "Purpose must be either 'signup' or 'login'" }),
  }),
});

export const otpVerifySchema = z.object({
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
export class AuthService {
  private JWT_SECRET: string;
  private JWT_REFRESH_SECRET: string;
  private tempOTPStorage = new Map<string, any>();

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || "default-secret";
    this.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET || "default-refresh-secret";
  }

  /**
   * Store temporary OTP data for signups
   */
  private setTempOTPData(email: string, otpData: any) {
    this.tempOTPStorage.set(email, otpData);
    // Auto-cleanup after 10 minutes
    setTimeout(
      () => {
        this.tempOTPStorage.delete(email);
      },
      10 * 60 * 1000
    );
  }

  /**
   * Get temporary OTP data for signups
   */
  private getTempOTPData(email: string) {
    return this.tempOTPStorage.get(email);
  }

  /**
   * Request OTP for signup or login
   */
  async requestOTP(
    email: string,
    purpose: "signup" | "login"
  ): Promise<{
    userId?: string;
    message: string;
    expiresAt: Date;
  }> {
    const { OTPService } = await import("./otpservice");

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
          status: true,
        },
      });

      // For login, user must exist
      if (purpose === "login" && !existingUser) {
        throw new Error(
          "No account found with this email. Please sign up first."
        );
      }

      // For signup, user must not exist
      if (purpose === "signup" && existingUser) {
        throw new Error(
          "Account already exists with this email. Please log in instead."
        );
      }

      // Check cooldown period
      if (
        existingUser?.otpLastSent &&
        !OTPService.canRequestNewOTP(existingUser.otpLastSent)
      ) {
        const remainingSeconds = OTPService.getRemainingCooldown(
          existingUser.otpLastSent
        );
        throw new Error(
          `Please wait ${remainingSeconds} seconds before requesting a new code`
        );
      }

      // Check max attempts (reset after cooldown)
      if (
        existingUser &&
        OTPService.hasExceededAttempts(existingUser.otpAttempts)
      ) {
        // Reset attempts if cooldown has passed
        if (
          !existingUser.otpLastSent ||
          OTPService.canRequestNewOTP(existingUser.otpLastSent)
        ) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { otpAttempts: 0 },
          });
        } else {
          throw new Error(
            "Too many failed attempts. Please wait before trying again."
          );
        }
      }

      // Generate new OTP
      const otpCode = OTPService.generateOTP();
      const otpExpiry = OTPService.generateOTPExpiry();

      // For login: update existing user
      if (purpose === "login" && existingUser) {
        await prisma.user.update({
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
      await emailService.sendOTPEmail(email, otpCode, purpose);

      return {
        userId,
        message: "Verification code sent to your email",
        expiresAt: otpExpiry,
      };
    } catch (error: any) {
      console.error("RequestOTP error:", error);
      throw new Error(error.message || "Failed to send verification code");
    }
  }

  /**
   * Verify OTP and authenticate user (signup or login)
   */
  async verifyOTP(
    email: string,
    otpCode: string,
    purpose: "signup" | "login"
  ): Promise<{
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
  }> {
    const { OTPService } = await import("./otpservice");

    try {
      let user;
      let otpData;

      if (purpose === "login") {
        // For login: get user from database
        user = await prisma.user.findUnique({
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
      } else {
        // For signup: get OTP from temporary storage
        otpData = this.getTempOTPData(email);

        if (!otpData) {
          throw new Error(
            "OTP expired or not found. Please request a new code."
          );
        }
      }

      // Validate OTP
      const isValidOTP = OTPService.validateOTP(
        otpCode,
        otpData.otpCode,
        otpData.otpExpiry
      );

      if (!isValidOTP) {
        // Increment attempts for existing users
        if (purpose === "login" && user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { otpAttempts: (otpData.otpAttempts || 0) + 1 },
          });
        } else if (purpose === "signup") {
          // Increment attempts in temporary storage
          otpData.otpAttempts = (otpData.otpAttempts || 0) + 1;
          this.setTempOTPData(email, otpData);
        }

        throw new Error("Invalid or expired verification code");
      }

      // Handle signup: create new user
      if (purpose === "signup") {
        user = await prisma.user.create({
          data: {
            email,
            role: UserRole.CUSTOMER,
            status: UserStatus.ACTIVE,
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
      } else {
        // Handle login: clear OTP fields and mark as verified
        if (!user) {
          throw new Error("User not found for login");
        }

        user = await prisma.user.update({
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
      const authUser: AuthUser = {
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
    } catch (error: any) {
      console.error("VerifyOTP error:", error);
      throw new Error(error.message || "Failed to verify OTP");
    }
  }

  /**
   * Generate JWT access and refresh tokens
   */
  public generateTokens(user: AuthUser): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload: JWTPayload = {
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
  public verifyToken(token: string, isRefreshToken = false): JWTPayload {
    const secret = isRefreshToken ? this.JWT_REFRESH_SECRET : this.JWT_SECRET;
    return jwt.verify(token, secret) as JWTPayload;
  }

  /**
   * Get user by ID (for middleware)
   */
  public async getUserById(userId: string): Promise<AuthUser | null> {
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
   * Refresh access token using refresh token
   */
  public async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  }> {
    try {
      const decoded = this.verifyToken(refreshToken, true);
      const user = await this.getUserById(decoded.userId);

      if (!user) {
        throw new Error("User not found");
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw new Error("Account is not active");
      }

      const tokens = this.generateTokens(user);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
      };
    } catch (error: any) {
      throw new Error("Invalid refresh token");
    }
  }

  /**
   * Verify email by token (placeholder for email verification)
   */
  public async verifyEmailByToken(token: string): Promise<AuthUser> {
    // This would typically verify an email verification token
    // For now, we'll just decode it as a JWT
    try {
      const decoded = this.verifyToken(token);
      const user = await this.getUserById(decoded.userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Update user as email verified
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });

      return { ...user, emailVerified: new Date() };
    } catch (error: any) {
      throw new Error("Invalid verification token");
    }
  }

  /**
   * Resend verification email
   */
  public async resendVerification(userId: string): Promise<void> {
    const user = await this.getUserById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.emailVerified) {
      throw new Error("Email is already verified");
    }

    // Generate verification token and send email
    const verificationToken = this.generateTokens(user).accessToken;
    await emailService.sendEmailVerification(user.email, verificationToken);
  }

  /**
   * Initiate forgot password process
   */
  public async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
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
    await emailService.sendPasswordResetEmail(email, resetToken);
  }

  /**
   * Update user profile
   */
  public async updateProfile(
    userId: string,
    updateData: any
  ): Promise<AuthUser> {
    const user = await prisma.user.update({
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
  public async rotateRefreshToken(oldRefreshToken: string): Promise<string> {
    try {
      const decoded = this.verifyToken(oldRefreshToken, true);
      const user = await this.getUserById(decoded.userId);

      if (!user) {
        throw new Error("User not found");
      }

      const tokens = this.generateTokens(user);
      return tokens.refreshToken;
    } catch (error: any) {
      throw new Error("Invalid refresh token");
    }
  }

  /**
   * Issue new access token
   */
  public issueAccessToken(user: AuthUser): string {
    const tokens = this.generateTokens(user);
    return tokens.accessToken;
  }

  /**
   * Blacklist token (placeholder - in production use Redis or database)
   */
  public async blacklistToken(token: string): Promise<void> {
    try {
      const payload = this.verifyToken(token);
      const expiresAt = new Date(payload.exp * 1000);
      const tokenHash = hashToken(token);

      await prisma.blacklistedToken.create({
        data: {
          tokenHash,
          expiresAt,
          userId: payload.userId,
        },
      });

      console.log(`Token blacklisted: ${token.substring(0, 20)}...`);
    } catch (error) {
      console.error("Error blacklisting token:", error);
      throw new Error("Failed to blacklist token");
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export blacklistToken function for compatibility
export const blacklistToken = (token: string) =>
  authService.blacklistToken(token);

// Check if token is blacklisted
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const tokenHash = hashToken(token);
    const blacklistedToken = await prisma.blacklistedToken.findUnique({
      where: { tokenHash },
    });
    return !!blacklistedToken;
  } catch (error) {
    console.error("Error checking blacklisted token:", error);
    return false;
  }
};

// Hash a token for secure storage
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ===============================
// MIDDLEWARE FUNCTIONS
// ===============================
import { Request, Response, NextFunction } from "express";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware to require authentication with optional role check
 */
export const requireAuth = (options?: {
  role?: UserRole;
  allowPending?: boolean;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Access token required",
        });
      }

      // Check if token is blacklisted
      if (await isTokenBlacklisted(token)) {
        return res.status(401).json({
          success: false,
          message: "Token is blacklisted",
        });
      }

      const decoded = authService.verifyToken(token);
      const user = await authService.getUserById(decoded.userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
        });
      }

      if (user.status !== UserStatus.ACTIVE && !options?.allowPending) {
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
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
  };
};

/**
 * Middleware for optional authentication
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      const decoded = authService.verifyToken(token);
      const user = await authService.getUserById(decoded.userId);
      req.user = user || undefined;
    }

    next();
  } catch (error) {
    // For optional auth, continue without user if token is invalid
    next();
  }
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = requireAuth({ role: UserRole.ADMIN });
