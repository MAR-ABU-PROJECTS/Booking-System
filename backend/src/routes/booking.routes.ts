// MAR ABU PROJECTS SERVICES LLC - Booking Routes
import { Router } from 'express'
import { body, query, param, validationResult } from 'express-validator'
import { BookingStatus, PaymentStatus, UserRole, PaymentMethod } from '@prisma/client'
import { requireAuth } from '../services/authservice'
import { asyncHandler } from '../middleware/error.middleware'
import { AppError } from '../middleware/error.middleware'
import { prisma } from '../server'
import { auditLog } from '../middleware/logger.middleware'
import { createBookingSchema, updateBookingSchema, searchBookingsSchema } from '../services/bookingservice'
import { z } from 'zod'

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

// Generate booking number
const generateBookingNumber = async (): Promise<string> => {
  const prefix = process.env.BOOKING_PREFIX || 'MAR'
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  
  // Get today's booking count
  const startOfDay = new Date(date.setHours(0, 0, 0, 0))
  const endOfDay = new Date(date.setHours(23, 59, 59, 999))
  
  const count = await prisma.booking.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  })
  
  const sequence = (count + 1).toString().padStart(4, '0')
  return `${prefix}-${year}${month}-${sequence}`
}

// Calculate booking pricing
const calculatePricing = (
  checkIn: Date,
  checkOut: Date,
  baseRate: number,
  cleaningFee: number = 0,
  serviceFeeRate: number = 0.05
) => {
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  const subtotal = baseRate * nights
  const serviceFee = subtotal * serviceFeeRate
  const total = subtotal + cleaningFee + serviceFee

  return {
    nights,
    baseRate,
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
                address: true,
                city: true,
                images: {
                  where: { isPrimary: true },
                  select: { url: true },
                  take: 1,
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
 * @desc    Get single booking
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
              },
            },
            amenities: {
              include: {
                amenity: true,
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
          bookings: {
            where: {
              status: {
                in: [BookingStatus.PENDING, BookingStatus.APPROVED],
              },
              OR: [
                {
                  checkIn: {
                    lte: new Date(data.checkOut),
                  },
                  checkOut: {
                    gte: new Date(data.checkIn),
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

      // Calculate pricing
      const pricing = calculatePricing(
        new Date(data.checkIn),
        new Date(data.checkOut),
        property.baseRate,
        property.cleaningFee || 0,
        property.serviceFee || 0.05
      )

      // Generate booking number
      const bookingNumber = await generateBookingNumber()

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          bookingNumber,
          propertyId: data.propertyId,
          customerId: req.user.id,
          checkIn: new Date(data.checkIn),
          checkOut: new Date(data.checkOut),
          adults: data.adults,
          children: data.children || 0,
          totalGuests: totalGuests,
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          guestAddress: data.guestAddress,
          specialRequests: data.specialRequests,
          arrivalTime: data.arrivalTime,
          ...pricing,
          paymentMethod: data.paymentMethod as PaymentMethod,
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        },
        include: {
          property: {
            select: {
              name: true,
              address: true,
              city: true,
            },
          },
        },
      })

      // Create notification for property host
      await prisma.notification.create({
        data: {
          userId: property.hostId,
          type: 'BOOKING_CONFIRMATION',
          title: 'New Booking Request',
          message: `You have a new booking request for ${property.name} from ${data.guestName}`,
          data: {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
          },
        },
      })

      auditLog('BOOKING_CREATED', req.user.id, {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        propertyId: booking.propertyId,
        total: booking.total,
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
        data: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          status,
        },
      },
    })

    auditLog('BOOKING_STATUS_UPDATED', req.user.id, {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      oldStatus: booking.status,
      newStatus: status,
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
 * @access  Protected (owner, admin)
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
            hostId: true,
            name: true,
          },
        },
      },
    })

    if (!booking) {
      throw new AppError('Booking not found', 404)
    }

    // Check authorization
    const isOwner = booking.customerId === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to cancel this booking', 403)
    }

    // Check if booking can be cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      throw new AppError('Booking is already cancelled', 400)
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new AppError('Completed bookings cannot be cancelled', 400)
    }

    // Update booking
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        status: BookingStatus.CANCELLED,
        paymentStatus: PaymentStatus.REFUNDED,
        adminNotes: reason,
      },
    })

    // Notify property host
    await prisma.notification.create({
      data: {
        userId: booking.property.hostId,
        type: 'BOOKING_CANCELLED',
        title: 'Booking Cancelled',
        message: `Booking ${booking.bookingNumber} for ${booking.property.name} has been cancelled.`,
        data: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
        },
      },
    })

    auditLog('BOOKING_CANCELLED', req.user.id, {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      reason,
    }, req.ip)

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: updated,
    })
  })
)

export default router