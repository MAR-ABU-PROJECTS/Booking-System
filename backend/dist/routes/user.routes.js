"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// MAR ABU PROJECTS SERVICES LLC - User Profile Management Routes
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const authservice_1 = require("../services/authservice");
const error_middleware_1 = require("../middlewares/error.middleware");
const error_middleware_2 = require("../middlewares/error.middleware");
const server_1 = require("../server");
const logger_middleware_1 = require("../middlewares/logger.middleware");
const emailservice_1 = require("../services/emailservice");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
// Configure multer for avatar uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/avatars');
    },
    filename: (req, file, cb) => {
        const uniqueName = `avatar-${(0, uuid_1.v4)()}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: constants_1.APP_CONSTANTS.UPLOAD.MAX_IMAGE_SIZE,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    },
});
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
// USER PROFILE ROUTES
// ===============================
/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user profile
 * @access  Protected
 */
router.get('/profile', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const user = await server_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
            role: true,
            status: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            notificationPreferences: true,
            _count: {
                select: {
                    bookings: true,
                    hostedProperties: true,
                    reviews: true,
                },
            },
        },
    });
    if (!user) {
        throw new error_middleware_2.AppError('User not found', 404);
    }
    res.json({
        success: true,
        data: user,
    });
}));
/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Protected
 */
router.put('/profile', (0, authservice_1.requireAuth)(), [
    (0, express_validator_1.body)('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    (0, express_validator_1.body)('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    (0, express_validator_1.body)('phone').optional().isMobilePhone('any').withMessage('Valid phone number required'),
    (0, express_validator_1.body)('bio').optional().isString().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
    (0, express_validator_1.body)('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth required'),
    (0, express_validator_1.body)('address').optional().isString(),
    (0, express_validator_1.body)('city').optional().isString(),
    (0, express_validator_1.body)('country').optional().isString(),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const allowedFields = ['firstName', 'lastName', 'phone', 'bio', 'dateOfBirth', 'address', 'city', 'country'];
    const updateData = Object.keys(req.body)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
    }, {});
    const user = await server_1.prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
            bio: true,
            dateOfBirth: true,
            address: true,
            city: true,
            country: true,
        },
    });
    (0, logger_middleware_1.auditLog)('PROFILE_UPDATED', req.user.id, {
        changes: updateData,
    }, req.ip);
    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user,
    });
}));
/**
 * @route   POST /api/v1/users/avatar
 * @desc    Upload user avatar
 * @access  Protected
 */
router.post('/avatar', (0, authservice_1.requireAuth)(), upload.single('avatar'), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw new error_middleware_2.AppError('Avatar image is required', 400);
    }
    // Delete old avatar if exists
    const currentUser = await server_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { avatar: true },
    });
    if (currentUser?.avatar) {
        const fs = require('fs').promises;
        const oldAvatarPath = path_1.default.join('uploads/avatars', path_1.default.basename(currentUser.avatar));
        try {
            await fs.unlink(oldAvatarPath);
        }
        catch (error) {
            console.error('Failed to delete old avatar:', error);
        }
    }
    // Update user with new avatar
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await server_1.prisma.user.update({
        where: { id: req.user.id },
        data: { avatar: avatarUrl },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
        },
    });
    (0, logger_middleware_1.auditLog)('AVATAR_UPDATED', req.user.id, {
        avatarUrl,
    }, req.ip);
    res.json({
        success: true,
        message: 'Avatar updated successfully',
        data: user,
    });
}));
/**
 * @route   DELETE /api/v1/users/avatar
 * @desc    Delete user avatar
 * @access  Protected
 */
router.delete('/avatar', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const user = await server_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { avatar: true },
    });
    if (user?.avatar) {
        // Delete file from filesystem
        const fs = require('fs').promises;
        const avatarPath = path_1.default.join('uploads/avatars', path_1.default.basename(user.avatar));
        try {
            await fs.unlink(avatarPath);
        }
        catch (error) {
            console.error('Failed to delete avatar file:', error);
        }
        // Update user record
        await server_1.prisma.user.update({
            where: { id: req.user.id },
            data: { avatar: null },
        });
        (0, logger_middleware_1.auditLog)('AVATAR_DELETED', req.user.id, {}, req.ip);
    }
    res.json({
        success: true,
        message: 'Avatar deleted successfully',
    });
}));
/**
 * @route   PUT /api/v1/users/password
 * @desc    Change user password
 * @access  Protected
 */
router.put('/password', (0, authservice_1.requireAuth)(), [
    (0, express_validator_1.body)('currentPassword').notEmpty().withMessage('Current password required'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number and special character'),
    (0, express_validator_1.body)('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error('Password confirmation does not match');
        }
        return true;
    }),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    // Get current user with password
    const user = await server_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, password: true, email: true },
    });
    if (!user) {
        throw new error_middleware_2.AppError('User not found', 404);
    }
    // Verify current password
    const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password);
    if (!isValidPassword) {
        throw new error_middleware_2.AppError('Current password is incorrect', 400);
    }
    // Hash new password
    const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
    // Update password
    await server_1.prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashedPassword },
    });
    // Send email notification
    await emailservice_1.emailService.sendPasswordChangeNotification(user.email);
    (0, logger_middleware_1.auditLog)('PASSWORD_CHANGED', req.user.id, {}, req.ip);
    res.json({
        success: true,
        message: 'Password changed successfully',
    });
}));
/**
 * @route   GET /api/v1/users/dashboard
 * @desc    Get user dashboard data
 * @access  Protected
 */
router.get('/dashboard', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    if (userRole === client_1.UserRole.CUSTOMER) {
        // Customer dashboard
        const [bookings, upcomingBookings, reviews, favoriteProperties] = await Promise.all([
            server_1.prisma.booking.findMany({
                where: { customerId: userId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    property: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            city: true,
                            images: true,
                        },
                    },
                },
            }),
            server_1.prisma.booking.findMany({
                where: {
                    customerId: userId,
                    status: 'APPROVED',
                    checkInDate: { gte: new Date() },
                },
                orderBy: { checkInDate: 'asc' },
                take: 3,
                include: {
                    property: {
                        select: {
                            id: true,
                            name: true,
                            city: true,
                            images: true,
                        },
                    },
                },
            }),
            server_1.prisma.review.count({
                where: { customerId: userId },
            }),
            server_1.prisma.favorite.findMany({
                where: { userId },
                take: 5,
                include: {
                    property: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            city: true,
                            baseRate: true,
                            images: true,
                        },
                    },
                },
            }),
        ]);
        res.json({
            success: true,
            data: {
                bookings: {
                    recent: bookings,
                    upcoming: upcomingBookings,
                    total: bookings.length,
                },
                reviews: {
                    total: reviews,
                },
                favorites: favoriteProperties,
            },
        });
    }
    else if (userRole === client_1.UserRole.ADMIN) {
        // Property host dashboard
        const [properties, bookings, earnings, reviews] = await Promise.all([
            server_1.prisma.property.findMany({
                where: { hostId: userId },
                include: {
                    _count: {
                        select: { bookings: true },
                    },
                },
            }),
            server_1.prisma.booking.findMany({
                where: {
                    property: { hostId: userId },
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
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
            server_1.prisma.booking.aggregate({
                where: {
                    property: { hostId: userId },
                    paymentStatus: 'PAID',
                },
                _sum: { total: true },
            }),
            server_1.prisma.review.findMany({
                where: {
                    property: { hostId: userId },
                    approved: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    customer: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                    property: {
                        select: { name: true },
                    },
                },
            }),
        ]);
        res.json({
            success: true,
            data: {
                properties: {
                    total: properties.length,
                    active: properties.filter(p => p.status === 'ACTIVE').length,
                    pending: properties.filter(p => p.status === 'PENDING').length,
                },
                bookings: {
                    recent: bookings,
                    total: bookings.length,
                    pending: bookings.filter(b => b.status === 'PENDING').length,
                },
                earnings: {
                    total: earnings._sum.total || 0,
                },
                reviews: {
                    recent: reviews,
                    total: reviews.length,
                },
            },
        });
    }
}));
/**
 * @route   POST /api/v1/users/favorites/:propertyId
 * @desc    Add property to favorites
 * @access  Protected
 */
router.post('/favorites/:propertyId', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { propertyId } = req.params;
    // Check if property exists
    const property = await server_1.prisma.property.findUnique({
        where: { id: propertyId },
    });
    if (!property) {
        throw new error_middleware_2.AppError('Property not found', 404);
    }
    // Check if already favorited
    const existing = await server_1.prisma.favorite.findUnique({
        where: {
            userId_propertyId: {
                userId: req.user.id,
                propertyId,
            },
        },
    });
    if (existing) {
        throw new error_middleware_2.AppError('Property already in favorites', 400);
    }
    // Add to favorites
    await server_1.prisma.favorite.create({
        data: {
            userId: req.user.id,
            propertyId,
        },
    });
    res.json({
        success: true,
        message: 'Property added to favorites',
    });
}));
/**
 * @route   DELETE /api/v1/users/favorites/:propertyId
 * @desc    Remove property from favorites
 * @access  Protected
 */
router.delete('/favorites/:propertyId', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { propertyId } = req.params;
    await server_1.prisma.favorite.delete({
        where: {
            userId_propertyId: {
                userId: req.user.id,
                propertyId,
            },
        },
    });
    res.json({
        success: true,
        message: 'Property removed from favorites',
    });
}));
/**
 * @route   GET /api/v1/users/favorites
 * @desc    Get user's favorite properties
 * @access  Protected
 */
router.get('/favorites', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20, } = req.query;
    const [favorites, total] = await Promise.all([
        server_1.prisma.favorite.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
            include: {
                property: {
                    include: {
                        host: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                        reviews: {
                            where: { approved: true },
                            select: { rating: true },
                        },
                    },
                },
            },
        }),
        server_1.prisma.favorite.count({
            where: { userId: req.user.id },
        }),
    ]);
    // Calculate average ratings
    const favoritesWithRatings = favorites.map(fav => {
        const ratings = fav.property.reviews.map(r => r.rating);
        const averageRating = ratings.length > 0
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
            : 0;
        return {
            ...fav,
            property: {
                ...fav.property,
                averageRating: Math.round(averageRating * 10) / 10,
                reviewCount: ratings.length,
                reviews: undefined,
            },
        };
    });
    res.json({
        success: true,
        data: {
            favorites: favoritesWithRatings,
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
 * @route   DELETE /api/v1/users/account
 * @desc    Delete user account
 * @access  Protected
 */
router.delete('/account', (0, authservice_1.requireAuth)(), [
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password required for account deletion'),
    (0, express_validator_1.body)('confirmDelete').equals('DELETE').withMessage('Must confirm deletion by typing DELETE'),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { password } = req.body;
    // Get user with password
    const user = await server_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            password: true,
            email: true,
            firstName: true,
            lastName: true,
        },
    });
    if (!user) {
        throw new error_middleware_2.AppError('User not found', 404);
    }
    // Verify password
    const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
    if (!isValidPassword) {
        throw new error_middleware_2.AppError('Invalid password', 400);
    }
    // Check for active bookings
    const activeBookings = await server_1.prisma.booking.count({
        where: {
            customerId: req.user.id,
            status: {
                in: ['PENDING', 'APPROVED'],
            },
        },
    });
    if (activeBookings > 0) {
        throw new error_middleware_2.AppError('Cannot delete account with active bookings', 400);
    }
    // Soft delete - mark as deleted instead of actually deleting
    await server_1.prisma.user.update({
        where: { id: req.user.id },
        data: {
            status: client_1.UserStatus.DELETED,
            email: `deleted_${Date.now()}_${user.email}`,
            deletedAt: new Date(),
        },
    });
    // Send confirmation email
    await emailservice_1.emailService.sendAccountDeletionConfirmation(user.email, `${user.firstName} ${user.lastName}`);
    (0, logger_middleware_1.auditLog)('ACCOUNT_DELETED', req.user.id, {
        email: user.email,
    }, req.ip);
    res.json({
        success: true,
        message: 'Account deleted successfully',
    });
}));
exports.default = router;
