"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// MAR ABU PROJECTS SERVICES LLC - Review Management Routes
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const authservice_1 = require("../services/authservice");
const error_middleware_1 = require("../middlewares/error.middleware");
const error_middleware_2 = require("../middlewares/error.middleware");
const server_1 = require("../server");
const logger_middleware_1 = require("../middlewares/logger.middleware");
const emailservice_1 = require("../services/emailservice");
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
// REVIEW ROUTES
// ===============================
/**
 * @route   GET /api/v1/reviews
 * @desc    Get reviews with filters
 * @access  Public
 */
router.get('/', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20, propertyId, customerId, rating, approved, featured, sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
    // Build where clause
    const where = {};
    if (propertyId)
        where.propertyId = propertyId;
    if (customerId)
        where.customerId = customerId;
    if (rating)
        where.rating = parseInt(rating);
    if (approved !== undefined)
        where.approved = approved === 'true';
    if (featured !== undefined)
        where.featured = featured === 'true';
    // For public view, only show approved reviews
    if (!req.user || req.user.role === client_1.UserRole.CUSTOMER) {
        where.approved = true;
    }
    const [reviews, total] = await Promise.all([
        server_1.prisma.review.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
            include: {
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                    },
                },
                property: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        images: true,
                    },
                },
                booking: {
                    select: {
                        bookingCode: true,
                        checkInDate: true,
                        checkOutDate: true,
                    },
                },
            },
        }),
        server_1.prisma.review.count({ where }),
    ]);
    res.json({
        success: true,
        data: {
            reviews,
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
 * @route   GET /api/v1/reviews/:id
 * @desc    Get review details
 * @access  Public (if approved), Protected (if not approved)
 */
router.get('/:id', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const review = await server_1.prisma.review.findUnique({
        where: { id: req.params.id },
        include: {
            customer: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                },
            },
            property: {
                select: {
                    id: true,
                    name: true,
                    type: true,
                    images: true,
                    hostId: true,
                },
            },
            booking: {
                select: {
                    bookingCode: true,
                    checkInDate: true,
                    checkOutDate: true,
                },
            },
        },
    });
    if (!review) {
        throw new error_middleware_2.AppError('Review not found', 404);
    }
    // Check if review is approved or user has permission to view
    if (!review.approved) {
        if (!req.user) {
            throw new error_middleware_2.AppError('Review not found', 404);
        }
        const isOwner = review.customerId === req.user.id;
        const isHost = review.property.hostId === req.user.id;
        const isAdmin = req.user.role === client_1.UserRole.ADMIN;
        if (!isOwner && !isHost && !isAdmin) {
            throw new error_middleware_2.AppError('Review not found', 404);
        }
    }
    res.json({
        success: true,
        data: review,
    });
}));
/**
 * @route   POST /api/v1/reviews
 * @desc    Create new review
 * @access  Protected (booking owner only)
 */
