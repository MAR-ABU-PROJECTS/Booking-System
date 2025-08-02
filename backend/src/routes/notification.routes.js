"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    next();
};
// ===============================
// NOTIFICATION ROUTES
// ===============================
/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications
 * @access  Protected
 */
router.get('/', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 20, read, type, } = req.query;
    // Build where clause
    const where = { userId: req.user.id };
    if (read !== undefined)
        where.read = read === 'true';
    if (type)
        where.type = type;
    const [notifications, total, unreadCount] = yield Promise.all([
        server_1.prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
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
})));
/**
 * @route   GET /api/v1/notifications/:id
 * @desc    Get notification details
 * @access  Protected (notification owner only)
 */
router.get('/:id', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const notification = yield server_1.prisma.notification.findUnique({
        where: { id: req.params.id },
    });
    if (!notification) {
        throw new error_middleware_2.AppError('Notification not found', 404);
    }
    // Check if notification belongs to user
    if (notification.userId !== req.user.id) {
        throw new error_middleware_2.AppError('Not authorized to view this notification', 403);
    }
    // Mark as read if not already read
    if (!notification.read) {
        yield server_1.prisma.notification.update({
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
})));
/**
 * @route   PUT /api/v1/notifications/:id/mark-read
 * @desc    Mark notification as read
 * @access  Protected (notification owner only)
 */
router.put('/:id/mark-read', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const notification = yield server_1.prisma.notification.findUnique({
        where: { id: req.params.id },
    });
    if (!notification) {
        throw new error_middleware_2.AppError('Notification not found', 404);
    }
    // Check if notification belongs to user
    if (notification.userId !== req.user.id) {
        throw new error_middleware_2.AppError('Not authorized to update this notification', 403);
    }
    const updated = yield server_1.prisma.notification.update({
        where: { id: req.params.id },
        data: {
            read: true,
            readAt: new Date(),
        },
    });
    res.json({
        success: true,
        message: 'Notification marked as read',
        data: updated,
    });
})));
/**
 * @route   PUT /api/v1/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Protected
 */
router.put('/mark-all-read', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield server_1.prisma.notification.updateMany({
        where: {
            userId: req.user.id,
            read: false,
        },
        data: {
            read: true,
            readAt: new Date(),
        },
    });
    (0, logger_middleware_1.auditLog)('NOTIFICATIONS_MARKED_READ', req.user.id, {
        action: 'mark_all_read',
    }, req.ip);
    res.json({
        success: true,
        message: 'All notifications marked as read',
    });
})));
/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete notification
 * @access  Protected (notification owner only)
 */
router.delete('/:id', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const notification = yield server_1.prisma.notification.findUnique({
        where: { id: req.params.id },
    });
    if (!notification) {
        throw new error_middleware_2.AppError('Notification not found', 404);
    }
    // Check if notification belongs to user
    if (notification.userId !== req.user.id) {
        throw new error_middleware_2.AppError('Not authorized to delete this notification', 403);
    }
    yield server_1.prisma.notification.delete({
        where: { id: req.params.id },
    });
    (0, logger_middleware_1.auditLog)('NOTIFICATION_DELETED', req.user.id, {
        notificationId: req.params.id,
    }, req.ip);
    res.json({
        success: true,
        message: 'Notification deleted successfully',
    });
})));
/**
 * @route   DELETE /api/v1/notifications/clear-all
 * @desc    Clear all notifications for user
 * @access  Protected
 */
router.delete('/clear-all', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const deletedCount = yield server_1.prisma.notification.deleteMany({
        where: { userId: req.user.id },
    });
    (0, logger_middleware_1.auditLog)('NOTIFICATIONS_CLEARED', req.user.id, {
        deletedCount: deletedCount.count,
    }, req.ip);
    res.json({
        success: true,
        message: `${deletedCount.count} notifications cleared successfully`,
    });
})));
/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Protected
 */
router.get('/unread-count', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const unreadCount = yield server_1.prisma.notification.count({
        where: {
            userId: req.user.id,
            read: false,
        },
    });
    res.json({
        success: true,
        data: { unreadCount },
    });
})));
/**
 * @route   POST /api/v1/notifications/preferences
 * @desc    Update notification preferences
 * @access  Protected
 */
router.post('/preferences', (0, authservice_1.requireAuth)(), [
    (0, express_validator_1.body)('emailNotifications').isBoolean().withMessage('Email notifications setting required'),
    (0, express_validator_1.body)('pushNotifications').isBoolean().withMessage('Push notifications setting required'),
    (0, express_validator_1.body)('smsNotifications').isBoolean().withMessage('SMS notifications setting required'),
    (0, express_validator_1.body)('bookingUpdates').isBoolean().withMessage('Booking updates setting required'),
    (0, express_validator_1.body)('reviewNotifications').isBoolean().withMessage('Review notifications setting required'),
    (0, express_validator_1.body)('promotionalEmails').isBoolean().withMessage('Promotional emails setting required'),
], validate, (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const preferences = req.body;
    // Update user notification preferences
    const updated = yield server_1.prisma.user.update({
        where: { id: req.user.id },
        data: {
            notificationPreferences: preferences,
        },
        select: {
            notificationPreferences: true,
        },
    });
    (0, logger_middleware_1.auditLog)('NOTIFICATION_PREFERENCES_UPDATED', req.user.id, {
        preferences,
    }, req.ip);
    res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: updated.notificationPreferences,
    });
})));
/**
 * @route   GET /api/v1/notifications/preferences
 * @desc    Get notification preferences
 * @access  Protected
 */
router.get('/preferences', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield server_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            notificationPreferences: true,
        },
    });
    if (!user) {
        throw new error_middleware_2.AppError('User not found', 404);
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
})));
// ===============================
// ADMIN NOTIFICATION ROUTES
// ===============================
/**
 * @route   POST /api/v1/notifications/broadcast
 * @desc    Send broadcast notification to all users
 * @access  Admin only
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
], validate, (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, message, type, userRole, urgent } = req.body;
    // Get target users
    const whereClause = { status: "ACTIVE" };
    if (userRole)
        whereClause.role = userRole;
    const users = yield server_1.prisma.user.findMany({
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
    yield server_1.prisma.notification.createMany({
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
})));
/**
 * @route   GET /api/v1/notifications/admin/stats
 * @desc    Get notification statistics
 * @access  Admin only
 */
router.get("/admin/stats", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const [totalNotifications, unreadNotifications, notificationsByType, recentActivity,] = yield Promise.all([
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
})));
exports.default = router;
