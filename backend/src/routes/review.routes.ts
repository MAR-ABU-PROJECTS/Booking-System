// MAR ABU PROJECTS SERVICES LLC - Review Management Routes
import { Router } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { BookingStatus, UserRole } from '@prisma/client'
import { requireAuth } from '../services/authservice'
import { asyncHandler } from '../middleware/error.middleware'
import { AppError } from '../middleware/error.middleware'
import { prisma } from '../server'
import { auditLog } from '../middleware/logger.middleware'
import { emailService } from '../services/emailservice'

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
// REVIEW ROUTES
// ===============================

/**
 * @route   GET /api/v1/reviews
 * @desc    Get reviews with filters
 * @access  Public
 */
router.get(
  '/',
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      propertyId,
      customerId,
      rating,
      approved,
      featured,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query

    // Build where clause
    const where: any = {}
    if (propertyId) where.propertyId = propertyId
    if (customerId) where.customerId = customerId
    if (rating) where.rating = parseInt(rating)
    if (approved !== undefined) where.approved = approved === 'true'
    if (featured !== undefined) where.featured = featured === 'true'

    // For public view, only show approved reviews
    if (!req.user || req.user.role === UserRole.CUSTOMER) {
      where.approved = true
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
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
            },
          },
          booking: {
            select: {
              bookingNumber: true,
              checkIn: true,
              checkOut: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
    ])

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
    })
  })
)

/**
 * @route   GET /api/v1/reviews/property/:propertyId/stats
 * @desc    Get review statistics for a property
 * @access  Public
 */
router.get(
  '/property/:propertyId/stats',
  asyncHandler(async (req: any, res: any) => {
    const { propertyId } = req.params

    const [stats, distribution] = await Promise.all([
      // Overall statistics
      prisma.review.aggregate({
        where: { propertyId, approved: true },
        _avg: {
          rating: true,
          cleanlinessRating: true,
          communicationRating: true,
          checkInRating: true,
          accuracyRating: true,
          locationRating: true,
          valueRating: true,
        },
        _count: true,
      }),
      // Rating distribution
      prisma.review.groupBy({
        by: ['rating'],
        where: { propertyId, approved: true },
        _count: true,
        orderBy: { rating: 'desc' },
      }),
    ])

    const ratingDistribution = [5, 4, 3, 2, 1].map(rating => {
      const found = distribution.find(d => d.rating === rating)
      return {
        rating,
        count: found?._count || 0,
        percentage: stats._count > 0 ? ((found?._count || 0) / stats._count) * 100 : 0,
      }
    })

    res.json({
      success: true,
      data: {
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count,
        breakdown: {
          cleanliness: stats._avg.cleanlinessRating || 0,
          communication: stats._avg.communicationRating || 0,
          checkIn: stats._avg.checkInRating || 0,
          accuracy: stats._avg.accuracyRating || 0,
          location: stats._avg.locationRating || 0,
          value: stats._avg.valueRating || 0,
        },
        distribution: ratingDistribution,
      },
    })
  })
)

/**
 * @route   POST /api/v1/reviews/booking/:bookingId
 * @desc    Create review for a completed booking
 * @access  Protected (booking owner)
 */
router.post(
  '/booking/:bookingId',
  requireAuth(),
  [
    param('bookingId').isString(),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').trim().isLength({ min: 10 }).withMessage('Comment must be at least 10 characters'),
    body('cleanlinessRating').optional().isInt({ min: 1, max: 5 }),
    body('communicationRating').optional().isInt({ min: 1, max: 5 }),
    body('checkInRating').optional().isInt({ min: 1, max: 5 }),
    body('accuracyRating').optional().isInt({ min: 1, max: 5 }),
    body('locationRating').optional().isInt({ min: 1, max: 5 }),
    body('valueRating').optional().isInt({ min: 1, max: 5 }),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { bookingId } = req.params

    // Check if booking exists and belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            hostId: true,
          },
        },
      },
    })

    if (!booking) {
      throw new AppError('Booking not found', 404)
    }

    if (booking.customerId !== req.user.id) {
      throw new AppError('Not authorized to review this booking', 403)
    }

    // Check if booking is completed
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new AppError('Can only review completed bookings', 400)
    }

    // Check if review already exists
    const existingReview = await prisma.review.findFirst({
      where: {
        bookingId,
        customerId: req.user.id,
      },
    })

    if (existingReview) {
      throw new AppError('You have already reviewed this booking', 400)
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        bookingId,
        propertyId: booking.propertyId,
        customerId: req.user.id,
        rating: req.body.rating,
        comment: req.body.comment,
        cleanlinessRating: req.body.cleanlinessRating,
        communicationRating: req.body.communicationRating,
        checkInRating: req.body.checkInRating,
        accuracyRating: req.body.accuracyRating,
        locationRating: req.body.locationRating,
        valueRating: req.body.valueRating,
        approved: false, // Reviews need approval
      },
    })

    // Create notification for property host
    await prisma.notification.create({
      data: {
        userId: booking.property.hostId,
        type: 'REVIEW_REQUEST',
        title: 'New Review Posted',
        message: `A new review has been posted for ${booking.property.name}`,
        data: {
          reviewId: review.id,
          bookingId: booking.id,
          propertyId: booking.propertyId,
        },
      },
    })

    auditLog('REVIEW_CREATED', req.user.id, {
      reviewId: review.id,
      bookingId: booking.id,
      propertyId: booking.propertyId,
      rating: review.rating,
    }, req.ip)

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will be visible after approval.',
      data: review,
    })
  })
)

