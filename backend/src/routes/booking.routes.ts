// MAR ABU PROJECTS SERVICES LLC - Booking Routes
import { Router } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { BookingStatus, PaymentStatus, UserRole } from '@prisma/client'
import { requireAuth } from '../services/authservice'
import { asyncHandler } from '../middlewares/error.middleware'
import { AppError } from '../middlewares/error.middleware'
import { prisma } from '../server'
import { auditLog } from '../middlewares/logger.middleware'
import { emailService } from '../services/emailservice'
import { z } from 'zod'

const router = Router()

// Validation schemas
const createBookingSchema = z.object({
  propertyId: z.string(),
  checkIn: z.string().transform(str => new Date(str)),
  checkOut: z.string().transform(str => new Date(str)),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).optional().default(0),
  infants: z.number().int().min(0).optional().default(0),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional(),
  specialRequests: z.string().optional(),
})

const searchBookingsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  status: z.enum(Object.values(BookingStatus) as [string, ...string[]]).optional(),
  paymentStatus: z.enum(Object.values(PaymentStatus) as [string, ...string[]]).optional(),
  propertyId: z.string().optional(),
  customerId: z.string().optional(),
  bookingNumber: z.string().optional(),
  guestEmail: z.string().optional(),
  checkInFrom: z.string().optional(),
  checkInTo: z.string().optional(),
})

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

// Helper function to calculate booking costs
const calculateBookingCosts = (property: any, checkIn: Date, checkOut: Date) => {
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  const subtotal = property.baseRate * nights
  const cleaningFee = property.cleaningFee || 0
  const serviceFee = Math.round(subtotal * 0.1) // 10% service fee
  const total = subtotal + cleaningFee + serviceFee

  return {
    nights,
    subtotal,
    cleaningFee,
    serviceFee,
    total,
  }
}

// ===============================
// BOOKING ROUTES
// ===============================

/**
 * @route   GET /api/v1/bookings
 * @desc    Get bookings with filters
 * @access  Protected
 */
router.get(
  '/',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    try {
      const filters = searchBookingsSchema.parse(req.query)
      const { page, limit, ...where } = filters

      // Build where clause based on user role
      const whereClause: any = {}

      // Regular users can only see their own bookings
      if (req.user.role === UserRole.CUSTOMER) {
        whereClause.customerId = req.user.id
      } else if (req.user.role === UserRole.PROPERTY_HOST) {
        // Property hosts can see bookings for their properties
        whereClause.property = {
          hostId: req.user.id,
        }
      }

      // Apply filters
      if (where.status) whereClause.status = where.status
      if (where.paymentStatus) whereClause.paymentStatus = where.paymentStatus
      if (where.propertyId) whereClause.propertyId = where.propertyId
      if (where.customerId && req.user.role === UserRole.ADMIN) {
        whereClause.customerId = where.customerId
      }
      if (where.bookingNumber) {
        whereClause.bookingNumber = {
          contains: where.bookingNumber,
          mode: 'insensitive',
        }
      }
      if (where.guestEmail) {
        whereClause.guestEmail = {
          contains: where.guestEmail,
          mode: 'insensitive',
        }
      }
      if (where.checkInFrom || where.checkInTo) {
        whereClause.checkIn = {}
        if (where.checkInFrom) whereClause.checkIn.gte = new Date(where.checkInFrom)
        if (where.checkInTo) whereClause.checkIn.lte = new Date(where.checkInTo)
      }

      // Execute query
      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            property: {
              select: {
                id: true,
                name: true,
                type: true,
                city: true,
                images: true,
                host: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
              },
            },
            receipts: {
              orderBy: { uploadedAt: 'desc' },
            },
            reviews: true,
          },
        }),
        prisma.booking.count({ where: whereClause }),
      ])

      res.json({
        success: true,
        data: {
          bookings,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors,
        })
      }
      throw error
    }
  })
)

/**
 * @route   GET /api/v1/bookings/:id
 * @desc    Get booking details
 * @access  Protected (owner, property host, admin)
 */
