// MAR ABU PROJECTS SERVICES LLC - Admin Routes
import { Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import {
  UserRole,
  UserStatus,
  PropertyStatus,
  BookingStatus,
} from "@prisma/client";
import { requireAuth } from "../services/authservice";
import { asyncHandler } from "../middlewares/error.middleware";
import { AppError } from "../middlewares/error.middleware";
import { prisma } from "../server";
import { auditLog } from "../middlewares/logger.middleware";
import { auditService } from "../services/auditservice";
import { dbQueries } from "../config/database";
import { schedulerService } from "../services/schedulerservice";
import * as bcryptjs from "bcryptjs";

// Helper function to get user email by ID for audit logging
async function getUserEmail(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email || `user-id-${userId}`;
  } catch (error) {
    return `user-id-${userId}`;
  }
}

const router = Router();

// All routes require admin role
router.use(requireAuth({ role: UserRole.ADMIN }));

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
router.get(
  "/dashboard",
  asyncHandler(async (req: any, res: any) => {
    // Get date range (default last 30 days)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      userStats,
      propertyStats,
      bookingStats,
      revenueStats,
      recentBookings,
      pendingReviews,
    ] = await Promise.all([
      // User statistics
      prisma.user.groupBy({
        by: ["role"],
        _count: true,
        where: { status: UserStatus.ACTIVE },
      }),

      // Property statistics
      prisma.property.groupBy({
        by: ["status"],
        _count: true,
      }),

      // Booking statistics
      dbQueries.getBookingStats(startDate, endDate),

      // Revenue statistics
      prisma.booking.aggregate({
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
      prisma.booking.findMany({
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
      prisma.review.count({
        where: { approved: false },
      }),
    ]);

    // Format response
    const stats = {
      users: {
        total: userStats.reduce((sum, stat) => sum + stat._count, 0),
        byRole: userStats.reduce(
          (acc, stat) => {
            acc[stat.role.toLowerCase()] = stat._count;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      properties: {
        total: propertyStats.reduce((sum, stat) => sum + stat._count, 0),
        byStatus: propertyStats.reduce(
          (acc, stat) => {
            acc[stat.status.toLowerCase()] = stat._count;
            return acc;
          },
          {} as Record<string, number>
        ),
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
  })
);

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
router.get(
  "/users",
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      role,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build where clause
    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
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
      prisma.user.count({ where }),
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
  })
);

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
router.get(
  "/users/:id",
  param("id").isString(),
  validate,
  asyncHandler(async (req: any, res: any) => {
    const user = await prisma.user.findUnique({
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
      throw new AppError("User not found", 404);
    }

    res.json({
      success: true,
      data: user,
    });
  })
);

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
router.put(
  "/users/:id",
  [
    param("id").isString(),
    body("firstName").optional().trim().notEmpty(),
    body("lastName").optional().trim().notEmpty(),
    body("email").optional().isEmail().normalizeEmail(),
    body("role").optional().isIn(Object.values(UserRole)),
    body("status").optional().isIn(Object.values(UserStatus)),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
    });

    const targetUserEmail = await getUserEmail(req.params.id);
    auditLog(
      "USER_UPDATED",
      req.user.email,
      {
        targetUserEmail,
        changes: req.body,
      },
      req.ip
    );

    res.json({
      success: true,
      data: user,
    });
  })
);

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
router.delete(
  "/users/:id",
  param("id").isString(),
  validate,
  asyncHandler(async (req: any, res: any) => {
    // Check if user has active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        customerId: req.params.id,
        status: {
          in: [
            BookingStatus.PENDING,
            BookingStatus.APPROVED,
            BookingStatus.CONFIRMED,
          ],
        },
      },
    });

    if (activeBookings > 0) {
      throw new AppError("Cannot delete user with active bookings", 400);
    }

    // Get user email before deletion for audit log
    const targetUserEmail = await getUserEmail(req.params.id);

    // Use soft delete instead of hard delete to preserve referential integrity
    const deletedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        status: UserStatus.DELETED,
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

    auditLog(
      "USER_SOFT_DELETED",
      req.user.email,
      {
        targetUserEmail,
        targetUserId: req.params.id,
        method: "soft_delete",
      },
      req.ip
    );

    res.json({
      success: true,
      message: "User deleted successfully (soft delete)",
      data: {
        deletedUser,
      },
    });
  })
);

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
router.delete(
  "/users/by-email/:email",
  [param("email").isEmail().normalizeEmail()],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const email = req.params.email;

    // Find the user by email
    const user = await prisma.user.findUnique({
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
                    BookingStatus.PENDING,
                    BookingStatus.APPROVED,
                    BookingStatus.CONFIRMED,
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
      throw new AppError("Customer not found with the provided email", 404);
    }

    // Prevent deletion of admin accounts
    if (user.role === UserRole.ADMIN) {
      throw new AppError(
        "Cannot delete admin accounts. Admin accounts can only be managed by other admins through proper channels.",
        400
      );
    }

    // Check if user has active bookings
    if (user._count.bookings > 0) {
      throw new AppError(
        `Cannot delete customer with active bookings. Customer has ${user._count.bookings} active booking(s). Please cancel or complete these bookings first.`,
        400
      );
    }

    // Check if user has hosted properties (in case they're also a host)
    if (user._count.hostedProperties > 0) {
      throw new AppError(
        `Cannot delete customer who has hosted properties. Customer has ${user._count.hostedProperties} property(ies). Please transfer or remove these properties first.`,
        400
      );
    }

    // Use soft delete instead of hard delete to preserve referential integrity
    const deletedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.DELETED,
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
    auditLog(
      "CUSTOMER_SOFT_DELETED_BY_EMAIL",
      req.user.email,
      {
        targetUserEmail: email,
        targetUserId: user.id,
        targetUserRole: user.role,
        deletedBy: req.user.email,
        method: "soft_delete_by_email",
      },
      req.ip
    );

    res.json({
      success: true,
      message: "Customer deleted successfully (soft delete)",
      data: {
        deletedUser,
      },
    });
  })
);

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
router.get(
  "/users/deleted",
  asyncHandler(async (req: any, res: any) => {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [deletedUsers, total] = await Promise.all([
      prisma.user.findMany({
        where: { status: UserStatus.DELETED },
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
      prisma.user.count({
        where: { status: UserStatus.DELETED },
      }),
    ]);

    auditLog(
      "DELETED_USERS_VIEWED",
      req.user.email,
      {
        page: pageNum,
        limit: limitNum,
        totalDeleted: total,
      },
      req.ip
    );

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
  })
);

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
router.get(
  "/properties",
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      hostId,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (hostId) where.hostId = hostId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
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
      prisma.property.count({ where }),
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
  })
);

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
router.put(
  "/properties/:id/status",
  [
    param("id").isString(),
    body("status").isIn(Object.values(PropertyStatus)),
    body("reason").optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { status, reason } = req.body;

    const property = await prisma.property.update({
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

    auditLog(
      "PROPERTY_STATUS_UPDATED",
      req.user.email,
      {
        propertyId: req.params.id,
        status,
        reason,
      },
      req.ip
    );

    res.json({
      success: true,
      data: property,
    });
  })
);

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

router.get(
  "/bookings",
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      propertyId,
      customerId,
      sortBy = "createdAt",
      sortOrder = "desc",
      checkInFrom,
      checkInTo,
      checkOutFrom,
      checkOutTo,
    } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    // Build where clause
    const where: Record<string, any> = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (propertyId) where.propertyId = propertyId;
    if (customerId) where.customerId = customerId;

    // Add date filters
    if (checkInFrom || checkInTo) {
      where.checkInDate = {};
      if (checkInFrom) {
        const fromDate = new Date(checkInFrom as string);
        if (!isNaN(fromDate.getTime())) {
          where.checkInDate.gte = fromDate;
        }
      }
      if (checkInTo) {
        const toDate = new Date(checkInTo as string);
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
        const fromDate = new Date(checkOutFrom as string);
        if (!isNaN(fromDate.getTime())) {
          where.checkOutDate.gte = fromDate;
        }
      }
      if (checkOutTo) {
        const toDate = new Date(checkOutTo as string);
        if (!isNaN(toDate.getTime())) {
          // Set to end of day for inclusive filtering
          toDate.setHours(23, 59, 59, 999);
          where.checkOutDate.lte = toDate;
        }
      }
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { [sortBy as string]: sortOrder },
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
      prisma.booking.count({ where }),
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
          sortBy: sortBy as string,
          sortOrder: sortOrder as string,
        },
      },
    });
  })
);

