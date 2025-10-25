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
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get user notifications
 *     description: Retrieve a paginated list of notifications for the authenticated user, with optional filters.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of notifications per page.
 *       - in: query
 *         name: read
 *         schema:
 *           type: boolean
 *         description: Filter notifications by read status (`true` or `false`).
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter notifications by type.
 *     responses:
 *       200:
 *         description: List of notifications with pagination and unread count.
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
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     unreadCount:
 *                       type: integer
 *                       example: 3
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
 *                           example: 52
 *                         pages:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: Unauthorized - authentication required.
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
 * @swagger
 * /notifications/{id}:
 *   get:
 *     summary: Get a single notification by ID
 *     description: Fetch a specific notification belonging to the authenticated user. Marks the notification as read if it hasn't been read yet.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Notification ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification retrieved successfully
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
 *                       example: "notif_123"
 *                     userId:
 *                       type: string
 *                       example: "user_456"
 *                     type:
 *                       type: string
 *                       example: "BOOKING_CONFIRMED"
 *                     message:
 *                       type: string
 *                       example: "Your booking has been confirmed"
 *                     read:
 *                       type: boolean
 *                       example: true
 *                     readAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-16T22:05:12.000Z"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-10T15:45:30.000Z"
 *       403:
 *         description: Not authorized to view this notification
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
 * @swagger
 * /notifications/{id}/mark-read:
 *   put:
 *     summary: Mark a notification as read
 *     description: Updates the specified notification, marking it as read and recording the read timestamp.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification successfully marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: Notification marked as read
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 *       403:
 *         description: Not authorized to update this notification
 *       404:
 *         description: Notification not found
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
 * @swagger
 * /notifications/mark-all-read:
 *   put:
 *     summary: Mark all notifications as read
 *     description: Marks all unread notifications for the authenticated user as read and records the read timestamp.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications successfully marked as read
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
 *                   example: All notifications marked as read
 *       401:
 *         description: Unauthorized, missing or invalid token
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
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     description: Deletes a specific notification that belongs to the authenticated user.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the notification to delete
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Notification deleted successfully
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       403:
 *         description: Forbidden, user does not own this notification
 *       404:
 *         description: Notification not found
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
 * @swagger
 * /notifications/clear-all:
 *   delete:
 *     summary: Clear all notifications
 *     description: Deletes all notifications for the authenticated user.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications cleared successfully
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
 *                   example: 5 notifications cleared successfully
 *       401:
 *         description: Unauthorized, missing or invalid token
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
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notifications count
 *     description: Returns the total number of unread notifications for the authenticated user.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notifications count retrieved successfully
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
 *                     unreadCount:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: Unauthorized, missing or invalid token
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
 * @swagger
 * /notifications/preferences:
 *   post:
 *     summary: Update user notification preferences
 *     description: Allows the authenticated user to update their notification preferences (email, push, SMS, booking, reviews, promotions).
 *     tags: [Notifications]
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
 *                 example: true
 *               pushNotifications:
 *                 type: boolean
 *                 example: false
 *               smsNotifications:
 *                 type: boolean
 *                 example: true
 *               bookingUpdates:
 *                 type: boolean
 *                 example: true
 *               reviewNotifications:
 *                 type: boolean
 *                 example: false
 *               promotionalEmails:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Preferences updated successfully
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
 *                   example: Notification preferences updated successfully
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
 *       400:
 *         description: Validation error (invalid or missing fields)
 *       401:
 *         description: Unauthorized, missing or invalid token
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
 * @swagger
 * /notifications/preferences:
 *   get:
 *     summary: Get user notification preferences
 *     description: Returns the user's saved notification preferences, or default values if not set.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved notification preferences
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
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: User not found
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
 * @desc    Broadcast a notification to all users (optionally filtered by role)
 * @access  Admin
 * @body    {string} title - Notification title
 * @body    {string} message - Notification message
 * @body    {string} type - Notification type
 * @body    {string} [userRole] - Optional user role to target
 * @body    {boolean} [urgent=false] - Mark as urgent
 * @returns {object} recipientCount, title, message, type
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
/**
 * @swagger
 * /notifications/admin/stats:
 *   get:
 *     summary: Get notification statistics (Admin only)
 *     description: Returns aggregated statistics on notifications including counts, read rate, type distribution, and recent activity.
 *     tags:
 *       - Notifications (Admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification statistics retrieved successfully
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
 *                     totalNotifications:
 *                       type: integer
 *                       example: 120
 *                     unreadNotifications:
 *                       type: integer
 *                       example: 30
 *                     readRate:
 *                       type: number
 *                       format: float
 *                       example: 75.0
 *                     typeDistribution:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                       example:
 *                         SYSTEM: 50
 *                         ALERT: 40
 *                         INFO: 30
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           message:
 *                             type: string
 *                           type:
 *                             type: string
 *                           urgent:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           user:
 *                             type: object
 *                             properties:
 *                               firstName:
 *                                 type: string
 *                               lastName:
 *                                 type: string
 *                               email:
 *                                 type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
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
            select: {email: true,
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
