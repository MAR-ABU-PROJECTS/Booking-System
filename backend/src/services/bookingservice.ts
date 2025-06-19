// MAR ABU PROJECTS SERVICES LLC - Booking Management Service
import { PrismaClient, BookingStatus, PaymentStatus, UserRole } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// ===============================
// VALIDATION SCHEMAS
// ===============================
export const createBookingSchema = z.object({
  propertyId: z.string().cuid('Invalid property ID'),
  checkIn: z.string().datetime('Invalid check-in date'),
  checkOut: z.string().datetime('Invalid check-out date'),
  adults: z.number().int().min(1, 'Must have at least 1 adult'),
  children: z.number().int().min(0, 'Children count cannot be negative').default(0),
  guestName: z.string().min(2, 'Guest name must be at least 2 characters'),
  guestEmail: z.string().email('Invalid guest email'),
  guestPhone: z.string().min(10, 'Valid phone number required'),
  guestAddress: z.string().optional(),
  specialRequests: z.string().optional(),
  arrivalTime: z.string().optional(),
  paymentMethod: z.enum(['bank_transfer', 'card', 'mobile_money', 'cash']).default('bank_transfer'),
})

export const updateBookingSchema = z.object({
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
  adults: z.number().int().min(1).optional(),
  children: z.number().int().min(0).optional(),
  guestName: z.string().min(2).optional(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().min(10).optional(),
  guestAddress: z.string().optional(),
  specialRequests: z.string().optional(),
  arrivalTime: z.string().optional(),
  adminNotes: z.string().optional(),
})

export const searchBookingsSchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  propertyId: z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
  checkInFrom: z.string().datetime().optional(),
  checkInTo: z.string().datetime().optional(),
  bookingNumber: z.string().optional(),
  guestEmail: z.string().email().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['created', 'checkIn', 'totalAmount', 'status']).default('created'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const bookingActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'confirm', 'check_in', 'check_out', 'cancel']),
  reason: z.string().optional(),
  refundAmount: z.number().positive().optional(),
  adminNotes: z.string().optional(),
})

// ===============================
// TYPES
// ===============================
export interface BookingWithDetails {
  id: string
  bookingNumber: string
  checkIn: Date
  checkOut: Date
  nights: number
  adults: number
  children: number
  status: BookingStatus
  paymentStatus: PaymentStatus
  baseAmount: number
  cleaningFee: number
  serviceFee: number
  taxes: number
  discounts: number
  totalAmount: number
  paidAmount: number
  guestName: string
  guestEmail: string
  guestPhone: string
  guestAddress: string | null
  specialRequests: string | null
  arrivalTime: string | null
  cancellationReason: string | null
  cancellationDate: Date | null
  refundAmount: number | null
  adminNotes: string | null
  approvedBy: string | null
  approvedAt: Date | null
  createdAt: Date
  updatedAt: Date
  customer: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
  }
  property: {
    id: string
    name: string
    address: string
    city: string
    state: string
    type: string
    baseRate: number
    checkInTime: string
    checkOutTime: string
    host: {
      id: string
      firstName: string
      lastName: string
      email: string
    }
  }
  receipts: Array<{
    id: string
    fileName: string
    fileUrl: string
    amount: number
    status: string
    uploadedAt: Date
  }>
}

export interface BookingSearchResult {
  bookings: BookingWithDetails[]
  total: number
  page: number
  limit: number
  totalPages: number
  summary: {
    totalRevenue: number
    pendingApprovals: number
    activeBookings: number
    completedBookings: number
  }
}

export interface BookingPricing {
  baseAmount: number
  cleaningFee: number
  serviceFee: number
  taxes: number
  discounts: number
  totalAmount: number
  breakdown: Array<{
    date: string
    rate: number
    isWeekend: boolean
  }>
}

// ===============================
// BOOKING SERVICE CLASS
// ===============================
export class BookingService {
  /**
   * Calculate booking pricing
   */
  async calculatePricing(
    propertyId: string,
    checkIn: string,
    checkOut: string,
    adults: number = 1
  ): Promise<BookingPricing> {
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)

    // Validate dates
    if (checkInDate >= checkOutDate) {
      throw new Error('Check-out date must be after check-in date')
    }

    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

