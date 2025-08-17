// MAR ABU PROJECTS SERVICES LLC - Review Management Routes
import { Router } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { BookingStatus, UserRole } from '@prisma/client'
import { requireAuth } from '../services/authservice'
import { asyncHandler } from '../middlewares/error.middleware'
import { AppError } from '../middlewares/error.middleware'
import { prisma } from '../server'
import { auditLog } from '../middlewares/logger.middleware'
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
 * @route   GET /reviews
 * @desc    Get reviews with filters
 * @access  Public
 */
/**
 * @swagger
 * /reviews:
 *   get:
 *     summary: Get reviews with filters
 *     description: Fetches reviews with optional filters. Public users (or customers) will only see approved reviews. Admins and hosts can see all depending on filters.
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *         description: Filter by property ID
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *         description: Filter by customer ID
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *         description: Filter by rating value
 *       - in: query
 *         name: approved
 *         schema:
 *           type: boolean
 *         description: Filter by approval status (Admins only)
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filter by featured reviews
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *           enum: [createdAt, rating]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           default: desc
 *           enum: [asc, desc]
 *         description: Sorting order
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
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
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           rating:
 *                             type: integer
 *                           comment:
 *                             type: string
 *                           approved:
 *                             type: boolean
 *                           featured:
 *                             type: boolean
 *                           customer:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               firstName:
 *                                 type: string
 *                               lastName:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                           property:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                               images:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                           booking:
 *                             type: object
 *                             properties:
 *                               bookingCode:
 *                                 type: string
 *                               checkInDate:
 *                                 type: string
 *                                 format: date
 *                               checkOutDate:
 *                                 type: string
 *                                 format: date
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
 * @route   GET /reviews/:id
 * @desc    Get review details
 * @access  Public (if approved), Protected (if not approved)
 */
/**
 * @swagger
 * /reviews/{id}:
 *   get:
 *     summary: Get a single review by ID
 *     description: >
 *       Retrieves detailed information about a review by its ID.  
 *       - If the review is **approved**, anyone can view it.  
 *       - If the review is **not approved**, only the review owner, the property host, or an admin can view it.  
 *     tags:
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The review ID
 *     responses:
 *       200:
 *         description: Review details retrieved successfully
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
 *                       example: "rev_12345"
 *                     rating:
 *                       type: number
 *                       example: 4
 *                     comment:
 *                       type: string
 *                       example: "Great stay, highly recommended!"
 *                     approved:
 *                       type: boolean
 *                       example: true
 *                     customer:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "user_5678"
 *                         firstName:
 *                           type: string
 *                           example: "John"
 *                         lastName:
 *                           type: string
 *                           example: "Doe"
 *                         avatar:
 *                           type: string
 *                           example: "https://cdn.example.com/avatars/johndoe.png"
 *                     property:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "prop_8901"
 *                         name:
 *                           type: string
 *                           example: "Luxury Villa"
 *                         type:
 *                           type: string
 *                           example: "Apartment"
 *                         images:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["https://cdn.example.com/property/img1.jpg"]
 *                         hostId:
 *                           type: string
 *                           example: "host_123"
 *                     booking:
 *                       type: object
 *                       properties:
 *                         bookingCode:
 *                           type: string
 *                           example: "BK202501"
 *                         checkInDate:
 *                           type: string
 *                           format: date
 *                           example: "2025-08-01"
 *                         checkOutDate:
 *                           type: string
 *                           format: date
 *                           example: "2025-08-05"
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Review not found"
 */
router.get(
  '/:id',
  asyncHandler(async (req: any, res: any) => {
    const review = await prisma.review.findUnique({
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
    })

    if (!review) {
      throw new AppError('Review not found', 404)
    }

    // Check if review is approved or user has permission to view
    if (!review.approved) {
      if (!req.user) {
        throw new AppError('Review not found', 404)
      }

      const isOwner = review.customerId === req.user.id
      const isHost = review.property.hostId === req.user.id
      const isAdmin = req.user.role === UserRole.ADMIN

      if (!isOwner && !isHost && !isAdmin) {
        throw new AppError('Review not found', 404)
      }
    }

    res.json({
      success: true,
      data: review,
    })
  })
)

/**
 * @route   POST /reviews
 * @desc    Create new review
 * @access  Protected (booking owner only)
 */
