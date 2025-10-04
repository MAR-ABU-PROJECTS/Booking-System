"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// MAR ABU PROJECTS SERVICES LLC - Notification Routes
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const authservice_1 = require("../services/authservice");
const error_middleware_1 = require("../middlewares/error.middleware");
const error_middleware_2 = require("../middlewares/error.middleware");
const server_1 = require("../server");
const logger_middleware_1 = require("../middlewares/logger.middleware");
const router = (0, express_1.Router)();
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
router.get("/", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20, read, type } = req.query;
    // Build where clause
    const where = { userId: req.user.id };
    if (read !== undefined)
        where.read = read === "true";
    if (type)
        where.type = type;
    const [notifications, total, unreadCount] = await Promise.all([
        server_1.prisma.notification.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
        }),
        server_1.prisma.notification.count({ where }),
        server_1.prisma.notification.count({
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
}));
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
router.get("/:id", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const notification = await server_1.prisma.notification.findUnique({
        where: { id: req.params.id },
    });
    if (!notification) {
        throw new error_middleware_2.AppError("Notification not found", 404);
    }
    // Check if notification belongs to user
    if (notification.userId !== req.user.id) {
        throw new error_middleware_2.AppError("Not authorized to view this notification", 403);
    }
    // Mark as read if not already read
    if (!notification.read) {
        await server_1.prisma.notification.update({
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
}));
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
router.put("/:id/mark-read", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const notification = await server_1.prisma.notification.findUnique({
        where: { id: req.params.id },
    });
    if (!notification) {
        throw new error_middleware_2.AppError("Notification not found", 404);
    }
    // Check if notification belongs to user
    if (notification.userId !== req.user.id) {
        throw new error_middleware_2.AppError("Not authorized to update this notification", 403);
    }
    const updated = await server_1.prisma.notification.update({
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
}));
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
router.put("/mark-all-read", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    await server_1.prisma.notification.updateMany({
        where: {
            userId: req.user.id,
            read: false,
        },
        data: {
            read: true,
            readAt: new Date(),
        },
    });
    (0, logger_middleware_1.auditLog)("NOTIFICATIONS_MARKED_READ", req.user.id, {
        action: "mark_all_read",
    }, req.ip);
    res.json({
        success: true,
        message: "All notifications marked as read",
    });
}));
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
router.delete("/:id", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const notification = await server_1.prisma.notification.findUnique({
        where: { id: req.params.id },
    });
    if (!notification) {
        throw new error_middleware_2.AppError("Notification not found", 404);
    }
    // Check if notification belongs to user
    if (notification.userId !== req.user.id) {
        throw new error_middleware_2.AppError("Not authorized to delete this notification", 403);
    }
    await server_1.prisma.notification.delete({
        where: { id: req.params.id },
    });
    (0, logger_middleware_1.auditLog)("NOTIFICATION_DELETED", req.user.id, {
        notificationId: req.params.id,
    }, req.ip);
    res.json({
        success: true,
        message: "Notification deleted successfully",
    });
}));
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
router.delete("/clear-all", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const deletedCount = await server_1.prisma.notification.deleteMany({
        where: { userId: req.user.id },
    });
    (0, logger_middleware_1.auditLog)("NOTIFICATIONS_CLEARED", req.user.id, {
        deletedCount: deletedCount.count,
    }, req.ip);
    res.json({
        success: true,
        message: `${deletedCount.count} notifications cleared successfully`,
    });
}));
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
router.get("/unread-count", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const unreadCount = await server_1.prisma.notification.count({
        where: {
            userId: req.user.id,
            read: false,
        },
    });
    res.json({
        success: true,
        data: { unreadCount },
    });
}));
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
router.post("/preferences", (0, authservice_1.requireAuth)(), [
    (0, express_validator_1.body)("emailNotifications")
        .isBoolean()
        .withMessage("Email notifications setting required"),
    (0, express_validator_1.body)("pushNotifications")
        .isBoolean()
        .withMessage("Push notifications setting required"),
    (0, express_validator_1.body)("smsNotifications")
        .isBoolean()
        .withMessage("SMS notifications setting required"),
    (0, express_validator_1.body)("bookingUpdates")
        .isBoolean()
        .withMessage("Booking updates setting required"),
    (0, express_validator_1.body)("reviewNotifications")
        .isBoolean()
        .withMessage("Review notifications setting required"),
    (0, express_validator_1.body)("promotionalEmails")
        .isBoolean()
        .withMessage("Promotional emails setting required"),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const preferences = req.body;
    // Update user notification preferences
    const updated = await server_1.prisma.user.update({
        where: { id: req.user.id },
        data: {
            notificationPreferences: preferences,
        },
        select: {
            notificationPreferences: true,
        },
    });
    (0, logger_middleware_1.auditLog)("NOTIFICATION_PREFERENCES_UPDATED", req.user.id, {
        preferences,
    }, req.ip);
    res.json({
        success: true,
        message: "Notification preferences updated successfully",
        data: updated.notificationPreferences,
    });
}));
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
router.get("/preferences", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const user = await server_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            notificationPreferences: true,
        },
    });
    if (!user) {
        throw new error_middleware_2.AppError("User not found", 404);
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
}));
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
router.post("/broadcast", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.body)("title").trim().notEmpty().withMessage("Notification title required"),
    (0, express_validator_1.body)("message")
        .trim()
        .notEmpty()
        .withMessage("Notification message required"),
    (0, express_validator_1.body)("type")
        .isIn(Object.values(client_1.NotificationType))
        .withMessage("Invalid notification type"),
    (0, express_validator_1.body)("userRole").optional().isIn(Object.values(client_1.UserRole)),
    (0, express_validator_1.body)("urgent").optional().isBoolean(),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { title, message, type, userRole, urgent } = req.body;
    // Get target users
    const whereClause = { status: "ACTIVE" };
    if (userRole)
        whereClause.role = userRole;
    const users = await server_1.prisma.user.findMany({
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
    await server_1.prisma.notification.createMany({
        data: notifications,
    });
    (0, logger_middleware_1.auditLog)("BROADCAST_NOTIFICATION_SENT", req.user.id, {
        title,
        type,
        userRole,
        recipientCount: users.length,
    }, req.ip);
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
}));
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
router.get("/admin/stats", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const [totalNotifications, unreadNotifications, notificationsByType, recentActivity,] = await Promise.all([
        server_1.prisma.notification.count(),
        server_1.prisma.notification.count({ where: { read: false } }),
        server_1.prisma.notification.groupBy({
            by: ["type"],
            _count: { type: true },
        }),
        server_1.prisma.notification.findMany({
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
    const typeDistribution = notificationsByType.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
    }, {});
    res.json({
        success: true,
        data: {
            totalNotifications,
            unreadNotifications,
            readRate: totalNotifications > 0
                ? (((totalNotifications - unreadNotifications) /
                    totalNotifications) *
                    100).toFixed(1)
                : 0,
            typeDistribution,
            recentActivity,
        },
    });
}));
exports.default = router;
