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
// MAR ABU PROJECTS SERVICES LLC - Admin Routes
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const authservice_1 = require("../services/authservice");
const error_middleware_1 = require("../middlewares/error.middleware");
const error_middleware_2 = require("../middlewares/error.middleware");
const server_1 = require("../server");
const logger_middleware_1 = require("../middlewares/logger.middleware");
const auditservice_1 = require("../services/auditservice");
const database_1 = require("../config/database");
const schedulerservice_1 = require("../services/schedulerservice");
// Helper function to get user email by ID for audit logging
async function getUserEmail(userId) {
    try {
        const user = await server_1.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        return user?.email || `user-id-${userId}`;
    }
    catch (error) {
        return `user-id-${userId}`;
    }
}
const router = (0, express_1.Router)();
// All routes require admin role
router.use((0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }));
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
// DASHBOARD STATS
// ===============================
/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     description: Returns user, property, booking, revenue, recent bookings, and pending review statistics for the admin dashboard.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
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
 *                     users:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 200
 *                         byRole:
 *                           type: object
 *                           additionalProperties:
 *                             type: integer
 *                           example: { admin: 5, customer: 180, host: 15 }
 *                     properties:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 120
 *                         byStatus:
 *                           type: object
 *                           additionalProperties:
 *                             type: integer
 *                           example: { active: 80, inactive: 40 }
 *                     bookings:
 *                       type: object
 *                       description: Booking statistics (custom structure from dbQueries)
 *                     revenue:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           format: float
 *                           example: 95000
 *                         cautionFees:
 *                           type: number
 *                           format: float
 *                           example: 3000
 *                         count:
 *                           type: integer
 *                           example: 85
 *                     recentBookings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           property:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                           customer:
 *                             type: object
 *                             properties:
 *                               firstName:
 *                                 type: string
 *                               lastName:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                                 format: email
 *                     pendingReviews:
 *                       type: integer
 *                       example: 10
 */
router.get("/dashboard", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    // Get date range (default last 30 days)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [userStats, propertyStats, bookingStats, revenueStats, recentBookings, pendingReviews,] = await Promise.all([
        // User statistics
        server_1.prisma.user.groupBy({
            by: ["role"],
            _count: true,
            where: { status: client_1.UserStatus.ACTIVE },
        }),
        // Property statistics
        server_1.prisma.property.groupBy({
            by: ["status"],
            _count: true,
        }),
        // Booking statistics
        database_1.dbQueries.getBookingStats(startDate, endDate),
        // Revenue statistics
        server_1.prisma.booking.aggregate({
            where: {
                paymentStatus: "PAID",
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                total: true,
                cautionFee: true,
            },
            _count: true,
        }),
        // Recent bookings
        server_1.prisma.booking.findMany({
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
                property: {
                    select: { name: true },
                },
                customer: {
                    select: { email: true },
                },
            },
        }),
        // Pending reviews
        server_1.prisma.review.count({
            where: { approved: false },
        }),
    ]);
    // Format response
    const stats = {
        users: {
            total: userStats.reduce((sum, stat) => sum + stat._count, 0),
            byRole: userStats.reduce((acc, stat) => {
                acc[stat.role.toLowerCase()] = stat._count;
                return acc;
            }, {}),
        },
        properties: {
            total: propertyStats.reduce((sum, stat) => sum + stat._count, 0),
            byStatus: propertyStats.reduce((acc, stat) => {
                acc[stat.status.toLowerCase()] = stat._count;
                return acc;
            }, {}),
        },
        bookings: bookingStats,
        revenue: {
            total: revenueStats._sum.total || 0,
            cautionFees: revenueStats._sum.cautionFee || 0,
            count: revenueStats._count,
        },
        recentBookings,
        pendingReviews,
    };
    res.json({
        success: true,
        data: stats,
    });
}));
// ===============================
// USER MANAGEMENT
// ===============================
/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with filters
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users
 *     description: |
 *        Retrieve a paginated list of users with filtering capabilities.
 *        Requires admin privileges.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   email:
 *                     type: string
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   role:
 *                     type: string
 *                     enum:
 *                       - CUSTOMER
 *                       - ADMIN
 *                   status:
 *                     type: string
 *                     enum:
 *                       - PENDING_VERIFICATION
 *                       - ACTIVE
 *                       - INACTIVE
 *                       - SUSPENDED
 *                       - DELETED
 */
router.get("/users", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20, role, status, search, sortBy = "createdAt", sortOrder = "desc", } = req.query;
    // Build where clause
    const where = {};
    if (role)
        where.role = role;
    if (status)
        where.status = status;
    if (search) {
        where.OR = [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
        ];
    }
    const [users, total] = await Promise.all([
        server_1.prisma.user.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        bookings: true,
                        hostedProperties: true,
                    },
                },
            },
        }),
        server_1.prisma.user.count({ where }),
    ]);
    res.json({
        success: true,
        data: {
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        },
    });
}));
/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get user details
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Get detailed information for a single user
 *     description: Retrieve user details including recent bookings, hosted properties, and reviews.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details retrieved successfully
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
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     role:
 *                       type: string
 *                     status:
 *                       type: string
 *                     emailVerified:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     bookings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           property:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                     hostedProperties:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           content:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           property:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *       404:
 *         description: User not found
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
 *                   example: User not found
 */