/**
 * @route   PUT /api/v1/reviews/:id
 * @desc    Update review (before approval)
 * @access  Protected (review owner)
 */
router.put(
  '/:id',
  requireAuth(),
  [
    param('id').isString(),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('comment').optional().trim().isLength({ min: 10 }),
    body('cleanlinessRating').optional().isInt({ min: 1, max: 5 }),
    body('communicationRating').optional().isInt({ min: 1, max: 5 }),
    body('checkInRating').optional().isInt({ min: 1, max: 5 }),
    body('accuracyRating').optional().isInt({ min: 1, max: 5 }),
    body('locationRating').optional().isInt({ min: 1, max: 5 }),
    body('valueRating').optional().isInt({ min: 1, max: 5 }),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params

    const review = await prisma.review.findUnique({
      where: { id },
    })

    if (!review) {
      throw new AppError('Review not found', 404)
    }

    if (review.customerId !== req.user.id) {
      throw new AppError('Not authorized to update this review', 403)
    }

    if (review.approved) {
      throw new AppError('Cannot update approved reviews', 400)
    }

    // Update review
    const updated = await prisma.review.update({
      where: { id },
      data: req.body,
    })

    auditLog('REVIEW_UPDATED', req.user.id, {
      reviewId: review.id,
      changes: req.body,
    }, req.ip)

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: updated,
    })
  })
)

/**
 * @route   POST /api/v1/reviews/:id/response
 * @desc    Add host response to review
 * @access  Property Host (property owner)
 */
router.post(
  '/:id/response',
  requireAuth(UserRole.PROPERTY_HOST),
  [
    param('id').isString(),
    body('response').trim().notEmpty().withMessage('Response is required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params
    const { response } = req.body

    // Get review with property
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        property: {
          select: { hostId: true },
        },
      },
    })

    if (!review) {
      throw new AppError('Review not found', 404)
    }

    // Check if user is the property host
    if (review.property.hostId !== req.user.id && req.user.role !== UserRole.ADMIN) {
      throw new AppError('Not authorized to respond to this review', 403)
    }

    if (!review.approved) {
      throw new AppError('Cannot respond to unapproved reviews', 400)
    }

    // Update review with response
    const updated = await prisma.review.update({
      where: { id },
      data: {
        hostResponse: response,
        hostResponseAt: new Date(),
      },
    })

    auditLog('REVIEW_RESPONSE_ADDED', req.user.id, {
      reviewId: review.id,
      propertyId: review.propertyId,
    }, req.ip)

    res.json({
      success: true,
      message: 'Response added successfully',
      data: updated,
    })
  })
)

/**
 * @route   PATCH /api/v1/reviews/:id/approve
 * @desc    Approve or reject review
 * @access  Admin only
 */
router.patch(
  '/:id/approve',
  requireAuth(UserRole.ADMIN),
  [
    param('id').isString(),
    body('approved').isBoolean().withMessage('Approved status required'),
    body('featured').optional().isBoolean(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params
    const { approved, featured } = req.body

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            email: true,
            firstName: true,
          },
        },
        property: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!review) {
      throw new AppError('Review not found', 404)
    }

    // Update review
    const updated = await prisma.review.update({
      where: { id },
      data: {
        approved,
        featured: featured || false,
      },
    })

    // Create notification for reviewer
    if (approved) {
      await prisma.notification.create({
        data: {
          userId: review.customerId,
          type: 'SYSTEM_UPDATE',
          title: 'Review Approved',
          message: `Your review for ${review.property.name} has been approved and is now visible.`,
          data: {
            reviewId: review.id,
            propertyId: review.propertyId,
          },
        },
      })
    }

    auditLog('REVIEW_MODERATED', req.user.id, {
      reviewId: review.id,
      approved,
      featured,
    }, req.ip)

    res.json({
      success: true,
      message: `Review ${approved ? 'approved' : 'rejected'} successfully`,
      data: updated,
    })
  })
)

/**
 * @route   DELETE /api/v1/reviews/:id
 * @desc    Delete review
 * @access  Admin only
 */
router.delete(
  '/:id',
  requireAuth(UserRole.ADMIN),
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params

    const review = await prisma.review.findUnique({
      where: { id },
    })

    if (!review) {
      throw new AppError('Review not found', 404)
    }

    // Delete review
    await prisma.review.delete({
      where: { id },
    })

    auditLog('REVIEW_DELETED', req.user.id, {
      reviewId: id,
      propertyId: review.propertyId,
    }, req.ip)

    res.json({
      success: true,
      message: 'Review deleted successfully',
    })
  })
)

export default router