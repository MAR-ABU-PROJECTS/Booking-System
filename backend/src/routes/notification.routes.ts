// MAR ABU PROJECTS SERVICES LLC - Notification Routes
import { Router } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { NotificationType, UserRole } from '@prisma/client'
import { requireAuth } from '../services/authservice'
import { asyncHandler } from '../middleware/error.middleware'
import { AppError } from '../middleware/error.middleware'
import { prisma } from '../server'
import { auditLog } from '../middleware/logger.middleware'

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
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Protected
 */
router.get(
  '/unread-count',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const count = await prisma.notification.count({
      where: {
        userId: req.user.id,
        read: false,
      },
    })

    res.json({
      success: true,
      data: { count },
    })
  })
)

/**
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Protected (owner)
 */
router.patch(
  '/:id/read',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params

    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification) {
      throw new AppError('Notification not found', 404)
    }

    if (notification.userId !== req.user.id) {
      throw new AppError('Not authorized to update this notification', 403)
    }

    if (notification.read) {
      return res.json({
        success: true,
        message: 'Notification already marked as read',
        data: notification,
      })
    }

    // Update notification
    const updated = await prisma.notification.update({
      where: { id },
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
 * @route   PATCH /api/v1/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Protected
 */
router.patch(
  '/mark-all-read',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    })

    res.json({
      success: true,
      message: `${result.count} notifications marked as read`,
      data: { count: result.count },
    })
  })
)

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete notification
 * @access  Protected (owner)
 */
router.delete(
  '/:id',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params

    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification) {
      throw new AppError('Notification not found', 404)
    }

    if (notification.userId !== req.user.id) {
      throw new AppError('Not authorized to delete this notification', 403)
    }

    await prisma.notification.delete({
      where: { id },
    })

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    })
  })
)

/**
 * @route   DELETE /api/v1/notifications/clear-all
 * @desc    Clear all notifications
 * @access  Protected
 */
router.delete(
  '/clear-all',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const result = await prisma.notification.deleteMany({
      where: {
        userId: req.user.id,
      },
    })

    res.json({
      success: true,
      message: `${result.count} notifications deleted`,
      data: { count: result.count },
    })
  })
)

/**
 * @route   POST /api/v1/notifications/broadcast
 * @desc    Send broadcast notification to all users
 * @access  Admin only
 */
router.post(
  '/broadcast',
  requireAuth(UserRole.ADMIN),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('type').optional().isIn(Object.values(NotificationType)),
    body('targetRole').optional().isIn(Object.values(UserRole)),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { title, message, type = NotificationType.SYSTEM_UPDATE, targetRole } = req.body

    // Get target users
    const where: any = { status: 'ACTIVE' }
    if (targetRole) where.role = targetRole

    const users = await prisma.user.findMany({
      where,
      select: { id: true },
    })

    // Create notifications for all users
    const notifications = await prisma.notification.createMany({
      data: users.map(user => ({
        userId: user.id,
        type,
        title,
        message,
      })),
    })

    auditLog('BROADCAST_SENT', req.user.id, {
      title,
      message,
      type,
      targetRole,
      recipientCount: notifications.count,
    }, req.ip)

    res.json({
      success: true,
      message: `Broadcast sent to ${notifications.count} users`,
      data: {
        recipientCount: notifications.count,
      },
    })
  })
)

/**
 * @route   POST /api/v1/notifications/send
 * @desc    Send notification to specific user (admin only)
 * @access  Admin only
 */
router.post(
  '/send',
  requireAuth(UserRole.ADMIN),
  [
    body('userId').isString().withMessage('User ID is required'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('type').optional().isIn(Object.values(NotificationType)),
    body('data').optional().isObject(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { userId, title, message, type = NotificationType.SYSTEM_UPDATE, data } = req.body

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data,
      },
    })

    auditLog('NOTIFICATION_SENT', req.user.id, {
      recipientId: userId,
      notificationId: notification.id,
      type,
    }, req.ip)

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: notification,
    })
  })
)

/**
 * @route   GET /api/v1/notifications/preferences
 * @desc    Get notification preferences (future feature)
 * @access  Protected
 */
router.get(
  '/preferences',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    // This is a placeholder for future notification preferences feature
    // For now, return default preferences
    const preferences = {
      email: {
        bookingConfirmation: true,
        bookingApproved: true,
        bookingCancelled: true,
        paymentReceived: true,
        reviewRequest: true,
        systemUpdates: true,
      },
      push: {
        bookingConfirmation: true,
        bookingApproved: true,
        bookingCancelled: true,
        paymentReceived: true,
        reviewRequest: true,
        systemUpdates: false,
      },
    }

    res.json({
      success: true,
      data: preferences,
    })
  })
)

/**
 * @route   PUT /api/v1/notifications/preferences
 * @desc    Update notification preferences (future feature)
 * @access  Protected
 */
router.put(
  '/preferences',
  requireAuth(),
  [
    body('email').optional().isObject(),
    body('push').optional().isObject(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    // This is a placeholder for future notification preferences feature
    // For now, just return success
    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: req.body,
    })
  })
)

export default router