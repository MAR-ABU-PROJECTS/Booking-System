"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// MAR ABU PROJECTS SERVICES LLC - Authentication Routes
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authservice_1 = require("../services/authservice");
const error_middleware_1 = require("../middlewares/error.middleware");
const logger_middleware_1 = require("../middlewares/logger.middleware");
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
router.post("/register", [
    (0, express_validator_1.body)("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Valid email required"),
    (0, express_validator_1.body)("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage("Password must contain uppercase, lowercase, number and special character"),
    (0, express_validator_1.body)("firstName").trim().notEmpty().withMessage("First name required"),
    (0, express_validator_1.body)("lastName").trim().notEmpty().withMessage("Last name required"),
    (0, express_validator_1.body)("phone")
        .optional()
        .isMobilePhone("any")
        .withMessage("Valid phone number required"),
    (0, express_validator_1.body)("role")
        .optional()
        .isIn(["CUSTOMER", "ADMIN"])
        .withMessage("Invalid role"),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const result = await authservice_1.authService.register(req.body);
    (0, logger_middleware_1.auditLog)("USER_REGISTERED", result.user.id, {
        email: result.user.email,
        role: result.user.role,
    }, req.ip);
    res.status(201).json({
        success: true,
        message: "Registration successful. Please check your email to verify your account.",
        data: result,
    });
}));
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
router.post("/login", [
    (0, express_validator_1.body)("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Valid email required"),
    (0, express_validator_1.body)("password").notEmpty().withMessage("Password required"),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    const result = await authservice_1.authService.login(email, password);
    (0, logger_middleware_1.auditLog)("USER_LOGIN", result.user.id, {
        email: result.user.email,
        role: result.user.role,
    }, req.ip);
    res.json({
        success: true,
        message: "Login successful",
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
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email address
 * @access  Protected
 */
/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify user email address
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
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
 *                   example: Email verified successfully
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *       500:
 *         description: Server error
 */
router.post("/verify-email", (0, authservice_1.requireAuth)({ allowPending: true }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    await authservice_1.authService.verifyEmail(req.user.id);
    (0, logger_middleware_1.auditLog)("EMAIL_VERIFIED", req.user.id, {
        email: req.user.email,
    }, req.ip);
    res.json({
        success: true,
        message: "Email verified successfully",
    });
}));
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
router.post("/forgot-password", [
    (0, express_validator_1.body)("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Valid email required"),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    try {
        await authservice_1.authService.forgotPassword(email);
        res.json({
            success: true,
            message: "If an account exists with this email, you will receive password reset instructions.",
        });
    }
    catch (error) {
        // Don't reveal if email exists or not for security
        res.json({
            success: true,
            message: "If an account exists with this email, you will receive password reset instructions.",
        });
    }
}));
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
router.post("/reset-password", [
    (0, express_validator_1.body)("token").notEmpty().withMessage("Reset token required"),
    (0, express_validator_1.body)("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage("Password must contain uppercase, lowercase, number and special character"),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { token, password } = req.body;
    await authservice_1.authService.resetPassword(token, password);
    res.json({
        success: true,
        message: "Password reset successful. Please login with your new password.",
    });
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
    await authservice_1.authService.logout(req.user.id);
    (0, logger_middleware_1.auditLog)("USER_LOGOUT", req.user.id, {
        email: req.user.email,
    }, req.ip);
    res.json({
        success: true,
        message: "Logout successful",
    });
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
    (0, logger_middleware_1.auditLog)("PROFILE_UPDATED", req.user.id, {
        email: req.user.email,
        changes: req.body,
    }, req.ip);
    res.json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser,
    });
}));
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
router.put("/change-password", (0, authservice_1.requireAuth)(), [
    (0, express_validator_1.body)("currentPassword").notEmpty().withMessage("Current password required"),
    (0, express_validator_1.body)("newPassword")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage("Password must contain uppercase, lowercase, number and special character"),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await authservice_1.authService.changePassword(req.user.id, currentPassword, newPassword);
    (0, logger_middleware_1.auditLog)("PASSWORD_CHANGED", req.user.id, {
        email: req.user.email,
    }, req.ip);
    res.json({
        success: true,
        message: "Password changed successfully",
    });
}));
exports.default = router;