router.get("/users/:id", (0, express_validator_1.param)("id").isString(), validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const user = await server_1.prisma.user.findUnique({
        where: { id: req.params.id },
        include: {
            bookings: {
                orderBy: { createdAt: "desc" },
                take: 10,
                include: {
                    property: {
                        select: { name: true },
                    },
                },
            },
            hostedProperties: {
                orderBy: { createdAt: "desc" },
                take: 10,
            },
            reviews: {
                orderBy: { createdAt: "desc" },
                take: 10,
                include: {
                    property: {
                        select: { name: true },
                    },
                },
            },
        },
    });
    if (!user) {
        throw new error_middleware_2.AppError("User not found", 404);
    }
    res.json({
        success: true,
        data: user,
    });
}));
/**
 * @route   PUT /api/v1/admin/users/:id
 * @desc    Update user details
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/users/{id}:
 *   put:
 *     summary: Update user details
 *     description: Admin can update user profile fields including name, email, role, and status.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the user to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               role:
 *                 type: string
 *                 enum: [CUSTOMER, ADMIN]
 *               status:
 *                 type: string
 *                 enum: [PENDING_VERIFICATION, ACTIVE, INACTIVE, SUSPENDED, DELETED]
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     status:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error or bad request
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
 *                   example: Invalid request payload
 *       404:
 *         description: User not found
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
 *                   example: User not found
 */
router.put("/users/:id", [
    (0, express_validator_1.param)("id").isString(),
    (0, express_validator_1.body)("firstName").optional().trim().notEmpty(),
    (0, express_validator_1.body)("lastName").optional().trim().notEmpty(),
    (0, express_validator_1.body)("email").optional().isEmail().normalizeEmail(),
    (0, express_validator_1.body)("role").optional().isIn(Object.values(client_1.UserRole)),
    (0, express_validator_1.body)("status").optional().isIn(Object.values(client_1.UserStatus)),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const user = await server_1.prisma.user.update({
        where: { id: req.params.id },
        data: req.body,
    });
    const targetUserEmail = await getUserEmail(req.params.id);
    (0, logger_middleware_1.auditLog)("USER_UPDATED", req.user.email, {
        targetUserEmail,
        changes: req.body,
    }, req.ip);
    res.json({
        success: true,
        data: user,
    });
}));
/**
 * @route   DELETE /api/v1/admin/users/:id
 * @desc    Delete user
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: Delete user (soft delete)
 *     description: Admin can soft delete a user if they have no active bookings. This preserves referential integrity by marking the user as deleted rather than removing the record.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the user to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully (soft delete)
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
 *                   example: User deleted successfully (soft delete)
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedUser:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         status:
 *                           type: string
 *                         deletedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Cannot delete user with active bookings
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
 *                   example: Cannot delete user with active bookings
 *       404:
 *         description: User not found
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
 *                   example: User not found
 */
router.delete("/users/:id", (0, express_validator_1.param)("id").isString(), validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    // Check if user has active bookings
    const activeBookings = await server_1.prisma.booking.count({
        where: {
            customerId: req.params.id,
            status: {
                in: [
                    client_1.BookingStatus.PENDING,
                    client_1.BookingStatus.APPROVED,
                    client_1.BookingStatus.CONFIRMED,
                ],
            },
        },
    });
    if (activeBookings > 0) {
        throw new error_middleware_2.AppError("Cannot delete user with active bookings", 400);
    }
    // Get user email before deletion for audit log
    const targetUserEmail = await getUserEmail(req.params.id);
    // Use soft delete instead of hard delete to preserve referential integrity
    const deletedUser = await server_1.prisma.user.update({
        where: { id: req.params.id },
        data: {
            status: client_1.UserStatus.DELETED,
            deletedAt: new Date(),
            // Anonymize sensitive data
            email: `deleted-${req.params.id}@deleted.local`,
            phone: null,
            avatar: null,
            bio: null,
            address: null,
            city: null,
            state: null,
            // Clear OTP data
            otpCode: null,
            otpExpiry: null,
            otpAttempts: 0,
            otpLastSent: null,
        },
        select: {
            id: true,
            email: true,
            status: true,
            deletedAt: true,
        },
    });
    (0, logger_middleware_1.auditLog)("USER_SOFT_DELETED", req.user.email, {
        targetUserEmail,
        targetUserId: req.params.id,
        method: "soft_delete",
    }, req.ip);
    res.json({
        success: true,
        message: "User deleted successfully (soft delete)",
        data: {
            deletedUser,
        },
    });
}));
/**
 * @route   DELETE /api/v1/admin/users/by-email/:email
 * @desc    Delete customer by email
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/users/by-email/{email}:
 *   delete:
 *     summary: Delete customer by email (soft delete)
 *     description: Admin can soft delete a customer account by email address. This preserves referential integrity by marking the user as deleted rather than removing the record. Only customers can be deleted this way, not admin accounts.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         description: Email address of the customer to delete
 *         schema:
 *           type: string
 *           format: email
 *           example: customer@example.com
 *     responses:
 *       200:
 *         description: Customer deleted successfully (soft delete)
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
 *                   example: Customer deleted successfully (soft delete)
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedUser:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         deletedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Cannot delete user (has active bookings, is admin, etc.)
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
 *                   example: Cannot delete admin account or user with active bookings
 *       404:
 *         description: Customer not found
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
 *                   example: Customer not found with the provided email
 */
