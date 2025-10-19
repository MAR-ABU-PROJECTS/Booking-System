"use strict";
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
const database_1 = require("../config/database");
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
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
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
                firstName: true,
                lastName: true,
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
    (0, logger_middleware_1.auditLog)("USER_UPDATED", req.user.id, {
        targetUserId: req.params.id,
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
 *     summary: Delete user
 *     description: Admin can delete a user if they have no active bookings.
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
 *         description: User deleted successfully
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
 *                   example: User deleted successfully
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
                in: [client_1.BookingStatus.PENDING, client_1.BookingStatus.APPROVED],
            },
        },
    });
    if (activeBookings > 0) {
        throw new error_middleware_2.AppError("Cannot delete user with active bookings", 400);
    }
    await server_1.prisma.user.delete({
        where: { id: req.params.id },
    });
    (0, logger_middleware_1.auditLog)("USER_DELETED", req.user.id, {
        targetUserId: req.params.id,
    }, req.ip);
    res.json({
        success: true,
        message: "User deleted successfully",
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
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
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
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
        },
    });
    (0, logger_middleware_1.auditLog)("PROPERTY_STATUS_UPDATED", req.user.id, {
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get("/bookings", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20, status, paymentStatus, propertyId, customerId, sortBy = "createdAt", sortOrder = "desc", } = req.query;
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
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
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
    (0, logger_middleware_1.auditLog)("SETTINGS_UPDATED", req.user.id, {
        settings,
    }, req.ip);
    res.json({
        success: true,
        message: "Settings updated successfully",
    });
}));
exports.default = router;