/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Submit a review for a completed booking
 *     description: >
 *       Allows a **customer** to submit a review for a completed booking.  
 *       - Only the booking owner can create a review.  
 *       - Reviews require admin approval before becoming public.  
 *       - Notifications and email are sent to the host after submission.  
 *     tags:
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - rating
 *               - title
 *               - comment
 *             properties:
 *               bookingId:
 *                 type: string
 *                 example: "bk_123456"
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               title:
 *                 type: string
 *                 example: "Amazing stay!"
 *               comment:
 *                 type: string
 *                 example: "The property was clean and comfortable. Would stay again."
 *               cleanliness:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               communication:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               checkIn:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               accuracy:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               location:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               value:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *     responses:
 *       201:
 *         description: Review submitted successfully (pending approval)
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
 *                   example: "Review submitted successfully. It will be reviewed before publication."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "rev_12345"
 *                     bookingId:
 *                       type: string
 *                       example: "bk_123456"
 *                     propertyId:
 *                       type: string
 *                       example: "prop_6789"
 *                     customerId:
 *                       type: string
 *                       example: "cust_9876"
 *                     rating:
 *                       type: integer
 *                       example: 5
 *                     title:
 *                       type: string
 *                       example: "Amazing stay!"
 *                     comment:
 *                       type: string
 *                       example: "The property was clean and comfortable. Would stay again."
 *                     approved:
 *                       type: boolean
 *                       example: false
 *                     property:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "Luxury Villa"
 *       400:
 *         description: Validation error or business rule violation (e.g., booking not completed, already reviewed, etc.)
 *       403:
 *         description: Not authorized to review this booking
 *       404:
 *         description: Booking not found
 */
router.post(
  '/',
  requireAuth(),
  [
    body('bookingId').isString().withMessage('Booking ID required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('title').trim().notEmpty().withMessage('Review title required'),
    body('comment').trim().notEmpty().withMessage('Review comment required'),
    body('cleanliness').optional().isInt({ min: 1, max: 5 }),
    body('communication').optional().isInt({ min: 1, max: 5 }),
    body('checkIn').optional().isInt({ min: 1, max: 5 }),
    body('accuracy').optional().isInt({ min: 1, max: 5 }),
    body('location').optional().isInt({ min: 1, max: 5 }),
    body('value').optional().isInt({ min: 1, max: 5 }),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const {
      bookingId,
      rating,
      title,
      comment,
      cleanliness,
      communication,
      checkIn,
      accuracy,
      location,
      value,
    } = req.body

    // Check booking exists and is completed
    const booking = await prisma.booking.findUnique({
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
    })

    if (!booking) {
      throw new AppError('Booking not found', 404)
    }

    // Only booking owner can create review
    if (booking.customerId !== req.user.id) {
      throw new AppError('Not authorized to review this booking', 403)
    }

    // Booking must be completed
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new AppError('Can only review completed bookings', 400)
    }

    // Check if review already exists
    if (booking.review?.comment && booking.review.comment.length > 0) {
      throw new AppError('Review already exists for this booking', 400)
    }

    // Check if checkout date has passed
    if (new Date() < booking.checkOutDate) {
      throw new AppError('Cannot review booking before checkout date', 400)
    }

    // Create review
    const review = await prisma.review.create({
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
    })

    // Create notification for property host
    await prisma.notification.create({
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
    })

    // Send email notification to host
    await emailService.sendReviewRequestEmail(
      booking.property.host.email,
      {
        hostName: `${booking.property.host.firstName} ${booking.property.host.lastName}`,
        customerName: `${req.user.firstName} ${req.user.lastName}`,
        propertyName: booking.property.name,
        rating,
        title,
      }
    )

    auditLog('REVIEW_CREATED', req.user.id, {
      reviewId: review.id,
      bookingId,
      propertyId: booking.propertyId,
      rating,
    }, req.ip)

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will be reviewed before publication.',
      data: review,
    })
  })
)

/**
 * @route   PUT /reviews/:id
 * @desc    Update review
 * @access  Protected (review owner only, before approval)
 */
/**
 * @swagger
 * /reviews/{id}:
 *   put:
 *     summary: Update an existing review
 *     description: Allows a customer to update their own unapproved review. Only the review owner can update, and approved reviews cannot be modified.
 *     tags:
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               title:
 *                 type: string
 *                 example: "Great Stay"
 *               comment:
 *                 type: string
 *                 example: "The apartment was clean and well-located."
 *               cleanliness:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               communication:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               checkIn:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               accuracy:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               location:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               value:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *     responses:
 *       200:
 *         description: Review updated successfully
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
 *                   example: Review updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Review'
 *       400:
 *         description: Cannot update approved review
 *       403:
 *         description: Not authorized to update this review
 *       404:
 *         description: Review not found
 */