router.delete("/users/by-email/:email", [(0, express_validator_1.param)("email").isEmail().normalizeEmail()], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const email = req.params.email;
    // Find the user by email
    const user = await server_1.prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            role: true,
            status: true,
            _count: {
                select: {
                    bookings: {
                        where: {
                            status: {
                                in: [
                                    client_1.BookingStatus.PENDING,
                                    client_1.BookingStatus.APPROVED,
                                    client_1.BookingStatus.CONFIRMED,
                                ],
                            },
                        },
                    },
                    hostedProperties: true,
                },
            },
        },
    });
    if (!user) {
        throw new error_middleware_2.AppError("Customer not found with the provided email", 404);
    }
    // Prevent deletion of admin accounts
    if (user.role === client_1.UserRole.ADMIN) {
        throw new error_middleware_2.AppError("Cannot delete admin accounts. Admin accounts can only be managed by other admins through proper channels.", 400);
    }
    // Check if user has active bookings
    if (user._count.bookings > 0) {
        throw new error_middleware_2.AppError(`Cannot delete customer with active bookings. Customer has ${user._count.bookings} active booking(s). Please cancel or complete these bookings first.`, 400);
    }
    // Check if user has hosted properties (in case they're also a host)
    if (user._count.hostedProperties > 0) {
        throw new error_middleware_2.AppError(`Cannot delete customer who has hosted properties. Customer has ${user._count.hostedProperties} property(ies). Please transfer or remove these properties first.`, 400);
    }
    // Use soft delete instead of hard delete to preserve referential integrity
    const deletedUser = await server_1.prisma.user.update({
        where: { id: user.id },
        data: {
            status: client_1.UserStatus.DELETED,
            deletedAt: new Date(),
            // Anonymize sensitive data
            email: `deleted-${user.id}@deleted.local`,
            phone: null,
            avatar: null,
            bio: null,
            address: null,
            city: null,
            state: null,
            // Clear OTP data
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
            deletedAt: true,
        },
    });
    // Log the deletion
    (0, logger_middleware_1.auditLog)("CUSTOMER_SOFT_DELETED_BY_EMAIL", req.user.email, {
        targetUserEmail: email,
        targetUserId: user.id,
        targetUserRole: user.role,
        deletedBy: req.user.email,
        method: "soft_delete_by_email",
    }, req.ip);
    res.json({
        success: true,
        message: "Customer deleted successfully (soft delete)",
        data: {
            deletedUser,
        },
    });
}));
/**
 * @route   GET /api/v1/admin/users/deleted
 * @desc    Get all soft deleted users
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/users/deleted:
 *   get:
 *     summary: Get all soft deleted users
 *     description: Admin can view all users that have been soft deleted with pagination.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of deleted users per page
 *     responses:
 *       200:
 *         description: Deleted users retrieved successfully
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
 *                     deletedUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           role:
 *                             type: string
 *                           status:
 *                             type: string
 *                           deletedAt:
 *                             type: string
 *                             format: date-time
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
router.get("/users/deleted", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const [deletedUsers, total] = await Promise.all([
        server_1.prisma.user.findMany({
            where: { status: client_1.UserStatus.DELETED },
            orderBy: { deletedAt: "desc" },
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                deletedAt: true,
                createdAt: true,
                _count: {
                    select: {
                        bookings: true,
                        hostedProperties: true,
                    },
                },
            },
        }),
        server_1.prisma.user.count({
            where: { status: client_1.UserStatus.DELETED },
        }),
    ]);
    (0, logger_middleware_1.auditLog)("DELETED_USERS_VIEWED", req.user.email, {
        page: pageNum,
        limit: limitNum,
        totalDeleted: total,
    }, req.ip);
    res.json({
        success: true,
        data: {
            deletedUsers,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        },
    });
}));
// ===============================
// PROPERTY MANAGEMENT
// ===============================
/**
 * @route   GET /api/v1/admin/properties
 * @desc    Get all properties with filters
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/properties:
 *   get:
 *     summary: Get all properties with filters
 *     description: Admin can retrieve all properties with optional filters, pagination, and sorting.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of properties per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum:
 *             - PENDING
 *             - ACTIVE
 *             - INACTIVE
 *             - SUSPENDED
 *             - MAINTENANCE
 *             - COMING_SOON
 *             - DELETED
 *         description: Filter by property status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         enum:
 *             - APARTMENT
 *             - HOUSE
 *             - VILLA
 *             - CONDO
 *             - TOWNHOUSE
 *             - COTTAGE
 *             - BUNGALOW
 *             - LOFT
 *             - STUDIO
 *             - PENTHOUSE
 *             - DUPLEX
 *             - SUITE
 *             - MANSION
 *             - GUEST_HOUSE
 *             - HOTEL_ROOM
 *             - OTHER
 *         description: Filter by property type
 *       - in: query
 *         name: hostId
 *         schema:
 *           type: string
 *         description: Filter by host user ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search across name, description, city, and address
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum:
 *             - createdAt
 *             - updatedAt
 *             - name
 *             - baseRate
 *         default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of properties with pagination
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
 *                     properties:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           city:
 *                             type: string
 *                           status:
 *                             type: string
 *                           host:
 *                             type: object
 *                             properties:
 *                               firstName:
 *                                 type: string
 *                               lastName:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                           _count:
 *                             type: object
 *                             description: Number of associated records
 *                             properties:
 *                               bookings:
 *                                 type: integer
 *                               reviews:
 *                                 type: integer
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/properties", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20, status, type, hostId, search, sortBy = "createdAt", sortOrder = "desc", } = req.query;
    // Build where clause
    const where = {};
    if (status)
        where.status = status;
    if (type)
        where.type = type;
    if (hostId)
        where.hostId = hostId;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
        ];
    }
    const [properties, total] = await Promise.all([
        server_1.prisma.property.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
            include: {
                host: {
                    select: { email: true },
                },
                _count: {
                    select: {
                        bookings: true,
                        reviews: true,
                    },
                },
            },
        }),
        server_1.prisma.property.count({ where }),
    ]);
    res.json({
        success: true,
        data: {
            properties,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        },
    });
}));
/**
 * @route   PUT /api/v1/admin/properties/:id/status
 * @desc    Update property status
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/properties/{id}/status:
 *   put:
 *     summary: Update property status
 *     description: Admin can update the status of a property and optionally add a reason.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the property to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, ACTIVE, INACTIVE, SUSPENDED, MAINTENANCE, COMING_SOON, DELETED]
 *                 example: PENDING
 *               reason:
 *                 type: string
 *                 description: Optional reason for status change
 *                 example: Violated community guidelines
 *     responses:
 *       200:
 *         description: Property status updated successfully
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
 *                     name:
 *                       type: string
 *                     status:
 *                       type: string
 *                     adminNotes:
 *                       type: string
 *                     host:
 *                       type: object
 *                       properties:
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         email:
 *                           type: string
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Property not found
 */
