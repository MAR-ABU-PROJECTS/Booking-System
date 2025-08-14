// MAR ABU PROJECTS SERVICES LLC - Notification Routes
import { Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import { NotificationType, UserRole } from "@prisma/client";
import { requireAuth } from "../services/authservice";
import { asyncHandler } from "../middlewares/error.middleware";
import { AppError } from "../middlewares/error.middleware";
import { prisma } from "../server";
import { auditLog } from "../middlewares/logger.middleware";

const router = Router();

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
// NOTIFICATION ROUTES
// ===============================

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: Get user notifications
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of notifications per page
 *       - in: query
 *         name: read
 *         schema:
 *           type: boolean
 *         description: Filter by read status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by notification type
 *     responses:
 *       200:
 *         description: List of notifications
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
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     unreadCount:
 *                       type: integer
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
  "/",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const { page = 1, limit = 20, read, type } = req.query;

    // Build where clause
    const where: any = { userId: req.user.id };
    if (read !== undefined) where.read = read === "true";
    if (type) where.type = type;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
    ]);

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
    });
  })
);

/**
 * @openapi
 * /notifications/{id}:
 *   get:
 *     summary: Get notification details
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 *       404:
 *         description: Notification not found
 */
router.get(
  "/:id",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    // Check if notification belongs to user
    if (notification.userId !== req.user.id) {
      throw new AppError("Not authorized to view this notification", 403);
    }

    // Mark as read if not already read
    if (!notification.read) {
      await prisma.notification.update({
        where: { id: req.params.id },
        data: {
          read: true,
          readAt: new Date(),
        },
      });
      notification.read = true;
      notification.readAt = new Date();
    }

    res.json({
      success: true,
      data: notification,
    });
  })
);

/**
 * @openapi
 * /notifications/{id}/mark-read:
 *   put:
 *     summary: Mark notification as read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
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
 *                   $ref: '#/components/schemas/Notification'
 */
router.put(
  "/:id/mark-read",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    // Check if notification belongs to user
    if (notification.userId !== req.user.id) {
      throw new AppError("Not authorized to update this notification", 403);
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Notification marked as read",
      data: updated,
    });
  })
);

/**
 * @openapi
 * /notifications/mark-all-read:
 *   put:
 *     summary: Mark all notifications as read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.put(
  "/mark-all-read",
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
    });

    auditLog(
      "NOTIFICATIONS_MARKED_READ",
      req.user.id,
      {
        action: "mark_all_read",
      },
      req.ip
    );

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  })
);

/**
 * @openapi
 * /notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.delete(
  "/:id",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    // Check if notification belongs to user
    if (notification.userId !== req.user.id) {
      throw new AppError("Not authorized to delete this notification", 403);
    }

    await prisma.notification.delete({
      where: { id: req.params.id },
    });

    auditLog(
      "NOTIFICATION_DELETED",
      req.user.id,
      {
        notificationId: req.params.id,
      },
      req.ip
    );

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  })
);

/**
 * @openapi
 * /notifications/clear-all:
 *   delete:
 *     summary: Clear all notifications for user
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications cleared
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.delete(
  "/clear-all",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const deletedCount = await prisma.notification.deleteMany({
      where: { userId: req.user.id },
    });

    auditLog(
      "NOTIFICATIONS_CLEARED",
      req.user.id,
      {
        deletedCount: deletedCount.count,
      },
      req.ip
    );

    res.json({
      success: true,
      message: `${deletedCount.count} notifications cleared successfully`,
    });
  })
);

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
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
 *                     unreadCount:
 *                       type: integer
 */
router.get(
  "/unread-count",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.user.id,
        read: false,
      },
    });

    res.json({
      success: true,
      data: { unreadCount },
    });
  })
);

/**
 * @openapi
 * /notifications/preferences:
 *   post:
 *     summary: Update notification preferences
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailNotifications:
 *                 type: boolean
 *               pushNotifications:
 *                 type: boolean
 *               smsNotifications:
 *                 type: boolean
 *               bookingUpdates:
 *                 type: boolean
 *               reviewNotifications:
 *                 type: boolean
 *               promotionalEmails:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Preferences updated
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
 *                     emailNotifications:
 *                       type: boolean
 *                     pushNotifications:
 *                       type: boolean
 *                     smsNotifications:
 *                       type: boolean
 *                     bookingUpdates:
 *                       type: boolean
 *                     reviewNotifications:
 *                       type: boolean
 *                     promotionalEmails:
 *                       type: boolean
 *   get:
 *     summary: Get notification preferences
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences object
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
 *                     emailNotifications:
 *                       type: boolean
 *                     pushNotifications:
 *                       type: boolean
 *                     smsNotifications:
 *                       type: boolean
 *                     bookingUpdates:
 *                       type: boolean
 *                     reviewNotifications:
 *                       type: boolean
 *                     promotionalEmails:
 *                       type: boolean
 */