/**
 * @route   GET /api/v1/admin/bookings/with-ids
 * @desc    Get all bookings with uploaded ID documents
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/bookings/with-ids:
 *   get:
 *     summary: Get all bookings with uploaded ID documents
 *     description: Admin can retrieve all bookings that have ID documents uploaded, with filters and pagination.
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
 *         name: idType
 *         schema:
 *           type: string
 *           enum: [passport, drivers_license, national_id, voters_card]
 *         description: Filter by ID document type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
 *         description: Filter by booking status
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
 *         description: Bookings with IDs retrieved successfully
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
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "booking_123"
 *                           bookingCode:
 *                             type: string
 *                             example: "BK-20240115-001"
 *                           guestIdType:
 *                             type: string
 *                             enum: [passport, drivers_license, national_id, voters_card]
 *                             example: "passport"
 *                           guestIdNumber:
 *                             type: string
 *                             example: "A12345678"
 *                           guestIdDocumentUrl:
 *                             type: string
 *                             example: "/uploads/id-documents/booking_123_id.jpg"
 *                           status:
 *                             type: string
 *                             example: "APPROVED"
 *                           checkInDate:
 *                             type: string
 *                             format: date-time
 *                           checkOutDate:
 *                             type: string
 *                             format: date-time
 *                           property:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               city:
 *                                 type: string
 *                           customer:
 *                             type: object
 *                             properties:
 *                               email:
 *                                 type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
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
 *                           example: 50
 *                         pages:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get(
  "/bookings/with-ids",
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      idType,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    // Build where clause - must have ID document uploaded
    const where: Record<string, any> = {
      guestIdDocumentUrl: { not: null },
    };

    if (idType) where.guestIdType = idType;
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { [sortBy as string]: sortOrder },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          bookingCode: true,
          guestIdType: true,
          guestIdNumber: true,
          guestIdDocumentUrl: true,
          status: true,
          checkInDate: true,
          checkOutDate: true,
          createdAt: true,
          property: {
            select: {
              name: true,
              city: true,
              type: true,
            },
          },
          customer: {
            select: {
              email: true,
            },
          },
        },
      }),
      prisma.booking.count({ where }),
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
          idType: idType || null,
          status: status || null,
        },
      },
    });
  })
);

/**
 * @route   GET /api/v1/admin/bookings/:bookingCode/id-document
 * @desc    View or download a booking's ID document
 * @access  Admin only
 */