router.put(
  '/:id',
  requireAuth(),
  [
    param('id').isString(),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('title').optional().trim().notEmpty(),
    body('comment').optional().trim().notEmpty(),
    body('cleanliness').optional().isInt({ min: 1, max: 5 }),
    body('communication').optional().isInt({ min: 1, max: 5 }),
    body('checkIn').optional().isInt({ min: 1, max: 5 }),
    body('accuracy').optional().isInt({ min: 1, max: 5 }),
    body('location').optional().isInt({ min: 1, max: 5 }),
    body('value').optional().isInt({ min: 1, max: 5 }),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const review = await prisma.review.findUnique({
      where: { id: req.params.id },
    })

    if (!review) {
      throw new AppError('Review not found', 404)
    }

    // Only review owner can update
    if (review.customerId !== req.user.id) {
      throw new AppError('Not authorized to update this review', 403)
    }

    // Can only update unapproved reviews
    if (review.approved) {
      throw new AppError('Cannot update approved review', 400)
    }

    const updatedReview = await prisma.review.update({
      where: { id: req.params.id },
      data: req.body,
    })

    auditLog('REVIEW_UPDATED', req.user.id, {
      reviewId: req.params.id,
      changes: req.body,
    }, req.ip)

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview,
    })
  })
)

/**
 * @route   DELETE /reviews/:id
 * @desc    Delete review
 * @access  Protected (review owner, admin)
 */
/**
 * @swagger
 * /reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     description: Deletes a review by ID. Only the review owner or an admin can perform this action.
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
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
 *                   example: Review deleted successfully
 *       403:
 *         description: Not authorized to delete this review
 *       404:
 *         description: Review not found
 */
router.delete(
  '/:id',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const review = await prisma.review.findUnique({
      where: { id: req.params.id },
    })

    if (!review) {
      throw new AppError('Review not found', 404)
    }

    // Check authorization
    const isOwner = review.customerId === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to delete this review', 403)
    }

    await prisma.review.delete({
      where: { id: req.params.id },
    })

    auditLog('REVIEW_DELETED', req.user.id, {
      reviewId: req.params.id,
    }, req.ip)

    res.json({
      success: true,
      message: 'Review deleted successfully',
    })
  })
)

// ===============================
// ADMIN REVIEW MANAGEMENT
// ===============================

/**
 * @route   PUT /reviews/:id/approve
 * @desc    Approve/reject review
 * @access  Admin only
 */
/**
 * @swagger
 * /reviews/{id}/approve:
 *   put:
 *     summary: Approve or reject a review (Admin only)
 *     description: Allows an admin to approve or reject a user review. Also sends a notification and email to the customer.
 *     tags:
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - approved
 *             properties:
 *               approved:
 *                 type: boolean
 *                 description: Whether the review is approved (true) or rejected (false).
 *                 example: true
 *               adminNotes:
 *                 type: string
 *                 description: Optional notes from the admin explaining the decision.
 *                 example: "Great review, fits our policy."
 *               featured:
 *                 type: boolean
 *                 description: Whether the review should be marked as featured.
 *                 example: false
 *     responses:
 *       200:
 *         description: Review approval status updated successfully
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
 *                   example: Review approved successfully
 *                 data:
 *                   type: object
 *                   description: Updated review object
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Forbidden - Only admins can perform this action
 *       404:
 *         description: Review not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id/approve",
  requireAuth({ role: UserRole.ADMIN }),
  [
    param("id").isString(),
    body("approved").isBoolean().withMessage("Approved status required"),
    body("adminNotes").optional().isString(),
    body("featured").optional().isBoolean(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { approved, adminNotes, featured } = req.body;

    const review = await prisma.review.findUnique({
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
      throw new AppError("Review not found", 404);
    }

    const updatedReview = await prisma.review.update({
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
    await prisma.notification.create({
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
    await emailService.sendReviewStatusUpdate(review.customer.email, {
      customerName: `${review.customer.firstName} ${review.customer.lastName}`,
      propertyName: review.property.name,
      approved,
      adminNotes,
    });

    auditLog(
      "REVIEW_STATUS_UPDATED",
      req.user.id,
      {
        reviewId: req.params.id,
        approved,
        adminNotes,
        featured,
      },
      req.ip
    );

    res.json({
      success: true,
      message: `Review ${approved ? "approved" : "rejected"} successfully`,
      data: updatedReview,
    });
  })
);

/**
 * @route   GET /reviews/pending
 * @desc    Get pending reviews for approval
 * @access  Admin only
 */