router.post(
  "/preferences",
  requireAuth(),
  [
    body("emailNotifications")
      .isBoolean()
      .withMessage("Email notifications setting required"),
    body("pushNotifications")
      .isBoolean()
      .withMessage("Push notifications setting required"),
    body("smsNotifications")
      .isBoolean()
      .withMessage("SMS notifications setting required"),
    body("bookingUpdates")
      .isBoolean()
      .withMessage("Booking updates setting required"),
    body("reviewNotifications")
      .isBoolean()
      .withMessage("Review notifications setting required"),
    body("promotionalEmails")
      .isBoolean()
      .withMessage("Promotional emails setting required"),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const preferences = req.body;

    // Update user notification preferences
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        notificationPreferences: preferences,
      },
      select: {
        notificationPreferences: true,
      },
    });

    auditLog(
      "NOTIFICATION_PREFERENCES_UPDATED",
      req.user.id,
      {
        preferences,
      },
      req.ip
    );

    res.json({
      success: true,
      message: "Notification preferences updated successfully",
      data: updated.notificationPreferences,
    });
  })
);

/**
 * @openapi
 * /notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences object
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
 *                     emailNotifications:
 *                       type: boolean
 *                     pushNotifications:
 *                       type: boolean
 *                     smsNotifications:
 *                       type: boolean
 *                     bookingUpdates:
 *                       type: boolean
 *                     reviewNotifications:
 *                       type: boolean
 *                     promotionalEmails:
 *                       type: boolean
 */
router.get(
  "/preferences",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        notificationPreferences: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
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
    });
  })
);

// ===============================
// ADMIN NOTIFICATION ROUTES
// ===============================

/**
 * @route   POST /notifications/broadcast
 * @desc    Send broadcast notification to all users
 * @access  Admin only
 */
router.post(
  "/broadcast",
  requireAuth({ role: UserRole.ADMIN }),
  [
    body("title").trim().notEmpty().withMessage("Notification title required"),
    body("message")
      .trim()
      .notEmpty()
      .withMessage("Notification message required"),
    body("type")
      .isIn(Object.values(NotificationType))
      .withMessage("Invalid notification type"),
    body("userRole").optional().isIn(Object.values(UserRole)),
    body("urgent").optional().isBoolean(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { title, message, type, userRole, urgent } = req.body;

    // Get target users
    const whereClause: any = { status: "ACTIVE" };
    if (userRole) whereClause.role = userRole;

    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true },
    });

    // Create notifications for all target users
    const notifications = users.map((user) => ({
      userId: user.id,
      type,
      title,
      message,
      urgent: urgent || false,
      metadata: {
        broadcast: true,
        sentBy: req.user.id,
      },
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    auditLog(
      "BROADCAST_NOTIFICATION_SENT",
      req.user.id,
      {
        title,
        type,
        userRole,
        recipientCount: users.length,
      },
      req.ip
    );

    res.status(201).json({
      success: true,
      message: `Broadcast notification sent to ${users.length} users`,
      data: {
        recipientCount: users.length,
        title,
        message,
        type,
      },
    });
  })
);

/**
 * @route   GET /notifications/admin/stats
 * @desc    Get notification statistics
 * @access  Admin only
 */
router.get(
  "/admin/stats",
  requireAuth({ role: UserRole.ADMIN }),
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
        by: ["type"],
        _count: { type: true },
      }),
      prisma.notification.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
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
    ]);

    const typeDistribution = notificationsByType.reduce(
      (acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      },
      {} as Record<string, number>
    );

    res.json({
      success: true,
      data: {
        totalNotifications,
        unreadNotifications,
        readRate:
          totalNotifications > 0
            ? (
                ((totalNotifications - unreadNotifications) /
                  totalNotifications) *
                100
              ).toFixed(1)
            : 0,
        typeDistribution,
        recentActivity,
      },
    });
  })
);

export default router;
