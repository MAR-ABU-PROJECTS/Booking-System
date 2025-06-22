// MAR ABU PROJECTS SERVICES LLC - Admin Routes
import { Router } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { UserRole, UserStatus, PropertyStatus, BookingStatus } from '@prisma/client'
import { requireAuth } from '../services/authservice'
import { asyncHandler } from '../middlewares/error.middleware'
import { AppError } from '../middlewares/error.middleware'
import { prisma } from '../server'
import { auditLog } from '../middlewares/logger.middleware'
import { dbQueries } from '../config/database'
import bcryptjs from 'bcryptjs'

const router = Router()

// All routes require admin role
router.use(requireAuth(UserRole.ADMIN))

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
// DASHBOARD STATS
// ===============================

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Admin only
 */
router.get(
  '/dashboard',
  asyncHandler(async (req: any, res: any) => {
    // Get date range (default last 30 days)
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

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
        by: ['role'],
        _count: true,
        where: { status: UserStatus.ACTIVE },
      }),
      
      // Property statistics
      prisma.property.groupBy({
        by: ['status'],
        _count: true,
      }),
      
      // Booking statistics
      dbQueries.getBookingStats(startDate, endDate),
      
      // Revenue statistics
      prisma.booking.aggregate({
        where: {
          paymentStatus: 'PAID',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          total: true,
          serviceFee: true,
        },
        _count: true,
      }),
      
      // Recent bookings
      prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
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
      prisma.review.count({
        where: { approved: false },
      }),
    ])

    // Format response
    const stats = {
      users: {
        total: userStats.reduce((sum, stat) => sum + stat._count, 0),
        byRole: userStats.reduce((acc, stat) => {
          acc[stat.role.toLowerCase()] = stat._count
          return acc
        }, {} as Record<string, number>),
      },
      properties: {
        total: propertyStats.reduce((sum, stat) => sum + stat._count, 0),
        byStatus: propertyStats.reduce((acc, stat) => {
          acc[stat.status.toLowerCase()] = stat._count
          return acc
        }, {} as Record<string, number>),
      },
      bookings: bookingStats,
      revenue: {
        total: revenueStats._sum.total || 0,
        serviceFees: revenueStats._sum.serviceFee || 0,
        count: revenueStats._count,
      },
      recentBookings,
      pendingReviews,
    }

    res.json({
      success: true,
      data: stats,
    })
  })
)

// ===============================
// USER MANAGEMENT
// ===============================

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with filters
 * @access  Admin only
 */
router.get(
  '/users',
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      role,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query

    // Build where clause
    const where: any = {}
    if (role) where.role = role
    if (status) where.status = status
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
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
              properties: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

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
    })
  })
)

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get user details
 * @access  Admin only
 */
router.get(
  '/users/:id',
  param('id').isString(),
  validate,
  asyncHandler(async (req: any, res: any) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            property: {
              select: { name: true },
            },
          },
        },
        properties: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            property: {
              select: { name: true },
            },
          },
        },
      },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    res.json({
      success: true,
      data: user,
    })
  })
)

/**
 * @route   PUT /api/v1/admin/users/:id
 * @desc    Update user details
 * @access  Admin only
 */
router.put(
  '/users/:id',
  [
    param('id').isString(),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(Object.values(UserRole)),
    body('status').optional().isIn(Object.values(UserStatus)),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
    })

    auditLog('USER_UPDATED', req.user.id, {
      targetUserId: req.params.id,
      changes: req.body,
    }, req.ip)

    res.json({
      success: true,
      data: user,
    })
  })
)

/**
 * @route   DELETE /api/v1/admin/users/:id
 * @desc    Delete user
 * @access  Admin only
 */
router.delete(
  '/users/:id',
  param('id').isString(),
  validate,
  asyncHandler(async (req: any, res: any) => {
    // Check if user has active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        customerId: req.params.id,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.APPROVED],
        },
      },
    })

    if (activeBookings > 0) {
      throw new AppError('Cannot delete user with active bookings', 400)
    }

    await prisma.user.delete({
      where: { id: req.params.id },
    })

    auditLog('USER_DELETED', req.user.id, {
      targetUserId: req.params.id,
    }, req.ip)

    res.json({
      success: true,
      message: 'User deleted successfully',
    })
  })
)

// ===============================
// PROPERTY MANAGEMENT
// ===============================

/**
 * @route   GET /api/v1/admin/properties
 * @desc    Get all properties with filters
 * @access  Admin only
 */
router.get(
  '/properties',
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      hostId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query

    // Build where clause
    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type
    if (hostId) where.hostId = hostId
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
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
      prisma.property.count({ where }),
    ])

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
    })
  })
)

/**
 * @route   PUT /api/v1/admin/properties/:id/status
 * @desc    Update property status
 * @access  Admin only
 */
router.put(
  '/properties/:id/status',
  [
    param('id').isString(),
    body('status').isIn(Object.values(PropertyStatus)),
    body('reason').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { status, reason } = req.body

    const property = await prisma.property.update({
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
    })

    auditLog('PROPERTY_STATUS_UPDATED', req.user.id, {
      propertyId: req.params.id,
      status,
      reason,
    }, req.ip)

    res.json({
      success: true,
      data: property,
    })
  })
)

// ===============================
// BOOKING MANAGEMENT
// ===============================

/**
 * @route   GET /api/v1/admin/bookings
 * @desc    Get all bookings with filters
 * @access  Admin only
 */
router.get(
  '/bookings',
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      propertyId,
      customerId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query

    // Build where clause
    const where: any = {}
    if (status) where.status = status
    if (paymentStatus) where.paymentStatus = paymentStatus
    if (propertyId) where.propertyId = propertyId
    if (customerId) where.customerId = customerId

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
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
      prisma.booking.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    })
  })
)

// ===============================
// SYSTEM SETTINGS
// ===============================

/**
 * @route   GET /api/v1/admin/settings
 * @desc    Get system settings
 * @access  Super Admin only
 */
router.get(
  '/settings',
  requireAuth(UserRole.SUPER_ADMIN),
  asyncHandler(async (req: any, res: any) => {
    const settings = await prisma.setting.findMany({
      orderBy: { key: 'asc' },
    })

    res.json({
      success: true,
      data: settings,
    })
  })
)

/**
 * @route   PUT /api/v1/admin/settings
 * @desc    Update system settings
 * @access  Super Admin only
 */
router.put(
  '/settings',
  requireAuth(UserRole.SUPER_ADMIN),
  [
    body('settings').isArray(),
    body('settings.*.key').notEmpty(),
    body('settings.*.value').notEmpty(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { settings } = req.body

    // Update settings in batch
    await Promise.all(
      settings.map((setting: any) =>
        prisma.setting.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: { key: setting.key, value: setting.value },
        })
      )
    )

    auditLog('SETTINGS_UPDATED', req.user.id, {
      settings,
    }, req.ip)

    res.json({
      success: true,
      message: 'Settings updated successfully',
    })
  })
)

export default router