router.put("/properties/:id/status", [
    (0, express_validator_1.param)("id").isString(),
    (0, express_validator_1.body)("status").isIn(Object.values(client_1.PropertyStatus)),
    (0, express_validator_1.body)("reason").optional().isString(),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { status, reason } = req.body;
    const property = await server_1.prisma.property.update({
        where: { id: req.params.id },
        data: {
            status,
            adminNotes: reason,
        },
        include: {
            host: {
                select: { email: true },
            },
        },
    });
    (0, logger_middleware_1.auditLog)("PROPERTY_STATUS_UPDATED", req.user.email, {
        propertyId: req.params.id,
        status,
        reason,
    }, req.ip);
    res.json({
        success: true,
        data: property,
    });
}));
// ===============================
// BOOKING MANAGEMENT
// ===============================
/**
 * @route   GET /api/v1/admin/bookings
 * @desc    Get all bookings with filters
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/bookings:
 *   get:
 *     summary: Get all bookings with filters
 *     description: Admin can retrieve all bookings with optional filters, sorting, and pagination.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
 *         description: Filter by booking status
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, FAILED, REFUNDED]
 *         description: Filter by payment status
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *         description: Filter by property ID
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *         description: Filter by customer ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sorting order
 *       - in: query
 *         name: checkInFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings with check-in date from this date (YYYY-MM-DD)
 *         example: "2024-12-01"
 *       - in: query
 *         name: checkInTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings with check-in date up to this date (YYYY-MM-DD)
 *         example: "2024-12-31"
 *       - in: query
 *         name: checkOutFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings with check-out date from this date (YYYY-MM-DD)
 *         example: "2024-12-05"
 *       - in: query
 *         name: checkOutTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings with check-out date up to this date (YYYY-MM-DD)
 *         example: "2025-01-15"
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
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
 *                     bookings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BookingSummary'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     filters:
 *                       type: object
 *                       description: Applied filters
 *                       properties:
 *                         status:
 *                           type: string
 *                           nullable: true
 *                           example: "APPROVED"
 *                         paymentStatus:
 *                           type: string
 *                           nullable: true
 *                           example: "PAID"
 *                         propertyId:
 *                           type: string
 *                           nullable: true
 *                           example: "prop_123"
 *                         customerId:
 *                           type: string
 *                           nullable: true
 *                           example: "user_456"
 *                         checkInFrom:
 *                           type: string
 *                           format: date
 *                           nullable: true
 *                           example: "2024-12-01"
 *                         checkInTo:
 *                           type: string
 *                           format: date
 *                           nullable: true
 *                           example: "2024-12-31"
 *                         checkOutFrom:
 *                           type: string
 *                           format: date
 *                           nullable: true
 *                           example: "2024-12-05"
 *                         checkOutTo:
 *                           type: string
 *                           format: date
 *                           nullable: true
 *                           example: "2025-01-15"
 *                     sorting:
 *                       type: object
 *                       description: Applied sorting
 *                       properties:
 *                         sortBy:
 *                           type: string
 *                           example: "createdAt"
 *                         sortOrder:
 *                           type: string
 *                           example: "desc"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get("/bookings", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20, status, paymentStatus, propertyId, customerId, sortBy = "createdAt", sortOrder = "desc", checkInFrom, checkInTo, checkOutFrom, checkOutTo, } = req.query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    // Build where clause
    const where = {};
    if (status)
        where.status = status;
    if (paymentStatus)
        where.paymentStatus = paymentStatus;
    if (propertyId)
        where.propertyId = propertyId;
    if (customerId)
        where.customerId = customerId;
    // Add date filters
    if (checkInFrom || checkInTo) {
        where.checkInDate = {};
        if (checkInFrom) {
            const fromDate = new Date(checkInFrom);
            if (!isNaN(fromDate.getTime())) {
                where.checkInDate.gte = fromDate;
            }
        }
        if (checkInTo) {
            const toDate = new Date(checkInTo);
            if (!isNaN(toDate.getTime())) {
                // Set to end of day for inclusive filtering
                toDate.setHours(23, 59, 59, 999);
                where.checkInDate.lte = toDate;
            }
        }
    }
    if (checkOutFrom || checkOutTo) {
        where.checkOutDate = {};
        if (checkOutFrom) {
            const fromDate = new Date(checkOutFrom);
            if (!isNaN(fromDate.getTime())) {
                where.checkOutDate.gte = fromDate;
            }
        }
        if (checkOutTo) {
            const toDate = new Date(checkOutTo);
            if (!isNaN(toDate.getTime())) {
                // Set to end of day for inclusive filtering
                toDate.setHours(23, 59, 59, 999);
                where.checkOutDate.lte = toDate;
            }
        }
    }
    const [bookings, total] = await Promise.all([
        server_1.prisma.booking.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            include: {
                property: {
                    select: {
                        name: true,
                        type: true,
                        city: true,
                    },
                },
                customer: {
                    select: { email: true },
                },
            },
        }),
        server_1.prisma.booking.count({ where }),
    ]);
    res.json({
        success: true,
        data: {
            bookings,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
            filters: {
                status: status || null,
                paymentStatus: paymentStatus || null,
                propertyId: propertyId || null,
                customerId: customerId || null,
                checkInFrom: checkInFrom || null,
                checkInTo: checkInTo || null,
                checkOutFrom: checkOutFrom || null,
                checkOutTo: checkOutTo || null,
            },
            sorting: {
                sortBy: sortBy,
                sortOrder: sortOrder,
            },
        },
    });
}));
// ===============================
// SYSTEM SETTINGS
// ===============================
/**
 * @route   GET /api/v1/admin/settings
 * @desc    Get system settings
 * @access  Super Admin only
 */