router.post('/', (0, authservice_1.requireAuth)(), [
    (0, express_validator_1.body)('bookingId').isString().withMessage('Booking ID required'),
    (0, express_validator_1.body)('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    (0, express_validator_1.body)('title').trim().notEmpty().withMessage('Review title required'),
    (0, express_validator_1.body)('comment').trim().notEmpty().withMessage('Review comment required'),
    (0, express_validator_1.body)('cleanliness').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('communication').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('checkIn').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('accuracy').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('location').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('value').optional().isInt({ min: 1, max: 5 }),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { bookingId, rating, title, comment, cleanliness, communication, checkIn, accuracy, location, value, } = req.body;
    // Check booking exists and is completed
    const booking = await server_1.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            property: {
                select: {
                    id: true,
                    name: true,
                    hostId: true,
                    host: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            },
            review: true,
        },
    });
    if (!booking) {
        throw new error_middleware_2.AppError('Booking not found', 404);
    }
    // Only booking owner can create review
    if (booking.customerId !== req.user.id) {
        throw new error_middleware_2.AppError('Not authorized to review this booking', 403);
    }
    // Booking must be completed
    if (booking.status !== client_1.BookingStatus.COMPLETED) {
        throw new error_middleware_2.AppError('Can only review completed bookings', 400);
    }
    // Check if review already exists
    if (booking.review?.comment && booking.review.comment.length > 0) {
        throw new error_middleware_2.AppError('Review already exists for this booking', 400);
    }
    // Check if checkout date has passed
    if (new Date() < booking.checkOutDate) {
        throw new error_middleware_2.AppError('Cannot review booking before checkout date', 400);
    }
    // Create review
    const review = await server_1.prisma.review.create({
        data: {
            bookingId,
            propertyId: booking.propertyId,
            customerId: req.user.id,
            rating,
            title,
            comment,
            cleanliness,
            communication,
            checkIn,
            accuracy,
            location,
            value,
            approved: false, // Reviews require approval
        },
        include: {
            property: {
                select: {
                    name: true,
                },
            },
        },
    });
    // Create notification for property host
    await server_1.prisma.notification.create({
        data: {
            userId: booking.property.hostId,
            type: 'REVIEW_RECEIVED',
            title: 'New Review Received',
            message: `${req.user.firstName} ${req.user.lastName} left a review for ${booking.property.name}`,
            metadata: {
                reviewId: review.id,
                bookingId,
                rating,
            },
        },
    });
    // Send email notification to host
    await emailservice_1.emailService.sendReviewRequestEmail(booking.property.host.email, {
        hostName: `${booking.property.host.firstName} ${booking.property.host.lastName}`,
        customerName: `${req.user.firstName} ${req.user.lastName}`,
        propertyName: booking.property.name,
        rating,
        title,
    });
    (0, logger_middleware_1.auditLog)('REVIEW_CREATED', req.user.id, {
        reviewId: review.id,
        bookingId,
        propertyId: booking.propertyId,
        rating,
    }, req.ip);
    res.status(201).json({
        success: true,
        message: 'Review submitted successfully. It will be reviewed before publication.',
        data: review,
    });
}));
/**
 * @route   PUT /api/v1/reviews/:id
 * @desc    Update review
 * @access  Protected (review owner only, before approval)
 */
router.put('/:id', (0, authservice_1.requireAuth)(), [
    (0, express_validator_1.param)('id').isString(),
    (0, express_validator_1.body)('rating').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('title').optional().trim().notEmpty(),
    (0, express_validator_1.body)('comment').optional().trim().notEmpty(),
    (0, express_validator_1.body)('cleanliness').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('communication').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('checkIn').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('accuracy').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('location').optional().isInt({ min: 1, max: 5 }),
    (0, express_validator_1.body)('value').optional().isInt({ min: 1, max: 5 }),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const review = await server_1.prisma.review.findUnique({
        where: { id: req.params.id },
    });
    if (!review) {
        throw new error_middleware_2.AppError('Review not found', 404);
    }
    // Only review owner can update
    if (review.customerId !== req.user.id) {
        throw new error_middleware_2.AppError('Not authorized to update this review', 403);
    }
    // Can only update unapproved reviews
    if (review.approved) {
        throw new error_middleware_2.AppError('Cannot update approved review', 400);
    }
    const updatedReview = await server_1.prisma.review.update({
        where: { id: req.params.id },
        data: req.body,
    });
    (0, logger_middleware_1.auditLog)('REVIEW_UPDATED', req.user.id, {
        reviewId: req.params.id,
        changes: req.body,
    }, req.ip);
    res.json({
        success: true,
        message: 'Review updated successfully',
        data: updatedReview,
    });
}));
/**
 * @route   DELETE /api/v1/reviews/:id
 * @desc    Delete review
 * @access  Protected (review owner, admin)
 */
router.delete('/:id', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const review = await server_1.prisma.review.findUnique({
        where: { id: req.params.id },
    });
    if (!review) {
        throw new error_middleware_2.AppError('Review not found', 404);
    }
    // Check authorization
    const isOwner = review.customerId === req.user.id;
    const isAdmin = req.user.role === client_1.UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
        throw new error_middleware_2.AppError('Not authorized to delete this review', 403);
    }
    await server_1.prisma.review.delete({
        where: { id: req.params.id },
    });
    (0, logger_middleware_1.auditLog)('REVIEW_DELETED', req.user.id, {
        reviewId: req.params.id,
    }, req.ip);
    res.json({
        success: true,
        message: 'Review deleted successfully',
    });
}));
// ===============================
// ADMIN REVIEW MANAGEMENT
// ===============================
/**
 * @route   PUT /api/v1/reviews/:id/approve
 * @desc    Approve/reject review
 * @access  Admin only
 */