/**
 * @swagger
 * /reviews/pending:
 *   get:
 *     summary: Get all pending reviews
 *     description: Retrieve a paginated list of reviews that are not yet approved. Only accessible by Admin users.
 *     tags:
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *           enum: [createdAt, rating, updatedAt]
 *         description: Field to sort reviews by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           default: desc
 *           enum: [asc, desc]
 *         description: Sort order (ascending or descending)
 *     responses:
 *       200:
 *         description: List of pending reviews with pagination metadata
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
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           rating:
 *                             type: number
 *                           comment:
 *                             type: string
 *                           approved:
 *                             type: boolean
 *                           customer:
 *                             type: object
 *                             properties:
 *                               firstName:
 *                                 type: string
 *                               lastName:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                           property:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                           booking:
 *                             type: object
 *                             properties:
 *                               bookingCode:
 *                                 type: string
 *                               checkInDate:
 *                                 type: string
 *                                 format: date-time
 *                               checkOutDate:
 *                                 type: string
 *                                 format: date-time
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
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Only admins can access pending reviews
 */
router.get(
  "/pending",
  requireAuth({ role: UserRole.ADMIN }),
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
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
      prisma.review.count({ where: { approved: false } }),
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
  })
);

/**
 * @route   GET /reviews/property/:propertyId/stats
 * @desc    Get review statistics for property
 * @access  Public
 */
/**
 * @swagger
 * /receipts/property/{propertyId}/stats:
 *   get:
 *     summary: Get property review statistics
 *     description: Retrieve aggregated review statistics for a property, including average rating, category averages, and rating distribution.
 *     tags:
 *       - Receipts
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the property
 *     responses:
 *       200:
 *         description: Successfully retrieved property review statistics
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
 *                     totalReviews:
 *                       type: integer
 *                       example: 25
 *                     averageRating:
 *                       type: number
 *                       format: float
 *                       example: 4.3
 *                     ratingDistribution:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                       example:
 *                         5: 12
 *                         4: 8
 *                         3: 3
 *                         2: 1
 *                         1: 1
 *                     categoryAverages:
 *                       type: object
 *                       properties:
 *                         cleanliness:
 *                           type: number
 *                           example: 4.5
 *                         communication:
 *                           type: number
 *                           example: 4.7
 *                         checkIn:
 *                           type: number
 *                           example: 4.6
 *                         accuracy:
 *                           type: number
 *                           example: 4.4
 *                         location:
 *                           type: number
 *                           example: 4.3
 *                         value:
 *                           type: number
 *                           example: 4.2
 *       404:
 *         description: Property not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/property/:propertyId/stats',
  asyncHandler(async (req: any, res: any) => {
    const { propertyId } = req.params

    const [reviews, ratingDistribution] = await Promise.all([
      prisma.review.findMany({
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
      prisma.review.groupBy({
        by: ['rating'],
        where: {
          propertyId,
          approved: true,
        },
        _count: {
          rating: true,
        },
      }),
    ])

    if (reviews.length === 0) {
      return res.json({
        success: true,
        data: {
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: {},
          categoryAverages: {},
        },
      })
    }

    // Calculate overall average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
    const averageRating = totalRating / reviews.length

    // Calculate category averages
    const categories = [
      "cleanliness",
      "communication",
      "checkIn",
      "accuracy",
      "location",
      "value",
    ] as const;
    type Category = (typeof categories)[number];

    const categoryAverages = categories.reduce(
      (acc, category: Category) => {
        const validRatings = reviews
          .filter((r) => r[category] !== null)
          .map((r) => r[category] as number);
        if (validRatings.length > 0) {
          acc[category] =
            validRatings.reduce((sum, rating) => sum + rating, 0) /
            validRatings.length;
        }
        return acc;
      },
      {} as Record<Category, number>
    );


    // Format rating distribution
    const distribution = ratingDistribution.reduce((acc, item) => {
      acc[item.rating] = item._count.rating
      return acc
    }, {} as Record<number, number>)

    res.json({
      success: true,
      data: {
        totalReviews: reviews.length,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution: distribution,
        categoryAverages: Object.keys(categoryAverages).reduce((acc, key) => {
          acc[key] = Math.round(categoryAverages[key as Category] * 10) / 10
          return acc
        }, {} as Record<string, number>),
      },
    })
  })
)

export default router