/**
 * @swagger
 * /admin/settings:
 *   get:
 *     summary: Get system settings
 *     description: Retrieve a list of all system settings. Accessible only by Super Admin.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "clwxyz1234567890"
 *                       key:
 *                         type: string
 *                         example: "siteName"
 *                       value:
 *                         type: string
 *                         example: "MAR ABU Booking Platform"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden – Super Admin access required
 *       500:
 *         description: Server error
 */
router.get("/settings", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const settings = await server_1.prisma.systemSetting.findMany({
        orderBy: { key: "asc" },
    });
    res.json({
        success: true,
        data: settings,
    });
}));
/**
 * @route   PUT /api/v1/admin/settings
 * @desc    Update system settings
 * @access  Super Admin only
 */
/**
 * @swagger
 * /admin/settings:
 *   put:
 *     summary: Update system settings
 *     description: Update or create multiple system settings in batch. Accessible only by Super Admin.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - settings
 *             properties:
 *               settings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - key
 *                     - value
 *                   properties:
 *                     key:
 *                       type: string
 *                       example: "siteName"
 *                     value:
 *                       type: string
 *                       example: "MAR ABU Booking Platform"
 *     responses:
 *       200:
 *         description: Settings updated successfully
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
 *                   example: Settings updated successfully
 *       400:
 *         description: Bad request – invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden – Super Admin access required
 *       500:
 *         description: Server error
 */
router.put("/settings", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.body)("settings").isArray(),
    (0, express_validator_1.body)("settings.*.key").notEmpty(),
    (0, express_validator_1.body)("settings.*.value").notEmpty(),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { settings } = req.body;
    // Update settings in batch
    await Promise.all(settings.map((setting) => server_1.prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value },
    })));
    (0, logger_middleware_1.auditLog)("SETTINGS_UPDATED", req.user.email, {
        settings,
    }, req.ip);
    res.json({
        success: true,
        message: "Settings updated successfully",
    });
}));
// ===============================
// SCHEDULER MANAGEMENT
// ===============================
/**
 * @route   GET /api/v1/admin/scheduler/upcoming-cancellations
 * @desc    Get upcoming auto-cancellations for unpaid bookings
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/scheduler/upcoming-cancellations:
 *   get:
 *     summary: Get upcoming auto-cancellations
 *     description: Shows approved bookings that will be auto-cancelled if payment is not completed within 1 hour
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upcoming cancellations retrieved successfully
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
 *                     count:
 *                       type: integer
 *                       example: 3
 *                     bookings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           bookingCode:
 *                             type: string
 *                             example: "MAB-2025-001"
 *                           customerName:
 *                             type: string
 *                             example: "John Doe"
 *                           propertyName:
 *                             type: string
 *                             example: "Luxury Villa"
 *                           approvedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-08-16T14:30:00Z"
 *                           timeUntilCancellation:
 *                             type: integer
 *                             description: Minutes until auto-cancellation
 *                             example: 35
 */
