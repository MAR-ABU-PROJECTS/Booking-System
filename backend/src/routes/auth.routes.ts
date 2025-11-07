import { UserStatus } from "@prisma/client";
// MAR ABU PROJECTS SERVICES LLC - Passwordless Authentication Routes
import { Router } from "express";
import { body, validationResult } from "express-validator";
import {
  authService,
  requireAuth,
  blacklistToken,
} from "../services/authservice";
import { asyncHandler } from "../middlewares/error.middleware";
import { AppError } from "../middlewares/error.middleware";
import { auditLog } from "../middlewares/logger.middleware";
import { emailService } from "../services/emailservice";
import { OTPService } from "../services/otpservice";
import { fileService } from "../services/fileservice";
import { prisma } from "../server";
import * as jwt from "jsonwebtoken";

const router = Router();

// Validation middleware
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// ===============================
// AUTHENTICATION ROUTES
// ===============================

/**
 * @route   POST /api/v1/auth/request-otp
 * @desc    Request OTP for signup or login
 * @access  Public
 */
/**
 * @swagger
 * /auth/request-otp:
 *   post:
 *     summary: Request OTP for signup or login
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: query
 *         name: interface
 *         schema:
 *           type: string
 *           enum: [admin, customer]
 *         description: Interface type (optional for login, used for validation)
 *         example: customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - purpose
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               purpose:
 *                 type: string
 *                 enum: [signup, login]
 *                 example: login
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Verification code sent to your email
 *                 data:
 *                   type: object
 *                   properties:
 *                     expiresIn:
 *                       type: number
 *                       example: 600
 *                     cooldownSeconds:
 *                       type: number
 *                       example: 300
 *       400:
 *         description: Validation errors or email not found (for login)
 *       429:
 *         description: Too many attempts or in cooldown period
 *       500:
 *         description: Server error
 */
router.post(
  "/request-otp",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("purpose")
      .isIn(["signup", "login"])
      .withMessage("Purpose must be 'signup' or 'login'"),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { email, purpose } = req.body;

    const result = await authService.requestOTP(email, purpose);

    auditLog(
      "OTP_REQUESTED",
      email || "anonymous",
      {
        purpose,
        ip: req.ip,
      },
      req.ip
    );

    res.json({
      success: true,
      message: "Verification code sent to your email",
      data: {
        expiresIn: OTPService.CONSTANTS.EXPIRY_MINUTES * 60,
        cooldownSeconds: OTPService.CONSTANTS.COOLDOWN_MINUTES * 60,
      },
    });
  })
);

/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Verify OTP and authenticate user (signup or login)
 * @access  Public
 */
/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP and authenticate user
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: query
 *         name: interface
 *         schema:
 *           type: string
 *           enum: [admin, customer]
 *         description: Interface type for role-based signup (required for signup)
 *         example: customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otpCode
 *               - purpose
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               otpCode:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 example: "123456"
 *               purpose:
 *                 type: string
 *                 enum: [signup, login]
 *                 example: login
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     isNewUser:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Invalid OTP or validation error
 *       429:
 *         description: Too many failed attempts
 *       500:
 *         description: Server error
 */
router.post(
  "/verify-otp",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("otpCode")
      .matches(/^\d{6}$/)
      .withMessage("OTP must be 6 digits"),
    body("purpose")
      .isIn(["signup", "login"])
      .withMessage("Purpose must be 'signup' or 'login'"),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { email, otpCode, purpose } = req.body;

    // Get the interface type from the request headers or query
    const interfaceType =
      req.query.interface || req.headers["x-interface-type"];

    // Validate interface type
    if (interfaceType && !["admin", "customer"].includes(interfaceType)) {
      throw new AppError(
        "Invalid interface type. Must be 'admin' or 'customer'",
        400,
        "INVALID_INTERFACE_TYPE"
      );
    }

    // For signup, interface type is required
    if (purpose === "signup" && !interfaceType) {
      throw new AppError(
        "Interface type is required for signup. Please specify 'admin' or 'customer'",
        400,
        "INTERFACE_TYPE_REQUIRED"
      );
    }

    const result = await authService.verifyOTP(
      email,
      otpCode,
      purpose,
      interfaceType as "admin" | "customer"
    );

    // Check if the user's role matches the interface they're trying to access
    if (interfaceType === "admin" && result.user.role !== "ADMIN") {
      throw new AppError(
        `Access denied. This account (${result.user.email}) is registered as a customer, not an administrator. Please use the customer login interface instead.`,
        403,
        "ROLE_MISMATCH"
      );
    }

    if (interfaceType === "customer" && result.user.role !== "CUSTOMER") {
      throw new AppError(
        `Access denied. This account (${result.user.email}) is registered as an administrator, not a customer. Please use the admin login interface instead.`,
        403,
        "ROLE_MISMATCH"
      );
    }

    auditLog(
      result.isNewUser ? "USER_REGISTERED" : "USER_LOGIN",
      result.user.email,
      {
        role: result.user.role,
        interfaceType,
        authMethod: "OTP",
      },
      req.ip
    );

    res.json({
      success: true,
      message: result.isNewUser
        ? "Account created successfully"
        : "Login successful",
      data: result,
    });
  })
);