/**
 * @swagger
 * /admin/bookings/{bookingCode}/id-document:
 *   get:
 *     summary: View or download a booking's ID document
 *     description: Admin can view or download the ID document for a specific booking using the booking code.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingCode
 *         required: true
 *         schema:
 *           type: string
 *         description: The booking code (e.g., BK-20240115-001)
 *       - in: query
 *         name: download
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Set to true to download the file, false to view inline
 *     responses:
 *       200:
 *         description: ID document retrieved successfully
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
 *                     bookingId:
 *                       type: string
 *                       example: "booking_123"
 *                     bookingCode:
 *                       type: string
 *                       example: "BK-20240115-001"
 *                     idType:
 *                       type: string
 *                       example: "passport"
 *                     idNumber:
 *                       type: string
 *                       example: "A12345678"
 *                     documentUrl:
 *                       type: string
 *                       example: "/uploads/id-documents/booking_123_id.jpg"
 *                     absoluteUrl:
 *                       type: string
 *                       example: "http://localhost:5000/uploads/id-documents/booking_123_id.jpg"
 *                     uploadedAt:
 *                       type: string
 *                       format: date-time
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: No ID document found for this booking
 *       404:
 *         description: Booking not found or file not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get(
  "/bookings/:bookingCode/id-document",
  asyncHandler(async (req: any, res: any) => {
    const { bookingCode } = req.params;
    const { download } = req.query;

    // Get booking with ID document using booking code
    const booking = await prisma.booking.findUnique({
      where: { bookingCode },
      select: {
        id: true,
        bookingCode: true,
        guestIdType: true,
        guestIdNumber: true,
        guestIdDocumentUrl: true,
        updatedAt: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (!booking.guestIdDocumentUrl) {
      return res.status(400).json({
        success: false,
        message: "No ID document found for this booking",
      });
    }

    // If download query param is not set, return JSON with document info
    if (download !== "true") {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      return res.json({
        success: true,
        data: {
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          idType: booking.guestIdType,
          idNumber: booking.guestIdNumber,
          documentUrl: booking.guestIdDocumentUrl,
          absoluteUrl: `${baseUrl}${booking.guestIdDocumentUrl}`,
          uploadedAt: booking.updatedAt,
        },
      });
    }

    // If download=true, serve the file
    const path = require("path");
    const fs = require("fs").promises;

    // Get absolute file path
    const filePath = path.join(
      process.cwd(),
      booking.guestIdDocumentUrl.replace(/^\//, "")
    );

    try {
      // Check if file exists
      await fs.access(filePath);

      // Get file extension to set correct content type
      const ext = path.extname(filePath).toLowerCase();
      const contentTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".pdf": "application/pdf",
      };

      const contentType = contentTypes[ext] || "application/octet-stream";

      // Set headers for download
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="booking_${booking.bookingCode}_id${ext}"`
      );

      // Send file
      res.sendFile(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: "ID document file not found on server",
      });
    }
  })
);

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

router.get(
  "/settings",
  requireAuth({ role: UserRole.ADMIN }),
  asyncHandler(async (req: any, res: any) => {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
    });

    res.json({
      success: true,
      data: settings,
    });
  })
);

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

router.put(
  "/settings",
  requireAuth({ role: UserRole.ADMIN }),
  [
    body("settings").isArray(),
    body("settings.*.key").notEmpty(),
    body("settings.*.value").notEmpty(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { settings } = req.body;

    // Update settings in batch
    await Promise.all(
      settings.map((setting: any) =>
        prisma.systemSetting.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: { key: setting.key, value: setting.value },
        })
      )
    );

    auditLog(
      "SETTINGS_UPDATED",
      req.user.email,
      {
        settings,
      },
      req.ip
    );

    res.json({
      success: true,
      message: "Settings updated successfully",
    });
  })
);

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
router.get(
  "/scheduler/upcoming-cancellations",
  asyncHandler(async (req: any, res: any) => {
    const upcomingCancellations =
      await schedulerService.getUpcomingCancellations();

    res.json({
      success: true,
      data: upcomingCancellations,
    });
  })
);

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
router.post(
  "/scheduler/trigger-cancellation",
  asyncHandler(async (req: any, res: any) => {
    await schedulerService.triggerUnpaidBookingCancellation();

    auditLog(
      "MANUAL_CANCELLATION_TRIGGER",
      req.user.id,
      { triggeredBy: req.user.email },
      req.ip
    );

    res.json({
      success: true,
      message: "Auto-cancellation process completed",
    });
  })
);

// ===============================
// EMAIL QUEUE MANAGEMENT
// ===============================

/**
 * @route   GET /api/v1/admin/email-queue
 * @desc    Get email queue with filters
 * @access  Admin
 */