router.get("/scheduler/upcoming-cancellations", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const upcomingCancellations = await schedulerservice_1.schedulerService.getUpcomingCancellations();
    res.json({
        success: true,
        data: upcomingCancellations,
    });
}));
/**
 * @route   POST /api/v1/admin/scheduler/trigger-cancellation
 * @desc    Manually trigger auto-cancellation process
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/scheduler/trigger-cancellation:
 *   post:
 *     summary: Manually trigger auto-cancellation process
 *     description: Immediately runs the auto-cancellation process for unpaid bookings (useful for testing or manual cleanup)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Auto-cancellation process triggered successfully
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
 *                   example: "Auto-cancellation process completed"
 */
router.post("/scheduler/trigger-cancellation", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    await schedulerservice_1.schedulerService.triggerUnpaidBookingCancellation();
    (0, logger_middleware_1.auditLog)("MANUAL_CANCELLATION_TRIGGER", req.user.id, { triggeredBy: req.user.email }, req.ip);
    res.json({
        success: true,
        message: "Auto-cancellation process completed",
    });
}));
// ===============================
// EMAIL QUEUE MANAGEMENT
// ===============================
/**
 * @route   GET /api/v1/admin/email-queue
 * @desc    Get email queue with filters
 * @access  Admin
 */
router.get("/email-queue", [
    (0, express_validator_1.query)("status")
        .optional()
        .isIn(["pending", "processing", "sent", "failed"]),
    (0, express_validator_1.query)("type").optional().isString(),
    (0, express_validator_1.query)("page").optional().isInt({ min: 1 }),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { status, type, page = 1, limit = 20 } = req.query;
    const whereClause = {};
    if (status)
        whereClause.status = status;
    if (type)
        whereClause.type = type;
    const emails = await server_1.prisma.emailQueue.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
    });
    const total = await server_1.prisma.emailQueue.count({ where: whereClause });
    res.json({
        success: true,
        data: emails,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    });
}));
/**
 * @route   POST /api/v1/admin/email-queue/:id/resend
 * @desc    Resend failed email
 * @access  Admin
 */
router.post("/email-queue/:id/resend", [(0, express_validator_1.param)("id").isString()], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const emailQueue = await server_1.prisma.emailQueue.findUnique({
        where: { id: req.params.id },
    });
    if (!emailQueue) {
        throw new error_middleware_2.AppError("Email not found in queue", 404);
    }
    try {
        // Import emailService here to avoid circular dependency
        const { emailService } = await Promise.resolve().then(() => __importStar(require("../services/emailservice")));
        const success = await emailService.sendEmail({
            to: emailQueue.to,
            subject: emailQueue.subject,
            html: emailQueue.html,
        });
        if (success) {
            await server_1.prisma.emailQueue.update({
                where: { id: req.params.id },
                data: {
                    status: "sent",
                    attempts: emailQueue.attempts + 1,
                    updatedAt: new Date(),
                },
            });
            (0, logger_middleware_1.auditLog)("EMAIL_RESENT", req.user.id, { emailId: req.params.id, recipient: emailQueue.to }, req.ip);
            res.json({
                success: true,
                message: "Email resent successfully",
            });
        }
        else {
            throw new error_middleware_2.AppError("Failed to resend email", 500);
        }
    }
    catch (error) {
        await server_1.prisma.emailQueue.update({
            where: { id: req.params.id },
            data: {
                attempts: emailQueue.attempts + 1,
                error: error instanceof Error ? error.message : "Unknown error",
                updatedAt: new Date(),
            },
        });
        throw new error_middleware_2.AppError("Failed to resend email", 500);
    }
}));
/**
 * @route   DELETE /api/v1/admin/email-queue/:id
 * @desc    Delete email from queue
 * @access  Admin
 */
router.delete("/email-queue/:id", [(0, express_validator_1.param)("id").isString()], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const emailQueue = await server_1.prisma.emailQueue.findUnique({
        where: { id: req.params.id },
    });
    if (!emailQueue) {
        throw new error_middleware_2.AppError("Email not found in queue", 404);
    }
    await server_1.prisma.emailQueue.delete({
        where: { id: req.params.id },
    });
    (0, logger_middleware_1.auditLog)("EMAIL_QUEUE_DELETED", req.user.id, { emailId: req.params.id, recipient: emailQueue.to }, req.ip);
    res.json({
        success: true,
        message: "Email removed from queue",
    });
}));
// ===============================
// AUDIT LOGS MANAGEMENT
// ===============================
/**
 * @route   GET /api/v1/admin/audit-logs
 * @desc    Get audit logs from database with filters and pagination
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/audit-logs:
 *   get:
 *     summary: Get audit logs from database
 *     description: Retrieve audit logs from database with comprehensive filtering. Database-backed for better performance and reliability.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of logs per page
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type (e.g., USER_SOFT_DELETED, BOOKING_CREATED)
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *         description: Filter by entity type (e.g., USER, BOOKING, PROPERTY)
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *         description: Filter by specific entity ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID who performed the action
 *       - in: query
 *         name: userEmail
 *         schema:
 *           type: string
 *         description: Filter by user email
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter logs from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter logs until this date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
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
 *                     logs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           action:
 *                             type: string
 *                           entity:
 *                             type: string
 *                           entityId:
 *                             type: string
 *                           userId:
 *                             type: string
 *                           changes:
 *                             type: object
 *                           metadata:
 *                             type: object
 *                             properties:
 *                               userEmail:
 *                                 type: string
 *                               ip:
 *                                 type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           user:
 *                             type: object
 *                             properties:
 *                               email:
 *                                 type: string
 *                               role:
 *                                 type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                         totalLogs:
 *                           type: integer
 *                         dateRange:
 *                           type: object
 *                         uniqueActions:
 *                           type: array
 *                         uniqueUsers:
 *                           type: integer
 */