/**
 * @route   POST /api/v1/auth/upload-id
 * @desc    Upload ID document for verification (REQUIRED for new registrations)
 * @access  Authenticated
 */
/**
 * @swagger
 * /auth/upload-id:
 *   post:
 *     summary: Upload ID document for KYC verification
 *     description: Upload a valid government-issued ID document (front and optionally back). REQUIRED for all new user registrations.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - idType
 *               - idNumber
 *               - idDocumentFront
 *             properties:
 *               idType:
 *                 type: string
 *                 enum: [passport, drivers_license, national_id, voters_card]
 *                 description: Type of ID document
 *               idNumber:
 *                 type: string
 *                 description: ID document number
 *               idDocumentFront:
 *                 type: string
 *                 format: binary
 *                 description: Front side of ID document (required)
 *               idDocumentBack:
 *                 type: string
 *                 format: binary
 *                 description: Back side of ID document (optional for passport)
 *     responses:
 *       200:
 *         description: ID document uploaded successfully
 *       400:
 *         description: Invalid file or missing required fields
 *       401:
 *         description: Unauthorized - authentication required
 */
router.post(
  "/upload-id",
  requireAuth(),
  fileService.idDocumentUploader().fields([
    { name: "idDocumentFront", maxCount: 1 },
    { name: "idDocumentBack", maxCount: 1 },
  ]),
  [
    body("idType")
      .isIn(["passport", "drivers_license", "national_id", "voters_card"])
      .withMessage(
        "ID type must be one of: passport, drivers_license, national_id, voters_card"
      ),
    body("idNumber")
      .trim()
      .notEmpty()
      .withMessage("ID number is required")
      .isLength({ min: 5, max: 50 })
      .withMessage("ID number must be between 5 and 50 characters"),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { idType, idNumber } = req.body;
    const files = req.files as {
      idDocumentFront?: Express.Multer.File[];
      idDocumentBack?: Express.Multer.File[];
    };

    // Validate that front ID is uploaded
    if (!files?.idDocumentFront || files.idDocumentFront.length === 0) {
      throw new AppError(
        "Front side of ID document is required",
        400,
        "ID_FRONT_REQUIRED"
      );
    }

    // For non-passport IDs, back side is recommended but not strictly required
    // You can make it required by uncommenting:
    // if (idType !== 'passport' && (!files?.idDocumentBack || files.idDocumentBack.length === 0)) {
    //   throw new AppError('Back side of ID document is required for this ID type', 400, 'ID_BACK_REQUIRED');
    // }

    const idDocumentFront = files.idDocumentFront[0];
    const idDocumentBack = files.idDocumentBack?.[0];

    // Generate public URLs
    const baseUrl = process.env.BASE_URL || "http://localhost:5000";
    const frontUrl = `${baseUrl}/uploads/${idDocumentFront.filename}`;
    const backUrl = idDocumentBack
      ? `${baseUrl}/uploads/${idDocumentBack.filename}`
      : null;

    // Update user with ID information and automatically verify
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        idType,
        idNumber,
        idDocumentFront: frontUrl,
        idDocumentBack: backUrl,
        identityVerified: new Date(), // Automatically verified upon upload
      },
      select: {
        id: true,
        email: true,
        idType: true,
        idNumber: true,
        idDocumentFront: true,
        idDocumentBack: true,
        identityVerified: true,
      },
    });

    await auditLog(
      "ID_DOCUMENT_UPLOADED",
      req.user.email,
      {
        idType,
        userId: req.user.userId,
      },
      req.ip
    );

    res.json({
      success: true,
      message:
        "ID document uploaded successfully. Your identity has been verified.",
      data: {
        idType: updatedUser.idType,
        identityVerified: updatedUser.identityVerified,
        uploadedAt: new Date(),
      },
    });
  })
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Token refreshed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid or expired refresh token
 *       500:
 *         description: Server error
 */
router.post(
  "/refresh",
  [body("refreshToken").notEmpty().withMessage("Refresh token required")],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { refreshToken } = req.body;

    // Remove the try-catch wrapper and let authService.refreshToken handle the verification
    const result = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: result,
    });
  })
);

/**
 * @route   GET /api/v1/auth/verify-email/:token
 * @desc    Verify email address using verification token
 * @access  Public
 */
