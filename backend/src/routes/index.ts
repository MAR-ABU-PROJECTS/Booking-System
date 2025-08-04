// MAR ABU PROJECTS SERVICES LLC - Main Routes Index
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'

// Import all route modules
import authRoutes from './auth.routes'
import adminRoutes from './admin.routes'
import userRoutes from './user.routes'
import propertyRoutes from './property.routes'
import bookingRoutes from './booking.routes'
import paymentRoutes from './payment.routes'
import reviewRoutes from './review.routes'
import notificationRoutes from './notification.routes'
import receiptRoutes from './receipt.routes'
import uploadRoutes from './upload.routes'
import searchRoutes from './search.routes'
import analyticsRoutes from './analytics.routes'
import dashboardRoutes from './dashboard.routes'
import reportsRoutes from './reports.routes'
import settingsRoutes from './settings.routes'

const router = Router()

// ===============================
// RATE LIMITING
// ===============================

// General API rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs for auth
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Payment endpoints rate limit
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 payment requests per windowMs
  message: {
    success: false,
    message: 'Too many payment requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Upload endpoints rate limit
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 upload requests per windowMs
  message: {
    success: false,
    message: 'Too many upload requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// ===============================
// HEALTH CHECK
// ===============================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'MAR Abu Projects Services API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  })
})

// ===================================
// API DOCUMENTATION ENDPOINT
// ===================================

router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'MAR Abu Projects Services API Documentation',
    version: '1.0.0',
    endpoints: {
      auth: {
        base: '/api/v1/auth',
        description: 'Authentication and user management',
        endpoints: [
          'POST /register - Register new user',
          'POST /login - Login user',
          'POST /refresh - Refresh access token',
          'POST /logout - Logout user',
          'GET /me - Get current user',
          'PUT /profile - Update user profile',
          'PUT /change-password - Change password',
        ],
      },
      properties: {
        base: '/api/v1/properties',
        description: 'Property management and listings',
        endpoints: [
          'GET / - Get all properties',
          'GET /:id - Get property details',
          'POST / - Create property (Host)',
          'PUT /:id - Update property (Host)',
          'DELETE /:id - Delete property (Host)',
        ],
      },
      bookings: {
        base: '/api/v1/bookings',
        description: 'Booking management and reservations',
        endpoints: [
          'GET / - Get bookings',
          'GET /:id - Get booking details',
          'POST / - Create booking',
          'PATCH /:id/status - Update booking status',
          'POST /:id/cancel - Cancel booking',
        ],
      },
      payments: {
        base: '/api/v1/payments',
        description: 'Payment processing and management',
        endpoints: [
          'POST /initialize - Initialize payment',
          'POST /verify/:reference - Verify payment',
          'GET / - Get payment history',
          'POST /:id/refund - Process refund (Admin)',
        ],
      },
      admin: {
        base: '/api/v1/admin',
        description: 'Administrative functions',
        endpoints: [
          'GET /dashboard - Admin dashboard',
          'GET /users - Manage users',
          'GET /properties - Manage properties',
          'GET /bookings - Manage bookings',
          'GET /audit-logs - View audit logs',
        ],
      },
      analytics: {
        base: '/api/v1/analytics',
        description: 'Analytics and reporting',
        endpoints: [
          'GET /overview - Overview analytics',
          'GET /bookings - Booking analytics',
          'GET /revenue - Revenue analytics',
          'GET /properties - Property analytics',
        ],
      },
      search: {
        base: '/api/v1/search',
        description: 'Search and filtering',
        endpoints: [
          'GET /properties - Search properties',
          'GET /suggestions - Search suggestions',
          'GET /filters - Available filters',
          'GET /popular - Popular destinations',
        ],
      },
    },
    contact: {
      company: 'MAR Abu Projects Services LLC',
      email: 'api@marabuprojects.com',
      website: 'https://marabuprojects.com',
    },
  })
})

// ===============================
// MOUNT ROUTES WITH RATE LIMITING
// ===============================

// Apply general rate limiting to all routes
router.use(generalLimiter)

// Authentication routes with strict rate limiting
router.use('/auth', authLimiter, authRoutes)

// User management routes
router.use('/users', userRoutes)

// Property routes
router.use('/properties', propertyRoutes)

// Booking routes
router.use('/bookings', bookingRoutes)

// Payment routes with specific rate limiting
router.use('/payments', paymentLimiter, paymentRoutes)

// Review routes
router.use('/reviews', reviewRoutes)

// Notification routes
router.use('/notifications', notificationRoutes)

// Receipt routes
router.use('/receipts', receiptRoutes)

// Upload routes with specific rate limiting
router.use('/uploads', uploadLimiter, uploadRoutes)

// Search routes
router.use('/search', searchRoutes)

// Analytics routes
router.use('/analytics', analyticsRoutes)

// Dashboard routes
router.use('/dashboard', dashboardRoutes)

// Reports routes
router.use('/reports', reportsRoutes)

// Settings routes
router.use('/settings', settingsRoutes)

// Admin routes (should be last for security)
router.use('/admin', adminRoutes)

// ===============================
// CATCH-ALL ROUTE
// ===============================

router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      '/health - API health check',
      '/docs - API documentation',
      '/auth - Authentication endpoints',
      '/users - User management',
      '/properties - Property management',
      '/bookings - Booking management',
      '/payments - Payment processing',
      '/reviews - Review management',
      '/notifications - Notification management',
      '/receipts - Receipt management',
      '/uploads - File upload management',
      '/search - Search and filtering',
      '/analytics - Analytics and reporting',
      '/dashboard - Dashboard data',
      '/reports - Report generation',
      '/settings - System settings',
      '/admin - Administrative functions',
    ],
  })
})


export default router