router.get("/audit-logs", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 50, action, entity, entityId, userId, userEmail, startDate, endDate, } = req.query;
    const result = await auditservice_1.auditService.getAuditLogs({
        page: parseInt(page),
        limit: parseInt(limit),
        action,
        entity,
        entityId,
        userId,
        userEmail,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
    });
    await (0, logger_middleware_1.auditLog)("AUDIT_LOGS_VIEWED", req.user.email, {
        filters: {
            action,
            entity,
            entityId,
            userId,
            userEmail,
            startDate,
            endDate,
        },
        resultCount: result.logs.length,
    }, req.ip);
    res.json({
        success: true,
        data: result,
    });
}));
/**
 * @route   GET /api/v1/admin/audit-logs/download
 * @desc    Download audit logs as CSV or JSON
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/audit-logs/download:
 *   get:
 *     summary: Download audit logs
 *     description: Download audit logs in CSV or JSON format with optional filtering.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *         description: Download format
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by specific action type
 *       - in: query
 *         name: userEmail
 *         schema:
 *           type: string
 *         description: Filter by user email
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter logs from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter logs until this date (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10000
 *         description: Maximum number of logs to download (max 50000)
 *     responses:
 *       200:
 *         description: Audit logs downloaded successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/audit-logs/download", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { format = "csv", action, userEmail, startDate, endDate, limit = 10000, } = req.query;
    const limitNum = Math.min(50000, Math.max(1, parseInt(limit))); // Max 50K logs for download
    try {
        // Use audit service to get logs from database
        const result = await auditservice_1.auditService.getAuditLogs({
            page: 1,
            limit: limitNum,
            action,
            userEmail,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        });
        const logs = result.logs.map((log) => {
            const metadata = log.metadata;
            return {
                timestamp: log.createdAt,
                action: log.action,
                userEmail: metadata?.userEmail || "",
                ip: metadata?.ip || "",
                details: {
                    entity: log.entity,
                    entityId: log.entityId,
                    changes: log.changes,
                    ...metadata,
                },
            };
        });
        const timestamp = new Date().toISOString().split("T")[0];
        const filename = `audit-logs-${timestamp}`;
        if (format === "json") {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Content-Disposition", `attachment; filename="${filename}.json"`);
            res.json(logs);
        }
        else {
            // CSV format
            const csvRows = [
                "timestamp,action,userEmail,ip,entity,entityId,details",
            ];
            logs.forEach((log) => {
                const row = [
                    log.timestamp.toISOString(),
                    log.action,
                    log.userEmail,
                    log.ip,
                    log.details.entity || "",
                    log.details.entityId || "",
                    JSON.stringify(log.details).replace(/"/g, '""'),
                ];
                csvRows.push(row.map((field) => `"${field}"`).join(","));
            });
            const csv = csvRows.join("\n");
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
            res.send(csv);
        }
        await (0, logger_middleware_1.auditLog)("AUDIT_LOGS_DOWNLOADED", req.user.email, {
            format,
            filters: { action, userEmail, startDate, endDate },
            count: logs.length,
        }, req.ip);
    }
    catch (error) {
        throw new error_middleware_2.AppError(`Failed to download audit logs: ${error.message}`, 500);
    }
}));
/**
 * @route   GET /api/v1/admin/audit-logs/stats
 * @desc    Get audit logs statistics
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/audit-logs/stats:
 *   get:
 *     summary: Get audit logs statistics
 *     description: Retrieve statistics about audit logs including action counts, user activity, and trends.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze (max 365)
 *     responses:
 *       200:
 *         description: Audit logs statistics retrieved successfully
 */