    // Get property details
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        name: true,
        baseRate: true,
        weekendPremium: true,
        cleaningFee: true,
        serviceFee: true,
        maxGuests: true,
        status: true,
      },
    })

    if (!property) {
      throw new Error('Property not found')
    }

    if (property.status !== 'ACTIVE') {
      throw new Error('Property is not available for booking')
    }

    if (adults > property.maxGuests) {
      throw new Error(`Property can accommodate maximum ${property.maxGuests} guests`)
    }

    // Check availability
    const availability = await this.checkAvailability(propertyId, checkIn, checkOut)
    if (!availability.available) {
      throw new Error('Property is not available for selected dates')
    }

    // Calculate daily rates
    const breakdown = []
    let baseAmount = 0

    for (let date = new Date(checkInDate); date < checkOutDate; date.setDate(date.getDate() + 1)) {
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      const weekendPremium = property.weekendPremium || 0
      
      // Check for special pricing
      const specialPricing = await prisma.propertyAvailability.findUnique({
        where: {
          propertyId_date: {
            propertyId,
            date: new Date(date),
          },
        },
        select: { price: true },
      })

      let dailyRate = specialPricing?.price || property.baseRate
      
      if (isWeekend && !specialPricing?.price) {
        dailyRate = dailyRate * (1 + weekendPremium / 100)
      }

      breakdown.push({
        date: date.toISOString().split('T')[0],
        rate: dailyRate,
        isWeekend,
      })

      baseAmount += dailyRate
    }

    // Calculate fees
    const cleaningFee = property.cleaningFee || 0
    const serviceFeeRate = property.serviceFee || 0.05
    const serviceFee = Math.round((baseAmount + cleaningFee) * serviceFeeRate)
    const taxes = 0 // Add tax calculation if needed
    const discounts = 0 // Add discount calculation if needed

    const totalAmount = baseAmount + cleaningFee + serviceFee + taxes - discounts

    return {
      baseAmount: Math.round(baseAmount),
      cleaningFee: Math.round(cleaningFee),
      serviceFee,
      taxes,
      discounts,
      totalAmount: Math.round(totalAmount),
      breakdown,
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(
    customerId: string,
    bookingData: z.infer<typeof createBookingSchema>
  ): Promise<BookingWithDetails> {
    try {
      // Validate input
      const validatedData = createBookingSchema.parse(bookingData)

      const { checkIn, checkOut, adults, children, propertyId } = validatedData

      // Calculate pricing
      const pricing = await this.calculatePricing(propertyId, checkIn, checkOut, adults)

      // Generate booking number
      const bookingNumber = await this.generateBookingNumber()

      // Calculate nights
      const nights = Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
      )

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          bookingNumber,
          customerId,
          propertyId,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          nights,
          adults,
          children,
          guestName: validatedData.guestName,
          guestEmail: validatedData.guestEmail,
          guestPhone: validatedData.guestPhone,
          guestAddress: validatedData.guestAddress,
          specialRequests: validatedData.specialRequests,
          arrivalTime: validatedData.arrivalTime,
          baseAmount: pricing.baseAmount,
          cleaningFee: pricing.cleaningFee,
          serviceFee: pricing.serviceFee,
          taxes: pricing.taxes,
          discounts: pricing.discounts,
          totalAmount: pricing.totalAmount,
          status: BookingStatus.PENDING_APPROVAL,
          paymentStatus: PaymentStatus.PENDING,
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          property: {
            include: {
              host: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          receipts: true,
        },
      })

      // Log audit
      await this.logAudit(customerId, 'CREATE', 'Booking', booking.id, {
        bookingNumber: booking.bookingNumber,
        propertyName: booking.property.name,
        totalAmount: booking.totalAmount,
      })

      // Send notifications (implement notification service)
      await this.sendBookingNotifications(booking, 'CREATED')

      return booking as BookingWithDetails
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId: string, userId?: string, userRole?: UserRole): Promise<BookingWithDetails | null> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        property: {
          include: {
            host: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        receipts: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    })

    if (!booking) return null

    // Check access permissions
    if (userId && userRole) {
      const hasAccess = 
        booking.customerId === userId ||
        booking.property.hostId === userId ||
        userRole === UserRole.ADMIN ||
        userRole === UserRole.SUPER_ADMIN

      if (!hasAccess) {
        throw new Error('Unauthorized to view this booking')
      }
    }

    return booking as BookingWithDetails
  }

  /**
   * Search and filter bookings
   */
  async searchBookings(
    searchParams: z.infer<typeof searchBookingsSchema>,
    userId?: string,
    userRole?: UserRole
  ): Promise<BookingSearchResult> {
    try {
      // Validate input
      const validatedParams = searchBookingsSchema.parse(searchParams)

      const {
        status, paymentStatus, propertyId, customerId, checkInFrom, checkInTo,
        bookingNumber, guestEmail, page, limit, sortBy, sortOrder
      } = validatedParams

      // Build where clause
      const whereClause: any = {}

      // Apply filters based on user role
      if (userId && userRole) {
        if (userRole === UserRole.CUSTOMER) {
          whereClause.customerId = userId
        } else if (userRole === UserRole.PROPERTY_HOST) {
          whereClause.property = { hostId: userId }
        }
        // Admins can see all bookings
      }

      if (status) whereClause.status = status
      if (paymentStatus) whereClause.paymentStatus = paymentStatus
      if (propertyId) whereClause.propertyId = propertyId
      if (customerId) whereClause.customerId = customerId
      if (bookingNumber) whereClause.bookingNumber = { contains: bookingNumber, mode: 'insensitive' }
      if (guestEmail) whereClause.guestEmail = { contains: guestEmail, mode: 'insensitive' }

      if (checkInFrom || checkInTo) {
        whereClause.checkIn = {}
        if (checkInFrom) whereClause.checkIn.gte = new Date(checkInFrom)
        if (checkInTo) whereClause.checkIn.lte = new Date(checkInTo)
      }

      // Build order by
      const orderBy: any = {}
      switch (sortBy) {
        case 'checkIn':
          orderBy.checkIn = sortOrder
          break
        case 'totalAmount':
          orderBy.totalAmount = sortOrder
          break
        case 'status':
          orderBy.status = sortOrder
          break
        case 'created':
        default:
          orderBy.createdAt = sortOrder
          break
      }

      // Execute queries
      const [bookings, total, summary] = await Promise.all([
        prisma.booking.findMany({
          where: whereClause,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            property: {
              include: {
                host: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            receipts: {
              orderBy: { uploadedAt: 'desc' },
            },
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.booking.count({ where: whereClause }),
        this.getBookingSummary(whereClause),
      ])

      return {
        bookings: bookings as BookingWithDetails[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        summary,
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
  }

  /**
   * Update booking
   */
  async updateBooking(
    bookingId: string,
    updateData: z.infer<typeof updateBookingSchema>,
    userId: string,
    userRole: UserRole
  ): Promise<BookingWithDetails> {
    try {
      // Validate input
      const validatedData = updateBookingSchema.parse(updateData)

      // Get existing booking
      const existingBooking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { property: { select: { hostId: true } } },
      })

      if (!existingBooking) {
        throw new Error('Booking not found')
      }

      // Check permissions
      const canUpdate = 
        existingBooking.customerId === userId ||
        existingBooking.property.hostId === userId ||
        userRole === UserRole.ADMIN ||
        userRole === UserRole.SUPER_ADMIN

      if (!canUpdate) {
        throw new Error('Unauthorized to update this booking')
      }

      // Don't allow updates to confirmed/completed bookings unless admin
      if (existingBooking.status === BookingStatus.COMPLETED && 
          userRole !== UserRole.ADMIN && 
          userRole !== UserRole.SUPER_ADMIN) {
        throw new Error('Cannot update completed booking')
      }

      // Recalculate pricing if dates or guests changed
      let pricingUpdate = {}
      if (validatedData.checkIn || validatedData.checkOut || validatedData.adults) {
        const checkIn = validatedData.checkIn || existingBooking.checkIn.toISOString()
        const checkOut = validatedData.checkOut || existingBooking.checkOut.toISOString()
        const adults = validatedData.adults || existingBooking.adults

        const pricing = await this.calculatePricing(
          existingBooking.propertyId,
          checkIn,
          checkOut,
          adults
        )

        const nights = Math.ceil(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
        )

        pricingUpdate = {
          nights,
          baseAmount: pricing.baseAmount,
          cleaningFee: pricing.cleaningFee,
          serviceFee: pricing.serviceFee,
          totalAmount: pricing.totalAmount,
        }
      }

      // Update booking
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          ...validatedData,
          ...(validatedData.checkIn && { checkIn: new Date(validatedData.checkIn) }),
          ...(validatedData.checkOut && { checkOut: new Date(validatedData.checkOut) }),
          ...pricingUpdate,
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          property: {
            include: {
              host: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          receipts: true,
        },
      })

      // Log audit
      await this.logAudit(userId, 'UPDATE', 'Booking', bookingId, validatedData)

      return updatedBooking as BookingWithDetails
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
  }

  /**
   * Perform booking action (approve, reject, confirm, etc.)
   */
  async performBookingAction(
    bookingId: string,
    actionData: z.infer<typeof bookingActionSchema>,
    userId: string,
    userRole: UserRole
  ): Promise<BookingWithDetails> {
    try {
      // Validate input
      const validatedAction = bookingActionSchema.parse(actionData)

      // Get booking
      const booking = await this.getBookingById(bookingId)
      if (!booking) {
        throw new Error('Booking not found')
      }

      // Check permissions
      const canPerformAction = 
        booking.property.host.id === userId ||
        userRole === UserRole.ADMIN ||
        userRole === UserRole.SUPER_ADMIN

      if (!canPerformAction) {
        throw new Error('Unauthorized to perform this action')
      }

      let updateData: any = {
        adminNotes: validatedAction.adminNotes,
      }

      switch (validatedAction.action) {
        case 'approve':
          if (booking.status !== BookingStatus.PENDING_APPROVAL) {
            throw new Error('Booking is not pending approval')
          }
          updateData.status = BookingStatus.APPROVED
          updateData.approvedBy = userId
          updateData.approvedAt = new Date()
          break

        case 'reject':
          if (booking.status !== BookingStatus.PENDING_APPROVAL) {
            throw new Error('Booking is not pending approval')
          }
          updateData.status = BookingStatus.CANCELLED
          updateData.cancellationReason = validatedAction.reason
          updateData.cancellationDate = new Date()
          break

        case 'confirm':
          if (booking.status !== BookingStatus.APPROVED) {
            throw new Error('Booking must be approved before confirmation')
          }
          updateData.status = BookingStatus.CONFIRMED
          break

        case 'check_in':
          if (booking.status !== BookingStatus.CONFIRMED) {
            throw new Error('Booking must be confirmed before check-in')
          }
          updateData.status = BookingStatus.CHECKED_IN
          break

        case 'check_out':
          if (booking.status !== BookingStatus.CHECKED_IN) {
            throw new Error('Guest must be checked in before check-out')
          }
          updateData.status = BookingStatus.CHECKED_OUT
          // Auto-complete after checkout
          setTimeout(() => {
            this.completeBooking(bookingId)
          }, 1000)
          break

        case 'cancel':
          if ([BookingStatus.COMPLETED, BookingStatus.CANCELLED].includes(booking.status)) {
            throw new Error('Cannot cancel completed or already cancelled booking')
          }
          updateData.status = BookingStatus.CANCELLED
          updateData.cancellationReason = validatedAction.reason
          updateData.cancellationDate = new Date()
          if (validatedAction.refundAmount) {
            updateData.refundAmount = validatedAction.refundAmount
            updateData.paymentStatus = PaymentStatus.REFUNDED
          }
          break

        default:
          throw new Error('Invalid action')
      }

      // Update booking
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: updateData,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          property: {
            include: {
              host: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          receipts: true,
        },
      })

      // Log audit
      await this.logAudit(userId, 'UPDATE', 'Booking', bookingId, {
        action: validatedAction.action,
        reason: validatedAction.reason,
        newStatus: updateData.status,
      })

      // Send notifications
      await this.sendBookingNotifications(updatedBooking, validatedAction.action.toUpperCase())

      return updatedBooking as BookingWithDetails
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
  }

  /**
   * Complete booking (auto-triggered after checkout)
   */
  private async completeBooking(bookingId: string): Promise<void> {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.COMPLETED },
    })
  }

  /**
   * Check availability for booking dates
   */
  private async checkAvailability(
    propertyId: string,
    checkIn: string,
    checkOut: string
  ): Promise<{ available: boolean; reason?: string }> {
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)

    // Check for existing bookings
    const existingBookings = await prisma.booking.findMany({
      where: {
        propertyId,
        AND: [
          { checkIn: { lt: checkOutDate } },
          { checkOut: { gt: checkInDate } },
          { 
            status: { 
              in: [
                BookingStatus.PENDING_APPROVAL,
                BookingStatus.APPROVED,
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN
              ] 
            }
          }
        ]
      },
    })

    if (existingBookings.length > 0) {
      return { available: false, reason: 'Dates already booked' }
    }

    // Check availability overrides
    const unavailableDates = await prisma.propertyAvailability.findMany({
      where: {
        propertyId,
        date: { gte: checkInDate, lt: checkOutDate },
        available: false,
      },
    })

    if (unavailableDates.length > 0) {
      return { available: false, reason: 'Property not available for selected dates' }
    }

    return { available: true }
  }

  /**
   * Generate unique booking number
   */
  private async generateBookingNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = 'MAR' // MAR ABU prefix
    
    // Get the latest booking number for this year
    const latestBooking = await prisma.booking.findFirst({
      where: {
        bookingNumber: {
          startsWith: `${prefix}${year}`,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { bookingNumber: true },
    })

    let sequence = 1
    if (latestBooking) {
      const lastSequence = parseInt(latestBooking.bookingNumber.slice(-6))
      sequence = lastSequence + 1
    }

    return `${prefix}${year}-${sequence.toString().padStart(6, '0')}`
  }

  /**
   * Get booking summary statistics
   */
  private async getBookingSummary(whereClause: any): Promise<{
    totalRevenue: number
    pendingApprovals: number
    activeBookings: number
    completedBookings: number
  }> {
    const [revenueResult, statusCounts] = await Promise.all([
      prisma.booking.aggregate({
        where: {
          ...whereClause,
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT, BookingStatus.COMPLETED] },
        },
        _sum: { totalAmount: true },
      }),
      prisma.booking.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { id: true },
      }),
    ])

    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.id
      return acc
    }, {} as Record<string, number>)

    return {
      totalRevenue: revenueResult._sum.totalAmount || 0,
      pendingApprovals: statusMap[BookingStatus.PENDING_APPROVAL] || 0,
      activeBookings: (statusMap[BookingStatus.CONFIRMED] || 0) + (statusMap[BookingStatus.CHECKED_IN] || 0),
      completedBookings: statusMap[BookingStatus.COMPLETED] || 0,
    }
  }

  /**
   * Send booking notifications (placeholder - implement with notification service)
   */
  private async sendBookingNotifications(booking: any, eventType: string): Promise<void> {
    // This would integrate with a notification service
    console.log(`Sending ${eventType} notification for booking ${booking.bookingNumber}`)
    
    // Create notification records
    const notifications = [
      {
        userId: booking.customerId,
        type: `BOOKING_${eventType}` as any,
        title: `Booking ${eventType}`,
        message: `Your booking ${booking.bookingNumber} has been ${eventType.toLowerCase()}`,
        data: { bookingId: booking.id },
      },
      {
        userId: booking.property.hostId,
        type: `BOOKING_${eventType}` as any,
        title: `New booking ${eventType}`,
        message: `Booking ${booking.bookingNumber} for ${booking.property.name} has been ${eventType.toLowerCase()}`,
        data: { bookingId: booking.id },
      },
    ]

    await prisma.notification.createMany({
      data: notifications,
    })
  }

  /**
   * Log audit trail
   */
  private async logAudit(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    entity: string,
    entityId: string,
    changes?: any
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          changes: changes || {},
        }
      })
    } catch (error) {
      console.error('Failed to log audit:', error)
    }
  }
}

export const bookingService = new BookingService()