/**
 * @swagger
 * /auth/verify-email/{token}:
 *   get:
 *     summary: Verify a user's email using the verification token
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token sent to the user's email
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Email verified successfully. You can now log in.
 *       400:
 *         description: Invalid or expired verification token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid or expired verification token
 *       500:
 *         description: Internal server error
 */
// Original route with :token parameter
router.get(
  "/verify-email/:token",
  asyncHandler(async (req: any, res: any) => {
    const { token } = req.params;
    try {
      const user = await authService.verifyEmailByToken(token);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired verification token",
          errors: null,
        });
      }
      await emailService.sendWelcomeEmail(user.email);
      return res.json({
        success: true,
        message: "Email verified successfully. You can now log in.",
      });
    } catch (error: any) {
      console.error("Email verification error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
        errors: null,
      });
    }
  })
);

/**
 * @route   POST /api/v1/auth/verify-email/resend
 * @desc    Resend verification email (if not yet verified)
 * @access  Protected
 */
/**
 * @swagger
 * /auth/verify-email/resend:
 *   post:
 *     summary: Resend verification email
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification email (re)sent
 *       400:
 *         description: Email already verified
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/verify-email/resend",
  requireAuth({ allowPending: true }),
  asyncHandler(async (req: any, res: any) => {
    try {
      await authService.resendVerification(req.user.id);
      return res.json({ success: true, message: "Verification email sent" });
    } catch (e: any) {
      if (e.message === "Email already verified") {
        return res.status(400).json({ success: false, message: e.message });
      }
      throw e;
    }
  })
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Protected
 */
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Server error
 */

router.post(
  "/logout",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res
        .status(400)
        .json({ success: false, message: "No token provided" });

    // Decode token to get expiry (or use JWT library)
    const payload: any = jwt.decode(token);
    const expiresAt = payload?.exp
      ? new Date(payload.exp * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    await blacklistToken(token);

    res.json({ success: true, message: "Logged out and token blacklisted" });
  })
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Protected
 */
/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "clw83sk7g0000uw6b4xrp6y3d"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       example: "john@example.com"
 *                     role:
 *                       type: string
 *                       example: "USER"
 *       401:
 *         description: Unauthorized - token missing or invalid
 *       500:
 *         description: Server error
 */

router.get(
  "/me",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    res.json({
      success: true,
      data: req.user,
    });
  })
);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Protected
 */
/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               phone:
 *                 type: string
 *                 example: "+2348012345678"
 *               avatar:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/avatar.jpg"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "clw83sk7g0000uw6b4xrp6y3d"
 *                     firstName:
 *                       type: string
 *                       example: "John"
 *                     lastName:
 *                       type: string
 *                       example: "Doe"
 *                     phone:
 *                       type: string
 *                       example: "+2348012345678"
 *                     avatar:
 *                       type: string
 *                       example: "https://example.com/avatar.jpg"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

router.put(
  "/profile",
  requireAuth(),
  [
    body("firstName")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("First name required"),
    body("lastName")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Last name required"),
    body("phone")
      .optional()
      .isMobilePhone("any")
      .withMessage("Valid phone number required"),
    body("avatar").optional().isURL().withMessage("Valid avatar URL required"),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const updatedUser = await authService.updateProfile(req.user.id, req.body);

    auditLog(
      "PROFILE_UPDATED",
      req.user.email,
      {
        changes: req.body,
      },
      req.ip
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  })
);

/**
 * @route   POST /api/v1/auth/test-email
 * @desc    Send test email
 * @access  Public
 */
/**
 * @swagger
 * /auth/test-email:
 *   post:
 *     summary: Send a test email
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Test email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Test email sent successfully!
 *       400:
 *         description: Invalid email
 *       500:
 *         description: Server error
 */

router.post(
  "/test-email",
  asyncHandler(async (req: any, res: any) => {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }
    const success = await emailService.sendTestEmail(email, {
      recipientName: "Test User",
      systemName: "Booking System",
    });
    if (success) {
      return res.json({
        success: true,
        message: "Test email sent successfully!",
      });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Failed to send test email." });
    }
  })
);

router.post(
  "/refresh-token",
  asyncHandler(async (req: any, res: any) => {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res
        .status(400)
        .json({ success: false, message: "Refresh token required" });

    // Decode refresh token to get userId
    const payload: any = jwt.decode(refreshToken);
    const userId = payload?.userId;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });

    const user = await authService.getUserById(userId);
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });

    try {
      const newRefreshToken =
        await authService.rotateRefreshToken(refreshToken);
      const newAccessToken = authService.issueAccessToken(user);

      res.json({
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token" });
    }
  })
);

export default router;