router.get("/audit-logs/stats", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { days = 30 } = req.query;
    const daysNum = Math.min(365, Math.max(1, parseInt(days)));
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysNum);
        // Get logs from database
        const result = await auditservice_1.auditService.getAuditLogs({
            page: 1,
            limit: 100000, // Get all logs for stats
            startDate: cutoffDate,
        });
        const logs = result.logs;
        // Action frequency
        const actionCounts = {};
        const userActivity = {};
        const dailyActivity = {};
        logs.forEach((log) => {
            // Count actions
            actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
            // Count user activity
            const metadata = log.metadata;
            const userEmail = metadata?.userEmail;
            if (userEmail) {
                userActivity[userEmail] = (userActivity[userEmail] || 0) + 1;
            }
            // Count daily activity
            const day = log.createdAt.toISOString().split("T")[0];
            dailyActivity[day] = (dailyActivity[day] || 0) + 1;
        });
        // Top actions
        const topActions = Object.entries(actionCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([action, count]) => ({ action, count }));
        // Top users
        const topUsers = Object.entries(userActivity)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([email, count]) => ({ email, count }));
        const stats = {
            period: {
                days: daysNum,
                from: cutoffDate.toISOString(),
                to: new Date().toISOString(),
            },
            totals: {
                totalActions: logs.length,
                uniqueActions: Object.keys(actionCounts).length,
                uniqueUsers: Object.keys(userActivity).length,
                activeDays: Object.keys(dailyActivity).length,
            },
            topActions,
            topUsers,
            dailyActivity,
            actionBreakdown: actionCounts,
        };
        await (0, logger_middleware_1.auditLog)("AUDIT_STATS_VIEWED", req.user.email, { days: daysNum }, req.ip);
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        throw new error_middleware_2.AppError(`Failed to retrieve audit statistics: ${error.message}`, 500);
    }
}));
// ===============================
// GDPR-COMPLIANT AUDIT LOG MANAGEMENT
// ===============================
/**
 * @route   GET /api/v1/admin/audit-logs/stats/detailed
 * @desc    Get detailed audit log statistics with GDPR retention info
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/audit-logs/stats/detailed:
 *   get:
 *     summary: Get detailed audit log statistics
 *     description: Comprehensive audit statistics including GDPR retention status and upcoming deletions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get("/audit-logs/stats/detailed", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { days = 30 } = req.query;
    const daysNum = Math.min(365, Math.max(1, parseInt(days)));
    const stats = await auditservice_1.auditService.getAuditLogStats(daysNum);
    await (0, logger_middleware_1.auditLog)("AUDIT_STATS_DETAILED_VIEWED", req.user.email, { days: daysNum }, req.ip);
    res.json({
        success: true,
        data: stats,
    });
}));
/**
 * @route   POST /api/v1/admin/audit-logs/archive
 * @desc    Manually archive old audit logs before cleanup
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/audit-logs/archive:
 *   post:
 *     summary: Archive old audit logs
 *     description: Manually trigger archiving of old audit logs to file before they are deleted. Useful for compliance and backup.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs archived successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     archivedFile:
 *                       type: string
 *                       description: Path to archived file
 *                     count:
 *                       type: integer
 *                       description: Number of logs archived
 */
router.post("/audit-logs/archive", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const result = await auditservice_1.auditService.archiveOldAuditLogs();
    await (0, logger_middleware_1.auditLog)("AUDIT_LOGS_ARCHIVED", req.user.email, {
        archivedFile: result.archivedFile,
        count: result.count,
    }, req.ip);
    res.json({
        success: true,
        message: `Archived ${result.count} audit logs`,
        data: result,
    });
}));
/**
 * @route   POST /api/v1/admin/audit-logs/cleanup
 * @desc    Manually trigger GDPR-compliant audit log cleanup
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/audit-logs/cleanup:
 *   post:
 *     summary: Manually cleanup old audit logs
 *     description: |
 *       Trigger immediate cleanup of audit logs based on GDPR retention policies:
 *       - Financial logs: 7 years
 *       - User management: 3 years
 *       - Security logs: 1 year
 *       - Admin actions: 2 years
 *       - General logs: 6 months
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedByCategory:
 *                       type: object
 *                       description: Count of deleted logs by retention category
 *                     totalDeleted:
 *                       type: integer
 */
router.post("/audit-logs/cleanup", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    // Archive first
    const archived = await auditservice_1.auditService.archiveOldAuditLogs();
    // Then cleanup
    const result = await auditservice_1.auditService.cleanupOldAuditLogs();
    await (0, logger_middleware_1.auditLog)("AUDIT_LOGS_MANUAL_CLEANUP", req.user.email, {
        deletedByCategory: result.deletedByCategory,
        totalDeleted: result.totalDeleted,
        archivedCount: archived.count,
        triggeredBy: req.user.email,
    }, req.ip);
    res.json({
        success: true,
        message: `Cleanup complete: ${result.totalDeleted} logs deleted, ${archived.count} logs archived`,
        data: {
            ...result,
            archived,
        },
    });
}));
/**
 * @route   GET /api/v1/admin/audit-logs/retention-policy
 * @desc    Get GDPR retention policy information
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/audit-logs/retention-policy:
 *   get:
 *     summary: Get GDPR retention policy
 *     description: View the audit log retention policies and which actions fall under each category
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Retention policy retrieved
 */
router.get("/audit-logs/retention-policy", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { AUDIT_RETENTION_POLICIES } = require("../services/auditservice");
    await (0, logger_middleware_1.auditLog)("AUDIT_RETENTION_POLICY_VIEWED", req.user.email, {}, req.ip);
    res.json({
        success: true,
        data: {
            policies: AUDIT_RETENTION_POLICIES,
            explanation: {
                FINANCIAL: "Booking/payment logs kept for 7 years (tax/accounting)",
                USER_MANAGEMENT: "User data actions kept for 3 years (accountability)",
                SECURITY: "Login/access logs kept for 1 year (security monitoring)",
                ADMIN_ACTIONS: "Admin operations kept for 2 years (compliance)",
                GENERAL: "Other logs kept for 6 months (general operations)",
            },
        },
    });
}));
exports.default = router;