router.get(
  "/email-queue",
  [
    query("status")
      .optional()
      .isIn(["pending", "processing", "sent", "failed"]),
    query("type").optional().isString(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { status, type, page = 1, limit = 20 } = req.query;

    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;

    const emails = await prisma.emailQueue.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.emailQueue.count({ where: whereClause });

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
  })
);

/**
 * @route   POST /api/v1/admin/email-queue/:id/resend
 * @desc    Resend failed email
 * @access  Admin
 */
router.post(
  "/email-queue/:id/resend",
  [param("id").isString()],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const emailQueue = await prisma.emailQueue.findUnique({
      where: { id: req.params.id },
    });

    if (!emailQueue) {
      throw new AppError("Email not found in queue", 404);
    }

    try {
      // Import emailService here to avoid circular dependency
      const { emailService } = await import("../services/emailservice");

      const success = await emailService.sendEmail({
        to: emailQueue.to,
        subject: emailQueue.subject,
        html: emailQueue.html,
      });

      if (success) {
        await prisma.emailQueue.update({
          where: { id: req.params.id },
          data: {
            status: "sent",
            attempts: emailQueue.attempts + 1,
            updatedAt: new Date(),
          },
        });

        auditLog(
          "EMAIL_RESENT",
          req.user.id,
          { emailId: req.params.id, recipient: emailQueue.to },
          req.ip
        );

        res.json({
          success: true,
          message: "Email resent successfully",
        });
      } else {
        throw new AppError("Failed to resend email", 500);
      }
    } catch (error) {
      await prisma.emailQueue.update({
        where: { id: req.params.id },
        data: {
          attempts: emailQueue.attempts + 1,
          error: error instanceof Error ? error.message : "Unknown error",
          updatedAt: new Date(),
        },
      });

      throw new AppError("Failed to resend email", 500);
    }
  })
);

