// MAR ABU PROJECTS SERVICES LLC - Admin Routes
import { Router } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { UserRole, UserStatus, PropertyStatus, BookingStatus } from '@prisma/client'
import { requireAuth } from '../services/authservice'
import { asyncHandler } from '../middleware/error.middleware'
import { AppError } from '../middleware/error.middleware'
import { prisma } from '../server'
import { auditLog } from '../middleware/logger.middleware'
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
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
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
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          identityVerified: true,
          createdAt: true,
          lastLoginAt: true,
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
 * @route   PUT /api/v1/admin/users/:id
 * @desc    Update user (admin functions)
 * @access  Admin only
 */
router.put(
  '/users/:id',
  [
    param('id').isString(),
    body('role').optional().isIn(Object.values(UserRole)),
    body('status').optional().isIn(Object.values(UserStatus)),
    body('emailVerified').optional().isBoolean(),
    body('identityVerified').optional().isBoolean(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params
    const updates: any = {}

    // Prepare updates
    if (req.body.role) updates.role = req.body.role
    if (req.body.status) updates.status = req.body.status
    if (req.body.emailVerified === true) updates.emailVerified = new Date()
    if (req.body.identityVerified === true) updates.identityVerified = new Date()

    // Prevent self-demotion
    if (id === req.user.id && req.body.role && req.body.role !== UserRole.ADMIN) {
      throw new AppError('Cannot change your own admin role', 400)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    })

    auditLog('USER_UPDATED_BY_ADMIN', req.user.id, {
      targetUserId: id,
      changes: updates,
    }, req.ip)

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user,
    })
  })
)

/**
 * @route   POST /api/v1/admin/users/:id/reset-password
 * @desc    Force reset user password
 * @access  Admin only
 */
router.post(
  '/users/:id/reset-password',
  [
    param('id').isString(),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params
    const { newPassword } = req.body

    const hashedPassword = await bcryptjs.hash(newPassword, 10)

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    })

    auditLog('PASSWORD_RESET_BY_ADMIN', req.user.id, {
      targetUserId: id,
    }, req.ip)

    res.json({
      success: true,
      message: 'Password reset successfully',
    })
  })
)

// ===============================
// PROPERTY MANAGEMENT
// ===============================

/**
 * @route   GET /api/v1/admin/properties
 * @desc    Get all properties for admin
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
    } = req.query

    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type
    if (hostId) where.hostId = hostId
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          host: {
            select: {
              id: true,
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
 * @route   PATCH /api/v1/admin/properties/:id/status
 * @desc    Change property status
 * @access  Admin only
 */
router.patch(
  '/properties/:id/status',
  [
    param('id').isString(),
    body('status').isIn(Object.values(PropertyStatus)),
    body('reason').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params
    const { status, reason } = req.body

    const property = await prisma.property.update({
      where: { id },
      data: { status },
      include: {
        host: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
      },
    })

    // Notify property host
    await prisma.notification.create({
      data: {
        userId: property.hostId,
        type: 'SYSTEM_UPDATE',
        title: 'Property Status Updated',
        message: `Your property "${property.name}" status has been changed to ${status}.${reason ? ` Reason: ${reason}` : ''}`,
        data: {
          propertyId: property.id,
          status,
          reason,
        },
      },
    })

    auditLog('PROPERTY_STATUS_CHANGED', req.user.id, {
      propertyId: id,
      oldStatus: property.status,
      newStatus: status,
      reason,
    }, req.ip)

    res.json({
      success: true,
      message: 'Property status updated successfully',
      data: property,
    })
  })
)

// ===============================
// SYSTEM SETTINGS
// ===============================

/**
 * @route   GET /api/v1/admin/settings
 * @desc    Get system settings
 * @access  Admin only
 */
router.get(
  '/settings',
  asyncHandler(async (req: any, res: any) => {
    const settings = await prisma.systemSetting.findMany({
      orderBy: [
        { category: 'asc' },
        { key: 'asc' },
      ],
    })

    // Group by category
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = []
      }
      acc[setting.category].push(setting)
      return acc
    }, {} as Record<string, any[]>)

    res.json({
      success: true,
      data: grouped,
    })
  })
)

/**
 * @route   PUT /api/v1/admin/settings/:key
 * @desc    Update system setting
 * @access  Super Admin only
 */
router.put(
  '/settings/:key',
  requireAuth(UserRole.SUPER_ADMIN),
  [
    param('key').isString(),
    body('value').notEmpty().withMessage('Value is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { key } = req.params
    const { value } = req.body

    const setting = await prisma.systemSetting.update({
      where: { key },
      data: { value: value.toString() },
    })

    auditLog('SYSTEM_SETTING_UPDATED', req.user.id, {
      settingKey: key,
      oldValue: setting.value,
      newValue: value,
    }, req.ip)

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: setting,
    })
  })
)

// ===============================
// AUDIT LOGS
// ===============================

/**
 * @route   GET /api/v1/admin/audit-logs
 * @desc    Get audit logs
 * @access  Admin only
 */
router.get(
  '/audit-logs',
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      entity,
      startDate,
      endDate,
    } = req.query

    const where: any = {}
    if (userId) where.userId = userId
    if (action) where.action = action
    if (entity) where.entity = entity
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        logs,
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

export default router