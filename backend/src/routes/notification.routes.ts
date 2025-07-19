// MAR ABU PROJECTS SERVICES LLC - Notification Routes
import { Router } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { NotificationType, UserRole } from '@prisma/client'
import { requireAuth } from '../services/authservice'
import { asyncHandler } from '../middlewares/error.middleware'
import { AppError } from '../middlewares/error.middleware'
import { prisma } from '../server'
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
// NOTIFICATION ROUTES
// ===============================

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications
 * @access  Protected
 */
router.get(
  '/',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      read,
      type,
    } = req.query

    // Build where clause
    const where: any = { userId: req.user.id }
    if (read !== undefined) where.read = read === 'true'
    if (type) where.type = type

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId: req.user.id,
          read: false,
        },
      }),
    ])

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
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
 * @route   GET /api/v1/notifications/:id
 * @desc    Get notification details
 * @access  Protected (notification owner only)
 */
router.get(
  '/:id',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    })

    if (!notification) {
      throw new AppError('Notification not found', 404)
    }

    // Check if notification belongs to user
    if (notification.userId !== req.user.id) {
      throw new AppError('Not authorized to view this notification', 403)
    }

    // Mark as read if not already read
    if (!notification.read) {
      await prisma.notification.update({
        where: { id: req.params.id },
        data: { 
          read: true,
          readAt: new Date(),
        },
      })
      notification.read = true
      notification.readAt = new Date()
    }

    res.json({
      success: true,
      data: notification,
    })
  })
)

/**
 * @route   PUT /api/v1/notifications/:id/mark-read
 * @desc    Mark notification as read
 * @access  Protected (notification owner only)
 */
router.put(
  '/:id/mark-read',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    })

    if (!notification) {
      throw new AppError('Notification not found', 404)
    }

    // Check if notification belongs to user
    if (notification.userId !== req.user.id) {
      throw new AppError('Not authorized to update this notification', 403)
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { 
        read: true,
        readAt: new Date(),
      },
    })

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: updated,
    })
  })
)

/**
 * @route   PUT /api/v1/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Protected
 */
router.put(
  '/mark-all-read',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    })

    auditLog('NOTIFICATIONS_MARKED_READ', req.user.id, {
      action: 'mark_all_read',
    }, req.ip)

    res.json({
      success: true,
      message: 'All notifications marked as read',
    })
  })
)

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete notification
 * @access  Protected (notification owner only)
 */
router.delete(
  '/:id',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    })

    if (!notification) {
      throw new AppError('Notification not found', 404)
    }

    // Check if notification belongs to user
    if (notification.userId !== req.user.id) {
      throw new AppError('Not authorized to delete this notification', 403)
    }

    await prisma.notification.delete({
      where: { id: req.params.id },
    })

    auditLog('NOTIFICATION_DELETED', req.user.id, {
      notificationId: req.params.id,
    }, req.ip)

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    })
  })
)

/**
 * @route   DELETE /api/v1/notifications/clear-all
 * @desc    Clear all notifications for user
 * @access  Protected
 */
router.delete(
  '/clear-all',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const deletedCount = await prisma.notification.deleteMany({
      where: { userId: req.user.id },
    })

    auditLog('NOTIFICATIONS_CLEARED', req.user.id, {
      deletedCount: deletedCount.count,
    }, req.ip)

    res.json({
      success: true,
      message: `${deletedCount.count} notifications cleared successfully`,
    })
  })
)

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Protected
 */
router.get(
  '/unread-count',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.user.id,
        read: false,
      },
    })

    res.json({
      success: true,
      data: { unreadCount },
    })
  })
)

/**
 * @route   POST /api/v1/notifications/preferences
 * @desc    Update notification preferences
 * @access  Protected
 */
router.post(
  '/preferences',
  requireAuth(),
  [
    body('emailNotifications').isBoolean().withMessage('Email notifications setting required'),
    body('pushNotifications').isBoolean().withMessage('Push notifications setting required'),
    body('smsNotifications').isBoolean().withMessage('SMS notifications setting required'),
    body('bookingUpdates').isBoolean().withMessage('Booking updates setting required'),
    body('reviewNotifications').isBoolean().withMessage('Review notifications setting required'),
    body('promotionalEmails').isBoolean().withMessage('Promotional emails setting required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const preferences = req.body

    // Update user notification preferences
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        notificationPreferences: preferences,
      },
      select: {
        notificationPreferences: true,
      },
    })

    auditLog('NOTIFICATION_PREFERENCES_UPDATED', req.user.id, {
      preferences,
    }, req.ip)

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: updated.notificationPreferences,
    })
  })
)

/**
 * @route   GET /api/v1/notifications/preferences
 * @desc    Get notification preferences
 * @access  Protected
 */
router.get(
  '/preferences',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        notificationPreferences: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    res.json({
      success: true,
      data: user.notificationPreferences || {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        bookingUpdates: true,
        reviewNotifications: true,
        promotionalEmails: false,
      },
    })
  })
)

// ===============================
// ADMIN NOTIFICATION ROUTES
// ===============================

/**
 * @route   POST /api/v1/notifications/broadcast
 * @desc    Send broadcast notification to all users
 * @access  Admin only
 */
router.post(
  '/broadcast',
  requireAuth(UserRole.ADMIN),
  [
    body('title').trim().notEmpty().withMessage('Notification title required'),
    body('message').trim().notEmpty().withMessage('Notification message required'),
    body('type').isIn(Object.values(NotificationType)).withMessage('Invalid notification type'),
    body('userRole').optional().isIn(Object.values(UserRole)),
    body('urgent').optional().isBoolean(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { title, message, type, userRole, urgent } = req.body

    // Get target users
    const whereClause: any = { status: 'ACTIVE' }
    if (userRole) whereClause.role = userRole

    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true },
    })

    // Create notifications for all target users
    const notifications = users.map(user => ({
      userId: user.id,
      type,
      title,
      message,
      urgent: urgent || false,
      metadata: {
        broadcast: true,
        sentBy: req.user.id,
      },
    }))

    await prisma.notification.createMany({
      data: notifications,
    })

    auditLog('BROADCAST_NOTIFICATION_SENT', req.user.id, {
      title,
      type,
      userRole,
      recipientCount: users.length,
    }, req.ip)

    res.status(201).json({
      success: true,
      message: `Broadcast notification sent to ${users.length} users`,
      data: {
        recipientCount: users.length,
        title,
        message,
        type,
      },
    })
  })
)

/**
 * @route   GET /api/v1/notifications/admin/stats
 * @desc    Get notification statistics
 * @access  Admin only
 */
router.get(
  '/admin/stats',
  requireAuth(UserRole.ADMIN),
  asyncHandler(async (req: any, res: any) => {
    const [
      totalNotifications,
      unreadNotifications,
      notificationsByType,
      recentActivity,
    ] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { read: false } }),
      prisma.notification.groupBy({
        by: ['type'],
        _count: { type: true },
      }),
      prisma.notification.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ])

    const typeDistribution = notificationsByType.reduce((acc, item) => {
      acc[item.type] = item._count.type
      return acc
    }, {} as Record<string, number>)

    res.json({
      success: true,
      data: {
        totalNotifications,
        unreadNotifications,
        readRate: totalNotifications > 0 
          ? ((totalNotifications - unreadNotifications) / totalNotifications * 100).toFixed(1)
          : 0,
        typeDistribution,
        recentActivity,
      },
    })
  })
)

export default router