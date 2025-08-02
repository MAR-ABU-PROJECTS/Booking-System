"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// MAR ABU PROJECTS SERVICES LLC - Main Routes Index
const express_1 = require("express");
const express_rate_limit_1 = require("express-rate-limit");
// Import all route modules
const auth_routes_1 = __importDefault(require("./auth.routes"));
const admin_routes_1 = __importDefault(require("./admin.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const property_routes_1 = __importDefault(require("./property.routes"));
const booking_routes_1 = __importDefault(require("./booking.routes"));
// import paymentRoutes from './payment.routes'
const review_routes_1 = __importDefault(require("./review.routes"));
const notification_routes_1 = __importDefault(require("./notification.routes"));
const receipt_routes_1 = __importDefault(require("./receipt.routes"));
// import uploadRoutes from './upload.routes'
// import searchRoutes from './search.routes'
const analytics_routes_1 = __importDefault(require("./analytics.routes"));
const dashboard_routes_1 = __importDefault(require("./dashboard.routes"));
// import reportsRoutes from './reports.routes'
// import settingsRoutes from './settings.routes'
const router = (0, express_1.Router)();
// ===============================
// RATE LIMITING
// ===============================
// General API rate limit
const generalLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Strict rate limit for auth endpoints
const authLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs for auth
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Payment endpoints rate limit
const paymentLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 payment requests per windowMs
    message: {
        success: false,
        message: 'Too many payment requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Upload endpoints rate limit
const uploadLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 upload requests per windowMs
    message: {
        success: false,
        message: 'Too many upload requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
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
    });
});
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
    });
});
// ===============================
// MOUNT ROUTES WITH RATE LIMITING
// ===============================
// Apply general rate limiting to all routes
router.use(generalLimiter);
// Authentication routes with strict rate limiting
router.use('/auth', authLimiter, auth_routes_1.default);
// User management routes
router.use('/users', user_routes_1.default);
// Property routes
router.use('/properties', property_routes_1.default);
// Booking routes
router.use('/bookings', booking_routes_1.default);
// Payment routes with specific rate limiting
// router.use('/payments', paymentLimiter, paymentRoutes)
// Review routes
router.use('/reviews', review_routes_1.default);
// Notification routes
router.use('/notifications', notification_routes_1.default);
// Receipt routes
router.use('/receipts', receipt_routes_1.default);
// Upload routes with specific rate limiting
// router.use('/uploads', uploadLimiter, uploadRoutes)
// Search routes
// router.use('/search', searchRoutes)
// Analytics routes
router.use('/analytics', analytics_routes_1.default);
// Dashboard routes
router.use('/dashboard', dashboard_routes_1.default);
// Reports routes
// router.use('/reports', reportsRoutes)
// Settings routes
// router.use('/settings', settingsRoutes)
// Admin routes (should be last for security)
router.use('/admin', admin_routes_1.default);
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
    });
});
exports.default = router;
