import { UserStatus } from "@prisma/client";
// MAR ABU PROJECTS SERVICES LLC - Authentication Routes
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
import jwt from "jsonwebtoken";

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
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
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
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: Passw0rd!
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               role:
 *                 type: string
 *                 enum: [CUSTOMER, ADMIN]
 *                 example: CUSTOMER
 *     responses:
 *       201:
 *         description: Registration successful
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
 *                   example: Registration successful. Please check your email to verify your account.
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
 *       400:
 *         description: Validation errors
 *       500:
 *         description: Server error
 */
router.post(
  "/register",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        "Password must contain uppercase, lowercase, number and special character"
      ),
    body("firstName").trim().notEmpty().withMessage("First name required"),
    body("lastName").trim().notEmpty().withMessage("Last name required"),
    body("phone")
      .optional()
      .isMobilePhone("any")
      .withMessage("Valid phone number required"),
    body("role")
      .optional()
      .isIn(["CUSTOMER", "ADMIN"])
      .withMessage("Invalid role"),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const result = await authService.register(req.body);

    // Send verification email
    await emailService.sendEmailVerification(
      result.user.email,
      result.verificationToken
    );

    auditLog(
      "USER_REGISTERED",
      result.user.id,
      {
        email: result.user.email,
        role: result.user.role,
      },
      req.ip
    );

    res.status(201).json({
      success: true,
      message:
        "Registration successful. Please Log In to continue.",
      data: { user: result.user },
    });
  })
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in a user
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
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: Passw0rd!
 *     responses:
 *       200:
 *         description: Login successful
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
 *       400:
 *         description: Validation error or invalid credentials
 *       500:
 *         description: Server error
 */
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { email, password } = req.body;
    // Get the interface type from the request headers or query
    const interfaceType =
      req.query.interface || req.headers["x-interface-type"];

    const result = await authService.login(email, password);

    // Check if the user's role matches the interface they're trying to access
    if (interfaceType === "admin" && result.user.role !== "ADMIN") {
      throw new AppError(
        "Access denied. Admin interface is only accessible to administrators",
        403,
        "ROLE_MISMATCH"
      );
    }

    if (interfaceType === "customer" && result.user.role !== "CUSTOMER") {
      throw new AppError(
        "Access denied. Customer interface is only accessible to customers",
        403,
        "ROLE_MISMATCH"
      );
    }

    auditLog(
      "USER_LOGIN",
      result.user.id,
      {
        email: result.user.email,
        role: result.user.role,
        interfaceType,
      },
      req.ip
    );

    res.json({
      success: true,
      message: "Login successful",
      data: result,
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
      await emailService.sendWelcomeEmail(user.email, user.firstName);
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
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
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
 *         description: Password reset request acknowledged
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
 *                   example: If an account exists with this email, you will receive password reset instructions.
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */

router.post(
  "/forgot-password",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { email } = req.body;

    try {
      await authService.forgotPassword(email);

      res.json({
        success: true,
        message:
          "If an account exists with this email, you will receive password reset instructions.",
      });
    } catch (error) {
      // Don't reveal if email exists or not for security
      res.json({
        success: true,
        message:
          "If an account exists with this email, you will receive password reset instructions.",
      });
    }
  })
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 example: abc123resetToken
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongP@ssword1
 *     responses:
 *       200:
 *         description: Password reset successful
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
 *                   example: Password reset successful. Please login with your new password.
 *       400:
 *         description: Validation error or invalid token
 *       500:
 *         description: Server error
 */

router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        "Password must contain uppercase, lowercase, number and special character"
      ),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { token, password } = req.body;

    await authService.resetPassword(token, password);

    res.json({
      success: true,
      message:
        "Password reset successful. Please login with your new password.",
    });
  })
);

router.get(
  "/reset-password",
  asyncHandler(async (req: any, res: any) => {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required",
      });
    }
    // You can render a password reset page here, or just return a message
    res.json({
      success: true,
      message:
        "Please submit your new password using the POST /auth/reset-password endpoint.",
      token,
    });
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

    await blacklistToken(token, expiresAt, req.user?.id);

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
      req.user.id,
      {
        email: req.user.email,
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
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Protected
 */
/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: Change user password
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
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: OldPassword123!
 *               newPassword:
 *                 type: string
 *                 example: NewPassword123!
 *     responses:
 *       200:
 *         description: Password changed successfully
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
 *                   example: Password changed successfully
 *       400:
 *         description: Validation error or incorrect current password
 *       401:
 *         description: Unauthorized
 */
router.put(
  "/change-password",
  requireAuth(),
  [
    body("currentPassword").notEmpty().withMessage("Current password required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        "Password must contain uppercase, lowercase, number and special character"
      ),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(req.user.id, currentPassword, newPassword);

    auditLog(
      "PASSWORD_CHANGED",
      req.user.id,
      {
        email: req.user.email,
      },
      req.ip
    );

    res.json({
      success: true,
      message: "Password changed successfully",
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
      const newRefreshToken = await authService.rotateRefreshToken(
        refreshToken,
        user.id
      );
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