router.get(
  '/:id',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        property: {
          include: {
            host: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        receipts: {
          orderBy: { uploadedAt: 'desc' },
        },
        reviews: true,
      },
    })

    if (!booking) {
      throw new AppError('Booking not found', 404)
    }

    // Check authorization
    const isOwner = booking.customerId === req.user.id
    const isHost = booking.property.hostId === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN

    if (!isOwner && !isHost && !isAdmin) {
      throw new AppError('Not authorized to view this booking', 403)
    }

    res.json({
      success: true,
      data: booking,
    })
  })
)

/**
 * @route   POST /api/v1/bookings
 * @desc    Create new booking
 * @access  Protected
 */
router.post(
  '/',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    try {
      const data = createBookingSchema.parse(req.body)
      
      // Check property availability
      const property = await prisma.property.findUnique({
        where: { id: data.propertyId },
        include: {
          host: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          bookings: {
            where: {
              status: {
                in: [BookingStatus.PENDING, BookingStatus.APPROVED],
              },
              OR: [
                {
                  checkIn: {
                    lte: data.checkOut,
                  },
                  checkOut: {
                    gte: data.checkIn,
                  },
                },
              ],
            },
          },
        },
      })

      if (!property) {
        throw new AppError('Property not found', 404)
      }

      if (property.status !== 'ACTIVE') {
        throw new AppError('Property is not available for booking', 400)
      }

      if (property.bookings.length > 0) {
        throw new AppError('Property is not available for selected dates', 400)
      }

      // Check guest count
      const totalGuests = data.adults + (data.children || 0)
      if (totalGuests > property.maxGuests) {
        throw new AppError(`Property can accommodate maximum ${property.maxGuests} guests`, 400)
      }

      // Calculate costs
      const costs = calculateBookingCosts(property, data.checkIn, data.checkOut)

      // Generate booking number
      const bookingNumber = `MAR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          bookingNumber,
          propertyId: data.propertyId,
          customerId: req.user.id,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          adults: data.adults,
          children: data.children,
          infants: data.infants,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          specialRequests: data.specialRequests,
          nights: costs.nights,
          subtotal: costs.subtotal,
          cleaningFee: costs.cleaningFee,
          serviceFee: costs.serviceFee,
          total: costs.total,
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        },
        include: {
          property: {
            select: {
              name: true,
              host: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      })

      // Create notification for property host
      await prisma.notification.create({
        data: {
          userId: property.hostId,
          type: 'BOOKING_REQUEST',
          title: 'New Booking Request',
          message: `${req.user.firstName} ${req.user.lastName} has requested to book ${property.name}`,
          metadata: {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
          },
        },
      })

      // Send email notifications
      await Promise.all([
        emailService.sendBookingConfirmation(data.guestEmail, booking),
        emailService.sendNewBookingNotification(property.host.email, booking),
      ])

      auditLog('BOOKING_CREATED', req.user.id, {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        propertyId: data.propertyId,
      }, req.ip)

      res.status(201).json({
        success: true,
        message: 'Booking created successfully. Awaiting host approval.',
        data: booking,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors,
        })
      }
      throw error
    }
  })
)

/**
 * @route   PATCH /api/v1/bookings/:id/status
 * @desc    Update booking status (approve/reject)
 * @access  Property Host, Admin
 */
router.patch(
  '/:id/status',
  requireAuth(UserRole.PROPERTY_HOST),
  [
    param('id').isString(),
    body('status').isIn([BookingStatus.APPROVED, BookingStatus.REJECTED, BookingStatus.CANCELLED]),
    body('reason').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { status, reason } = req.body

    // Get booking with property
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        property: {
          select: {
            hostId: true,
            name: true,
          },
        },
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!booking) {
      throw new AppError('Booking not found', 404)
    }

    // Check authorization
    const isHost = booking.property.hostId === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN

    if (!isHost && !isAdmin) {
      throw new AppError('Not authorized to update this booking', 403)
    }

    // Update booking
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        status,
        adminNotes: reason,
        approvedAt: status === BookingStatus.APPROVED ? new Date() : undefined,
        approvedBy: status === BookingStatus.APPROVED ? req.user.id : undefined,
      },
    })

    // Create notification for customer
    const notificationTitle = status === BookingStatus.APPROVED 
      ? 'Booking Approved!' 
      : status === BookingStatus.REJECTED 
      ? 'Booking Rejected' 
      : 'Booking Cancelled'

    await prisma.notification.create({
      data: {
        userId: booking.customerId,
        type: status === BookingStatus.APPROVED ? 'BOOKING_APPROVED' : 'BOOKING_CANCELLED',
        title: notificationTitle,
        message: `Your booking for ${booking.property.name} has been ${status.toLowerCase()}.${reason ? ` Reason: ${reason}` : ''}`,
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
        },
      },
    })

    // Send email notification
    await emailService.sendBookingStatusUpdate(
      booking.customer.email,
      {
        customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
        propertyName: booking.property.name,
        bookingNumber: booking.bookingNumber,
        status,
        reason,
      }
    )

    auditLog('BOOKING_STATUS_UPDATED', req.user.id, {
      bookingId: req.params.id,
      status,
      reason,
    }, req.ip)

    res.json({
      success: true,
      message: `Booking ${status.toLowerCase()} successfully`,
      data: updated,
    })
  })
)

/**
 * @route   POST /api/v1/bookings/:id/cancel
 * @desc    Cancel booking
 * @access  Protected (booking owner)
 */
router.post(
  '/:id/cancel',
  requireAuth(),
  [
    param('id').isString(),
    body('reason').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { reason } = req.body

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        property: {
          select: {
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
      },
    })

    if (!booking) {
      throw new AppError('Booking not found', 404)
    }

    // Only booking owner can cancel
    if (booking.customerId !== req.user.id) {
      throw new AppError('Not authorized to cancel this booking', 403)
    }

    // Can only cancel pending or approved bookings
    if (![BookingStatus.PENDING, BookingStatus.APPROVED].includes(booking.status)) {
      throw new AppError('Cannot cancel booking in current status', 400)
    }

    // Update booking status
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
    })

    // Create notification for property host
    await prisma.notification.create({
      data: {
        userId: booking.property.hostId,
        type: 'BOOKING_CANCELLED',
        title: 'Booking Cancelled',
        message: `${req.user.firstName} ${req.user.lastName} cancelled their booking for ${booking.property.name}.${reason ? ` Reason: ${reason}` : ''}`,
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
        },
      },
    })

    // Send email notification to host
    await emailService.sendBookingCancellation(
      booking.property.host.email,
      {
        hostName: `${booking.property.host.firstName} ${booking.property.host.lastName}`,
        customerName: `${req.user.firstName} ${req.user.lastName}`,
        propertyName: booking.property.name,
        bookingNumber: booking.bookingNumber,
        reason,
      }
    )

    auditLog('BOOKING_CANCELLED', req.user.id, {
      bookingId: req.params.id,
      reason,
    }, req.ip)

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: updated,
    })
  })
)

/**
 * @route   GET /api/v1/bookings/:id/invoice
 * @desc    Get booking invoice
 * @access  Protected (authorized users only)
 */
router.get(
  '/:id/invoice',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        property: {
          select: {
            name: true,
            type: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            hostId: true,
          },
        },
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    if (!booking) {
      throw new AppError('Booking not found', 404)
    }

    // Check authorization
    const isOwner = booking.customerId === req.user.id
    const isHost = booking.property.hostId === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN

    if (!isOwner && !isHost && !isAdmin) {
      throw new AppError('Not authorized to view this invoice', 403)
    }

    res.json({
      success: true,
      data: {
        booking,
        invoice: {
          number: `INV-${booking.bookingNumber}`,
          date: booking.createdAt,
          dueDate: booking.checkIn,
          items: [
            {
              description: `${booking.nights} night${booking.nights > 1 ? 's' : ''} at ${booking.property.name}`,
              quantity: booking.nights,
              rate: booking.subtotal / booking.nights,
              amount: booking.subtotal,
            },
            ...(booking.cleaningFee > 0 ? [{
              description: 'Cleaning fee',
              quantity: 1,
              rate: booking.cleaningFee,
              amount: booking.cleaningFee,
            }] : []),
            ...(booking.serviceFee > 0 ? [{
              description: 'Service fee',
              quantity: 1,
              rate: booking.serviceFee,
              amount: booking.serviceFee,
            }] : []),
          ],
          subtotal: booking.subtotal,
          fees: booking.cleaningFee + booking.serviceFee,
          total: booking.total,
        },
      },
    })
  })
)

export default router