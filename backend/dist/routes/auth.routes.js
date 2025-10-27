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
// MAR ABU PROJECTS SERVICES LLC - Passwordless Authentication Routes
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authservice_1 = require("../services/authservice");
const error_middleware_1 = require("../middlewares/error.middleware");
const error_middleware_2 = require("../middlewares/error.middleware");
const logger_middleware_1 = require("../middlewares/logger.middleware");
const emailservice_1 = require("../services/emailservice");
const otpservice_1 = require("../services/otpservice");
const jwt = __importStar(require("jsonwebtoken"));
const router = (0, express_1.Router)();
// Validation middleware
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
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
router.post("/request-otp", [
    (0, express_validator_1.body)("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Valid email required"),
    (0, express_validator_1.body)("purpose")
        .isIn(["signup", "login"])
        .withMessage("Purpose must be 'signup' or 'login'"),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { email, purpose } = req.body;
    const result = await authservice_1.authService.requestOTP(email, purpose);
    (0, logger_middleware_1.auditLog)("OTP_REQUESTED", email || "anonymous", {
        purpose,
        ip: req.ip,
    }, req.ip);
    res.json({
        success: true,
        message: "Registration successful. Please Log In to continue.",
        data: { user: result.user },
        message: "Verification code sent to your email",
        data: {
            expiresIn: otpservice_1.OTPService.CONSTANTS.EXPIRY_MINUTES * 60,
            cooldownSeconds: otpservice_1.OTPService.CONSTANTS.COOLDOWN_MINUTES * 60,
        },
    });
}));
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
router.post("/verify-otp", [
    (0, express_validator_1.body)("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Valid email required"),
    (0, express_validator_1.body)("otpCode")
        .matches(/^\d{6}$/)
        .withMessage("OTP must be 6 digits"),
    (0, express_validator_1.body)("purpose")
        .isIn(["signup", "login"])
        .withMessage("Purpose must be 'signup' or 'login'"),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { email, otpCode, purpose } = req.body;
    // Get the interface type from the request headers or query
    const interfaceType = req.query.interface || req.headers["x-interface-type"];
    const result = await authservice_1.authService.verifyOTP(email, otpCode, purpose);
    // Check if the user's role matches the interface they're trying to access
    if (interfaceType === "admin" && result.user.role !== "ADMIN") {
        throw new error_middleware_2.AppError("Access denied. Admin interface is only accessible to administrators", 403, "ROLE_MISMATCH");
    }
    if (interfaceType === "customer" && result.user.role !== "CUSTOMER") {
        throw new error_middleware_2.AppError("Access denied. Customer interface is only accessible to customers", 403, "ROLE_MISMATCH");
    }
    (0, logger_middleware_1.auditLog)(result.isNewUser ? "USER_REGISTERED" : "USER_LOGIN", result.user.email, {
        role: result.user.role,
        interfaceType,
        authMethod: "OTP",
    }, req.ip);
    res.json({
        success: true,
        message: result.isNewUser
            ? "Account created successfully"
            : "Login successful",
        data: result,
    });
}));
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
router.post("/refresh", [(0, express_validator_1.body)("refreshToken").notEmpty().withMessage("Refresh token required")], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    // Remove the try-catch wrapper and let authService.refreshToken handle the verification
    const result = await authservice_1.authService.refreshToken(refreshToken);
    res.json({
        success: true,
        message: "Token refreshed successfully",
        data: result,
    });
}));
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
router.get("/verify-email/:token", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { token } = req.params;
    try {
        const user = await authservice_1.authService.verifyEmailByToken(token);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification token",
                errors: null,
            });
        }
        await emailservice_1.emailService.sendWelcomeEmail(user.email);
        return res.json({
            success: true,
            message: "Email verified successfully. You can now log in.",
        });
    }
    catch (error) {
        console.error("Email verification error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
            errors: null,
        });
    }
}));
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
router.post("/verify-email/resend", (0, authservice_1.requireAuth)({ allowPending: true }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    try {
        await authservice_1.authService.resendVerification(req.user.id);
        return res.json({ success: true, message: "Verification email sent" });
    }
    catch (e) {
        if (e.message === "Email already verified") {
            return res.status(400).json({ success: false, message: e.message });
        }
        throw e;
    }
}));
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
router.post("/logout", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
        return res
            .status(400)
            .json({ success: false, message: "No token provided" });
    // Decode token to get expiry (or use JWT library)
    const payload = jwt.decode(token);
    const expiresAt = payload?.exp
        ? new Date(payload.exp * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);
    await (0, authservice_1.blacklistToken)(token);
    res.json({ success: true, message: "Logged out and token blacklisted" });
}));
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
router.get("/me", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    res.json({
        success: true,
        data: req.user,
    });
}));
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
router.put("/profile", (0, authservice_1.requireAuth)(), [
    (0, express_validator_1.body)("firstName")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("First name required"),
    (0, express_validator_1.body)("lastName")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Last name required"),
    (0, express_validator_1.body)("phone")
        .optional()
        .isMobilePhone("any")
        .withMessage("Valid phone number required"),
    (0, express_validator_1.body)("avatar").optional().isURL().withMessage("Valid avatar URL required"),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const updatedUser = await authservice_1.authService.updateProfile(req.user.id, req.body);
    (0, logger_middleware_1.auditLog)("PROFILE_UPDATED", req.user.email, {
        changes: req.body,
    }, req.ip);
    res.json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser,
    });
}));
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
router.post("/test-email", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res
            .status(400)
            .json({ success: false, message: "Email is required" });
    }
    const success = await emailservice_1.emailService.sendTestEmail(email, {
        recipientName: "Test User",
        systemName: "Booking System",
    });
    if (success) {
        return res.json({
            success: true,
            message: "Test email sent successfully!",
        });
    }
    else {
        return res
            .status(500)
            .json({ success: false, message: "Failed to send test email." });
    }
}));
router.post("/refresh-token", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken)
        return res
            .status(400)
            .json({ success: false, message: "Refresh token required" });
    // Decode refresh token to get userId
    const payload = jwt.decode(refreshToken);
    const userId = payload?.userId;
    if (!userId)
        return res
            .status(401)
            .json({ success: false, message: "Invalid refresh token" });
    const user = await authservice_1.authService.getUserById(userId);
    if (!user)
        return res
            .status(401)
            .json({ success: false, message: "User not found" });
    try {
        const newRefreshToken = await authservice_1.authService.rotateRefreshToken(refreshToken);
        const newAccessToken = authservice_1.authService.issueAccessToken(user);
        res.json({
            success: true,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    }
    catch (err) {
        res
            .status(401)
            .json({ success: false, message: "Invalid or expired refresh token" });
    }
}));
exports.default = router;
