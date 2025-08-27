// MAR ABU PROJECTS SERVICES LLC - Booking Routes
import { Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import { BookingStatus, PaymentStatus, UserRole, RefundStatus } from "@prisma/client";
import { requireAuth } from "../services/authservice";
import { asyncHandler } from "../middlewares/error.middleware";
import { AppError } from "../middlewares/error.middleware";
import { prisma } from "../server";
import { auditLog } from "../middlewares/logger.middleware";
import { emailService } from "../services/emailservice";
import { z } from "zod";
import { bookingService } from "../services/bookingservice";

const router = Router();

// Validation schemas
const createBookingSchema = z.object({
  propertyId: z.string(),
  checkIn: z.string().transform((str) => new Date(str)),
  checkOut: z.string().transform((str) => new Date(str)),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).optional().default(0),
  infants: z.number().int().min(0).optional().default(0),
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(10),
  specialRequests: z.string().optional(),
});

const searchBookingsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.nativeEnum(BookingStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  propertyId: z.string().optional(),
  customerId: z.string().optional(),
  bookingCode: z.string().optional(),
  guestEmail: z.string().optional(),
  checkInFrom: z.string().optional(),
  checkInTo: z.string().optional(),
});

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

// Helper function to calculate booking costs
const calculateBookingCosts = (
  property: any,
  checkIn: Date,
  checkOut: Date
) => {
  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
  );
  const subtotal = property.baseRate * nights;
  const cleaningFee = property.cleaningFee || 0;
  const serviceFee = Math.round(subtotal * 0.1); // 10% service fee
  const total = subtotal + cleaningFee + serviceFee;

  return {
    nights,
    subtotal,
    cleaningFee,
    serviceFee,
    total,
  };
};

// ===============================
// BOOKING ROUTES
// ===============================

/**
 * @route   GET /api/v1/bookings
 * @desc    Get bookings with filters
 * @access  Protected
 */
/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Get bookings with filters
 *     description: Retrieve a list of bookings with optional filters based on user role. Customers see their own, hosts see bookings for their properties, and admins can see all.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Current page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Booking status
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *         description: Payment status
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *         description: Filter by property ID
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *         description: Filter by customer ID (Admin only)
 *       - in: query
 *         name: bookingCode
 *         schema:
 *           type: string
 *         description: Search booking code (partial match)
 *       - in: query
 *         name: guestEmail
 *         schema:
 *           type: string
 *         description: Search by guest email (partial match)
 *       - in: query
 *         name: checkInFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter check-in date from
 *       - in: query
 *         name: checkInTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter check-in date to
 *     responses:
 *       200:
 *         description: Bookings fetched successfully
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
 *                     bookings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Booking'
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
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  requireAuth({ role: UserRole.ADMIN }),
  asyncHandler(async (req: any, res: any) => {
    const parsed = searchBookingsSchema.parse(req.query);
    const {
      page,
      limit,
      status,
      paymentStatus,
      propertyId,
      customerId,
      bookingCode,
      guestEmail,
      checkInFrom,
      checkInTo,
    } = parsed;

    const whereClause: any = {};

    if (status) whereClause.status = status;
    if (paymentStatus) whereClause.paymentStatus = paymentStatus;
    if (propertyId) whereClause.propertyId = propertyId;
    if (customerId) whereClause.customerId = customerId;
    if (bookingCode) whereClause.bookingCode = bookingCode;
    if (guestEmail) whereClause.guestEmail = guestEmail;
    if (checkInFrom || checkInTo) {
      whereClause.checkInDate = {};
      if (checkInFrom) whereClause.checkInDate.gte = new Date(checkInFrom);
      if (checkInTo) whereClause.checkInDate.lte = new Date(checkInTo);
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        customer: true,
        property: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.booking.count({ where: whereClause });

    res.json({
      status: "success",
      message: "Bookings fetched successfully",
      data: bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

/**
 * @route   GET /api/v1/bookings/pricing
 * @desc    Get pricing information
 * @access  Public
 */
/**
 * @swagger
 * /bookings/pricing:
 *   get:
 *     summary: Get pricing information
 *     description: Retrieve pricing information for a specific property and dates.
 *     tags:
 *       - Bookings
 *     parameters:
 *       - in: query
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *       - in: query
 *         name: checkIn
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-in date
 *       - in: query
 *         name: checkOut
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-out date
 *       - in: query
 *         name: adults
 *         required: true
 *         schema:
 *           type: integer
 *         description: Number of adults
 *       - in: query
 *         name: promoCode
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional promo code
 *     responses:
 *       200:
 *         description: Pricing information retrieved successfully
 *       400:
 *         description: Invalid request
 */
router.get(
  "/pricing",
  asyncHandler(async (req: any, res: any) => {
    const { propertyId, checkIn, checkOut, adults, promoCode } = req.query;
    try {
      const pricing = await bookingService.calculatePricing(
        propertyId,
        checkIn,
        checkOut,
        Number(adults),
        promoCode
      );
      res.json({ success: true, data: pricing });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          typeof error === "object" && error !== null && "message" in error
            ? (error as any).message
            : "An error occurred",
      });
    }
  })
);

/**
 * @route   GET /api/v1/bookings/:id
 * @desc    Get booking details
 * @access  Protected (owner, property host, admin)
 */
/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Get booking details
 *     description: Get a single booking by ID. Access is restricted to booking owner, property host, or admin.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.get(
  "/:id",
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
          orderBy: { uploadedAt: "desc" },
        },
        review: true,
      },
    });

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    // Check authorization
    const isOwner = booking.customerId === req.user.id;
    const isAdmin = req.user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new AppError("Not authorized to view this booking", 403);
    }

    res.json({
      success: true,
      data: booking,
    });
  })
);