router.put("/:id/approve", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.param)("id").isString(),
    (0, express_validator_1.body)("approved").isBoolean().withMessage("Approved status required"),
    (0, express_validator_1.body)("adminNotes").optional().isString(),
    (0, express_validator_1.body)("featured").optional().isBoolean(),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { approved, adminNotes, featured } = req.body;
    const review = await server_1.prisma.review.findUnique({
        where: { id: req.params.id },
        include: {
            customer: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
            property: {
                select: {
                    name: true,
                },
            },
        },
    });
    if (!review) {
        throw new error_middleware_2.AppError("Review not found", 404);
    }
    const updatedReview = await server_1.prisma.review.update({
        where: { id: req.params.id },
        data: {
            approved,
            adminNotes,
            featured: featured || false,
            approvedAt: approved ? new Date() : null,
            approvedBy: approved ? req.user.id : null,
        },
    });
    // Create notification for customer
    await server_1.prisma.notification.create({
        data: {
            userId: review.customerId,
            type: approved ? "REVIEW_APPROVED" : "REVIEW_REJECTED",
            title: approved ? "Review Approved" : "Review Rejected",
            message: approved
                ? `Your review for ${review.property.name} has been approved and published.`
                : `Your review for ${review.property.name} has been rejected.${adminNotes ? ` Reason: ${adminNotes}` : ""}`,
            metadata: {
                reviewId: review.id,
                approved,
            },
        },
    });
    // Send email notification
    await emailservice_1.emailService.sendReviewStatusUpdate(review.customer.email, {
        customerName: `${review.customer.firstName} ${review.customer.lastName}`,
        propertyName: review.property.name,
        approved,
        adminNotes,
    });
    (0, logger_middleware_1.auditLog)("REVIEW_STATUS_UPDATED", req.user.id, {
        reviewId: req.params.id,
        approved,
        adminNotes,
        featured,
    }, req.ip);
    res.json({
        success: true,
        message: `Review ${approved ? "approved" : "rejected"} successfully`,
        data: updatedReview,
    });
}));
/**
 * @route   GET /api/v1/reviews/pending
 * @desc    Get pending reviews for approval
 * @access  Admin only
 */
router.get("/pending", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc", } = req.query;
    const [reviews, total] = await Promise.all([
        server_1.prisma.review.findMany({
            where: { approved: false },
            orderBy: { [sortBy]: sortOrder },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
            include: {
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        avatar: true,
                    },
                },
                property: {
                    select: {
                        name: true,
                        type: true,
                    },
                },
                booking: {
                    select: {
                        bookingCode: true,
                        checkInDate: true,
                        checkOutDate: true,
                    },
                },
            },
        }),
        server_1.prisma.review.count({ where: { approved: false } }),
    ]);
    res.json({
        success: true,
        data: {
            reviews,
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
 * @route   GET /api/v1/reviews/property/:propertyId/stats
 * @desc    Get review statistics for property
 * @access  Public
 */
router.get('/property/:propertyId/stats', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { propertyId } = req.params;
    const [reviews, ratingDistribution] = await Promise.all([
        server_1.prisma.review.findMany({
            where: {
                propertyId,
                approved: true,
            },
            select: {
                rating: true,
                cleanliness: true,
                communication: true,
                checkIn: true,
                accuracy: true,
                location: true,
                value: true,
            },
        }),
        server_1.prisma.review.groupBy({
            by: ['rating'],
            where: {
                propertyId,
                approved: true,
            },
            _count: {
                rating: true,
            },
        }),
    ]);
    if (reviews.length === 0) {
        return res.json({
            success: true,
            data: {
                totalReviews: 0,
                averageRating: 0,
                ratingDistribution: {},
                categoryAverages: {},
            },
        });
    }
    // Calculate overall average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    // Calculate category averages
    const categories = [
        "cleanliness",
        "communication",
        "checkIn",
        "accuracy",
        "location",
        "value",
    ];
    const categoryAverages = categories.reduce((acc, category) => {
        const validRatings = reviews
            .filter((r) => r[category] !== null)
            .map((r) => r[category]);
        if (validRatings.length > 0) {
            acc[category] =
                validRatings.reduce((sum, rating) => sum + rating, 0) /
                    validRatings.length;
        }
        return acc;
    }, {});
    // Format rating distribution
    const distribution = ratingDistribution.reduce((acc, item) => {
        acc[item.rating] = item._count.rating;
        return acc;
    }, {});
    res.json({
        success: true,
        data: {
            totalReviews: reviews.length,
            averageRating: Math.round(averageRating * 10) / 10,
            ratingDistribution: distribution,
            categoryAverages: Object.keys(categoryAverages).reduce((acc, key) => {
                acc[key] = Math.round(categoryAverages[key] * 10) / 10;
                return acc;
            }, {}),
        },
    });
}));
exports.default = router;
