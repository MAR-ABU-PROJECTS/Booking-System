// MAR ABU PROJECTS SERVICES LLC - Authentication Routes
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { authService, requireAuth } from '../services/authservice'
import { asyncHandler } from '../middlewares/error.middleware'
import { AppError } from '../middlewares/error.middleware'
import { auditLog } from '../middlewares/logger.middleware'

const router = Router()

// Validation middleware
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    })
  }
  next()
}

// ===============================
// AUTHENTICATION ROUTES
// ===============================

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),
    body('firstName').trim().notEmpty().withMessage('First name required'),
    body('lastName').trim().notEmpty().withMessage('Last name required'),
    body('phone').optional().isMobilePhone('any').withMessage('Valid phone number required'),
    body('role').optional().isIn(['CUSTOMER', 'PROPERTY_HOST']).withMessage('Invalid role'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const result = await authService.register(req.body)

    auditLog('USER_REGISTERED', result.user.id, {
      email: result.user.email,
      role: result.user.role,
    }, req.ip)

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: result,
    })
  })
)

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { email, password } = req.body
    const result = await authService.login(email, password)

    auditLog('USER_LOGIN', result.user.id, {
      email: result.user.email,
      role: result.user.role,
    }, req.ip)

    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    })
  })
)

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { refreshToken } = req.body
    
    try {
      const payload = authService.verifyToken(refreshToken)
      const user = await authService.getUserById(payload.userId)
      
      if (!user) {
        throw new AppError('User not found', 401)
      }

      const result = await authService.refreshToken(refreshToken)

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      })
    } catch (error) {
      throw new AppError('Invalid refresh token', 401)
    }
  })
)

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email address
 * @access  Protected
 */
router.post(
  '/verify-email',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    await authService.verifyEmail(req.user.id)

    auditLog('EMAIL_VERIFIED', req.user.id, {
      email: req.user.email,
    }, req.ip)

    res.json({
      success: true,
      message: 'Email verified successfully',
    })
  })
)

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { email } = req.body
    
    // In a real implementation, you would:
    // 1. Find user by email
    // 2. Generate reset token
    // 3. Send reset email
    // 4. Save token in database
    
    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.',
    })
  })
)

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { token, password } = req.body
    
    // In a real implementation, you would:
    // 1. Verify reset token
    // 2. Update user password
    // 3. Invalidate token
    
    res.json({
      success: true,
      message: 'Password reset successful. Please login with your new password.',
    })
  })
)

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Protected
 */
router.post(
  '/logout',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    await authService.logout(req.user.id)

    auditLog('USER_LOGOUT', req.user.id, {
      email: req.user.email,
    }, req.ip)

    res.json({
      success: true,
      message: 'Logout successful',
    })
  })
)

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Protected
 */
router.get(
  '/me',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    res.json({
      success: true,
      data: req.user,
    })
  })
)

export default router