/**
 * @route   POST /api/v1/create-bookings
 * @desc    Create new booking
 * @access  Protected
 */
/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a new booking
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *               - checkIn
 *               - checkOut
 *               - adults
 *               - guestName
 *               - guestEmail
 *               - guestPhone
 *             properties:
 *               propertyId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               checkIn:
 *                 type: string
 *                 format: date
 *                 example: "2025-08-01"
 *               checkOut:
 *                 type: string
 *                 format: date
 *                 example: "2025-08-05"
 *               adults:
 *                 type: integer
 *                 example: 2
 *               children:
 *                 type: integer
 *                 example: 1
 *               infants:
 *                 type: integer
 *                 example: 0
 *               guestName:
 *                 type: string
 *                 example: "John Doe"
 *               guestEmail:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               guestPhone:
 *                 type: string
 *                 example: "+2348123456789"
 *               specialRequests:
 *                 type: string
 *                 example: "Please provide a baby cot."
 *     responses:
 *       201:
 *         description: Booking created successfully
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
 *                   example: Booking created successfully. Awaiting host approval.
 *                 data:
 *                   type: object
 *                   description: Booking details
 *       400:
 *         description: Validation failed or property not available
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
 *                   example: Validation failed
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    try {
      const data = createBookingSchema.parse(req.body);

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
                  checkInDate: {
                    lte: data.checkOut,
                  },
                  checkOutDate: {
                    gte: data.checkIn,
                  },
                },
              ],
            },
          },
        },
      });

      if (!property) {
        throw new AppError("Property not found", 404);
      }

      if (property.status !== "ACTIVE") {
        throw new AppError("Property is not available for booking", 400);
      }

      if (property.bookings.length > 0) {
        throw new AppError("Property is not available for selected dates", 400);
      }

      // Check guest count
      const totalGuests = data.adults + (data.children || 0);
      if (totalGuests > property.maxGuests) {
        throw new AppError(
          `Property can accommodate maximum ${property.maxGuests} guests`,
          400
        );
      }

      // Calculate costs
      const costs = calculateBookingCosts(
        property,
        data.checkIn,
        data.checkOut
      );

      // Generate booking number
      const bookingCode = `MAR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create booking with status APPROVED
      const booking = await prisma.booking.create({
        data: {
          bookingCode,
          propertyId: data.propertyId,
          customerId: req.user.id,
          checkInDate: data.checkIn,
          checkOutDate: data.checkOut,
          adults: data.adults,
          children: data.children,
          infants: data.infants,
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          specialRequests: data.specialRequests,
          nights: costs.nights,
          baseAmount: costs.subtotal,
          cleaningFee: costs.cleaningFee,
          serviceFee: costs.serviceFee,
          total: costs.total,
          status: BookingStatus.APPROVED, // <-- Auto-approve
          paymentStatus: PaymentStatus.PENDING,
          approvedBy: req.user.id,
          approvedAt: new Date(),
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
          customer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Send booking confirmation and approval emails to user
      await emailService.sendBookingConfirmation(data.guestEmail, booking);
      await emailService.sendBookingApprovedEmail(data.guestEmail, booking);

      auditLog(
        "BOOKING_CREATED",
        req.user.id,
        {
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          propertyId: data.propertyId,
        },
        req.ip
      );

      res.status(201).json({
        success: true,
        message:
          "Booking created and auto-approved. Please check your email for confirmation and payment instructions.",
        data: booking,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors,
        });
      }
      throw error;
    }
  })
);

/**
 * @route   PATCH /api/v1/bookings/:id/status
 * @desc    Update booking status (approve/reject)
 * @access  Property Host, Admin
 */
/**
 * @swagger
 * /bookings/{id}/status:
 *   patch:
 *     summary: Update booking status (approve/reject/cancel)
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Booking ID
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED, CANCELLED]
 *                 example: APPROVED
 *               reason:
 *                 type: string
 *                 example: "Guest did not respond to verification request"
 *     responses:
 *       200:
 *         description: Booking status updated successfully
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
 *                   example: Booking approved successfully
 *                 data:
 *                   type: object
 *                   description: Updated booking details
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to update this booking
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/:id/status",
  requireAuth({ role: UserRole.ADMIN }),
  [
    param("id").isString(),
    body("status").isIn([
      BookingStatus.APPROVED,
      BookingStatus.REJECTED,
      BookingStatus.CANCELLED,
    ]),
    body("reason").optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { status, reason } = req.body;

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
    });

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    // Check authorization
    const isHost = booking.property.hostId === req.user.id;
    const isAdmin = req.user.role === UserRole.ADMIN;

    if (!isHost && !isAdmin) {
      throw new AppError("Not authorized to update this booking", 403);
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
    });

    // Create notification for customer
    const notificationTitle =
      status === BookingStatus.APPROVED
        ? "Booking Approved!"
        : status === BookingStatus.REJECTED
          ? "Booking Rejected"
          : "Booking Cancelled";

    await prisma.notification.create({
      data: {
        userId: booking.customerId,
        type:
          status === BookingStatus.APPROVED
            ? "BOOKING_APPROVED"
            : "BOOKING_CANCELLED",
        title: notificationTitle,
        message: `Your booking for ${booking.property.name} has been ${status.toLowerCase()}.${reason ? ` Reason: ${reason}` : ""}`,
        metadata: {
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
        },
      },
    });

    // Send email notification
    await emailService.sendBookingConfirmation(booking.customer.email, {
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      propertyName: booking.property.name,
      bookingCode: booking.bookingCode,
      status,
      reason,
    });

    auditLog(
      "BOOKING_STATUS_UPDATED",
      req.user.id,
      {
        bookingId: req.params.id,
        status,
        reason,
      },
      req.ip
    );

    res.json({
      success: true,
      message: `Booking ${status.toLowerCase()} successfully`,
      data: updated,
    });
  })
);

/**
 * @route   POST /api/v1/bookings/:id/cancel
 * @desc    Cancel booking
 * @access  Protected (booking owner)
 */
/**
 * @swagger
 * /bookings/{id}/cancel:
 *   post:
 *     summary: Cancel a booking
 *     description: Allows a booking owner to cancel a booking if it is still pending or approved.
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID to cancel
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Optional reason for cancellation
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
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
 *                   example: Booking cancelled successfully
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Cannot cancel booking in current status
 *       403:
 *         description: Not authorized to cancel this booking
 *       404:
 *         description: Booking not found
 */
router.post(
  "/:id/cancel",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const bookingId = req.params.id;
    const { reason } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true, property: true, customer: true },
    });

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    if (booking.customerId !== req.user.id) {
      throw new AppError("Unauthorized to cancel this booking", 403);
    }

    if (!["PENDING", "APPROVED", "CONFIRMED", "COMPLETED"].includes(booking.status)) {
      throw new AppError("Booking cannot be cancelled in its current state", 400);
    }

    // Start transaction
    const cancelledBooking = await bookingService.performBookingAction(
      bookingId,
      { action: "cancel", reason },
      req.user.id,
      req.user.role
    );

    // 3. Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "CANCEL_BOOKING",
        entity: "Booking",
        entityId: booking.id,
        changes: {
          status: "BOOKING_CANCELLED",
          refundStatus: booking.payment?.refundStatus ?? null,
        },
        metadata: {
          reason,
          role: req.user.role,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      },
    });

    res.json({
      success: true,
      message: "Booking cancelled successfully. Refund (if eligible) is awaiting admin approval.",
      booking: cancelledBooking,
    });
  })
);


/**
 * @route   GET /api/v1/bookings/:id/invoice
 * @desc    Get booking invoice
 * @access  Protected (authorized users only)
 */
/**
 * @swagger
 * /bookings/{id}/invoice:
 *   get:
 *     summary: Get booking invoice
 *     description: Retrieve an invoice for a specific booking. Only the booking owner, the property host, or an admin can access this invoice.
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the booking
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice fetched successfully
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
 *                     booking:
 *                       type: object
 *                       description: Booking details
 *                     invoice:
 *                       type: object
 *                       description: Invoice details
 *                       properties:
 *                         number:
 *                           type: string
 *                           example: INV-ABC123
 *                         date:
 *                           type: string
 *                           format: date-time
 *                         dueDate:
 *                           type: string
 *                           format: date-time
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               description:
 *                                 type: string
 *                               quantity:
 *                                 type: integer
 *                               rate:
 *                                 type: number
 *                               amount:
 *                                 type: number
 *                         subtotal:
 *                           type: number
 *                         fees:
 *                           type: number
 *                         total:
 *                           type: number
 *       403:
 *         description: Not authorized to view this invoice
 *       404:
 *         description: Booking not found
 */
router.get(
  "/:id/invoice",
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
    });

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    // Check authorization
    const isOwner = booking.customerId === req.user.id;
    const isHost = booking.property.hostId === req.user.id;
    const isAdmin = req.user.role === UserRole.ADMIN;

    if (!isOwner && !isHost && !isAdmin) {
      throw new AppError("Not authorized to view this invoice", 403);
    }

    res.json({
      success: true,
      data: {
        booking,
        invoice: {
          number: `INV-${booking.bookingCode}`,
          date: booking.createdAt,
          dueDate: booking.checkInDate,
          items: [
            {
              description: `${booking.nights} night${booking.nights > 1 ? "s" : ""} at ${booking.property.name}`,
              quantity: booking.nights,
              rate: booking.baseAmount / booking.nights,
              amount: booking.baseAmount,
            },
            ...(booking.cleaningFee > 0
              ? [
                  {
                    description: "Cleaning fee",
                    quantity: 1,
                    rate: booking.cleaningFee,
                    amount: booking.cleaningFee,
                  },
                ]
              : []),
            ...(booking.serviceFee > 0
              ? [
                  {
                    description: "Service fee",
                    quantity: 1,
                    rate: booking.serviceFee,
                    amount: booking.serviceFee,
                  },
                ]
              : []),
          ],
          subtotal: booking.baseAmount,
          fees: booking.cleaningFee + booking.serviceFee,
          total: booking.total,
        },
      },
    });
  })
);

export default router;