/**
 * @route   DELETE /api/v1/admin/email-queue/:id
 * @desc    Delete email from queue
 * @access  Admin
 */
router.delete(
  "/email-queue/:id",
  [param("id").isString()],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const emailQueue = await prisma.emailQueue.findUnique({
      where: { id: req.params.id },
    });

    if (!emailQueue) {
      throw new AppError("Email not found in queue", 404);
    }

    await prisma.emailQueue.delete({
      where: { id: req.params.id },
    });

    auditLog(
      "EMAIL_QUEUE_DELETED",
      req.user.id,
      { emailId: req.params.id, recipient: emailQueue.to },
      req.ip
    );

    res.json({
      success: true,
      message: "Email removed from queue",
    });
  })
);

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
router.get(
  "/audit-logs",
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 50,
      action,
      entity,
      entityId,
      userId,
      userEmail,
      startDate,
      endDate,
    } = req.query;

    const result = await auditService.getAuditLogs({
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

    await auditLog(
      "AUDIT_LOGS_VIEWED",
      req.user.email,
      {
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
      },
      req.ip
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

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
router.get(
  "/audit-logs/download",
  asyncHandler(async (req: any, res: any) => {
    const {
      format = "csv",
      action,
      userEmail,
      startDate,
      endDate,
      limit = 10000,
    } = req.query;

    const limitNum = Math.min(50000, Math.max(1, parseInt(limit))); // Max 50K logs for download

    try {
      // Use audit service to get logs from database
      const result = await auditService.getAuditLogs({
        page: 1,
        limit: limitNum,
        action,
        userEmail,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      const logs = result.logs.map((log) => {
        const metadata = log.metadata as any;
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
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}.json"`
        );
        res.json(logs);
      } else {
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
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}.csv"`
        );
        res.send(csv);
      }

      await auditLog(
        "AUDIT_LOGS_DOWNLOADED",
        req.user.email,
        {
          format,
          filters: { action, userEmail, startDate, endDate },
          count: logs.length,
        },
        req.ip
      );
    } catch (error: any) {
      throw new AppError(
        `Failed to download audit logs: ${error.message}`,
        500
      );
    }
  })
);

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
router.get(
  "/audit-logs/stats",
  asyncHandler(async (req: any, res: any) => {
    const { days = 30 } = req.query;
    const daysNum = Math.min(365, Math.max(1, parseInt(days)));

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysNum);

      // Get logs from database
      const result = await auditService.getAuditLogs({
        page: 1,
        limit: 100000, // Get all logs for stats
        startDate: cutoffDate,
      });

      const logs = result.logs;

      // Action frequency
      const actionCounts: Record<string, number> = {};
      const userActivity: Record<string, number> = {};
      const dailyActivity: Record<string, number> = {};

      logs.forEach((log) => {
        // Count actions
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;

        // Count user activity
        const metadata = log.metadata as any;
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

      await auditLog(
        "AUDIT_STATS_VIEWED",
        req.user.email,
        { days: daysNum },
        req.ip
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      throw new AppError(
        `Failed to retrieve audit statistics: ${error.message}`,
        500
      );
    }
  })
);

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
router.get(
  "/audit-logs/stats/detailed",
  asyncHandler(async (req: any, res: any) => {
    const { days = 30 } = req.query;
    const daysNum = Math.min(365, Math.max(1, parseInt(days)));

    const stats = await auditService.getAuditLogStats(daysNum);

    await auditLog(
      "AUDIT_STATS_DETAILED_VIEWED",
      req.user.email,
      { days: daysNum },
      req.ip
    );

    res.json({
      success: true,
      data: stats,
    });
  })
);

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
router.post(
  "/audit-logs/archive",
  asyncHandler(async (req: any, res: any) => {
    const result = await auditService.archiveOldAuditLogs();

    await auditLog(
      "AUDIT_LOGS_ARCHIVED",
      req.user.email,
      {
        archivedFile: result.archivedFile,
        count: result.count,
      },
      req.ip
    );

    res.json({
      success: true,
      message: `Archived ${result.count} audit logs`,
      data: result,
    });
  })
);

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
router.post(
  "/audit-logs/cleanup",
  asyncHandler(async (req: any, res: any) => {
    // Archive first
    const archived = await auditService.archiveOldAuditLogs();

    // Then cleanup
    const result = await auditService.cleanupOldAuditLogs();

    await auditLog(
      "AUDIT_LOGS_MANUAL_CLEANUP",
      req.user.email,
      {
        deletedByCategory: result.deletedByCategory,
        totalDeleted: result.totalDeleted,
        archivedCount: archived.count,
        triggeredBy: req.user.email,
      },
      req.ip
    );

    res.json({
      success: true,
      message: `Cleanup complete: ${result.totalDeleted} logs deleted, ${archived.count} logs archived`,
      data: {
        ...result,
        archived,
      },
    });
  })
);

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
router.get(
  "/audit-logs/retention-policy",
  asyncHandler(async (req: any, res: any) => {
    const { AUDIT_RETENTION_POLICIES } = require("../services/auditservice");

    await auditLog("AUDIT_RETENTION_POLICY_VIEWED", req.user.email, {}, req.ip);

    res.json({
      success: true,
      data: {
        policies: AUDIT_RETENTION_POLICIES,
        explanation: {
          FINANCIAL: "Booking/payment logs kept for 7 years (tax/accounting)",
          USER_MANAGEMENT:
            "User data actions kept for 3 years (accountability)",
          SECURITY: "Login/access logs kept for 1 year (security monitoring)",
          ADMIN_ACTIONS: "Admin operations kept for 2 years (compliance)",
          GENERAL: "Other logs kept for 6 months (general operations)",
        },
      },
    });
  })
);

export default router;
