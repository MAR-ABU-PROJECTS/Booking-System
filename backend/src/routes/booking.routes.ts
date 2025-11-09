// MAR ABU PROJECTS SERVICES LLC - Booking Routes
import { Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import {
  BookingStatus,
  PaymentStatus,
  UserRole,
  RefundStatus,
} from "@prisma/client";
import { requireAuth } from "../services/authservice";
import { asyncHandler } from "../middlewares/error.middleware";
import { AppError } from "../middlewares/error.middleware";
import { prisma } from "../server";
import { auditLog } from "../middlewares/logger.middleware";
import { emailService } from "../services/emailservice";
import { fileService } from "../services/fileservice";
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
  checkOutFrom: z.string().optional(),
  checkOutTo: z.string().optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  dateRange: z.enum(["today", "week", "month", "quarter", "year"]).optional(),
});

const cancelBookingSchema = z.object({
  reason: z.string().max(255).optional(),
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
 *     description: Retrieve a list of bookings with optional filters based on user role. Customers see only their own bookings, and admins can see all bookings.
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
 *         description: Filter by customer ID (Admin only - ignored for other roles)
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
 *       - in: query
 *         name: checkOutFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter check-out date from
 *       - in: query
 *         name: checkOutTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter check-out date to
 *       - in: query
 *         name: createdFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings created from this date
 *       - in: query
 *         name: createdTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings created to this date
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *         description: Quick date range filter for check-in dates
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
  requireAuth(),
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
      checkOutFrom,
      checkOutTo,
      createdFrom,
      createdTo,
      dateRange,
    } = parsed;

    const whereClause: any = {};

    // Role-based filtering
    if (req.user.role === UserRole.CUSTOMER) {
      // Customers can only see their own bookings
      whereClause.customerId = req.user.id;
    }
    // Admins can see all bookings (no additional filter)

    if (status) whereClause.status = status;
    if (paymentStatus) whereClause.paymentStatus = paymentStatus;
    if (propertyId) whereClause.propertyId = propertyId;
    if (customerId && req.user.role === UserRole.ADMIN)
      whereClause.customerId = customerId;
    if (bookingCode)
      whereClause.bookingCode = { contains: bookingCode, mode: "insensitive" };
    if (guestEmail)
      whereClause.guestEmail = { contains: guestEmail, mode: "insensitive" };
    // Handle date range quick filter
    if (dateRange) {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (dateRange) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          endDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
          );
          break;
        case "week":
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay()); // Start of current week
          startDate = new Date(
            weekStart.getFullYear(),
            weekStart.getMonth(),
            weekStart.getDate()
          );
          endDate = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case "quarter":
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStart, 1);
          endDate = new Date(now.getFullYear(), quarterStart + 3, 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear() + 1, 0, 1);
          break;
        default:
          startDate = new Date();
          endDate = new Date();
      }

      whereClause.checkInDate = {
        gte: startDate,
        lt: endDate,
      };
    } else {
      // Handle individual date filters
      if (checkInFrom || checkInTo) {
        whereClause.checkInDate = {};
        if (checkInFrom) whereClause.checkInDate.gte = new Date(checkInFrom);
        if (checkInTo) whereClause.checkInDate.lte = new Date(checkInTo);
      }
    }

    // Check-out date filters
    if (checkOutFrom || checkOutTo) {
      whereClause.checkOutDate = {};
      if (checkOutFrom) whereClause.checkOutDate.gte = new Date(checkOutFrom);
      if (checkOutTo) whereClause.checkOutDate.lte = new Date(checkOutTo);
    }

    // Created date filters
    if (createdFrom || createdTo) {
      whereClause.createdAt = {};
      if (createdFrom) whereClause.createdAt.gte = new Date(createdFrom);
      if (createdTo) whereClause.createdAt.lte = new Date(createdTo);
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        property: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            type: true,
            host: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
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
 * @route   GET /api/v1/bookings/:bookingCode
 * @desc    Get booking details by booking code
 * @access  Protected (owner, property host, admin)
 */
/**
 * @swagger
 * /bookings/code/{bookingCode}:
 *   get:
 *     summary: Get booking details by booking code
 *     description: Get a single booking by booking code. Access is restricted to booking owner, property host, or admin.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking Code (e.g., MAR-12345)
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
  "/:bookingCode",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const booking = await prisma.booking.findUnique({
      where: { bookingCode: req.params.bookingCode },
      include: {
        property: {
          include: {
            host: {
              select: {
                id: true,
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
 * @desc    Create new booking with optional ID upload
 * @access  Protected
 */
/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a new booking with optional ID upload
 *     description: Create a booking and optionally upload ID document in one request. If ID is provided, booking is auto-approved.
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
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
 *               guestIdType:
 *                 type: string
 *                 enum: [passport, drivers_license, national_id, voters_card]
 *                 description: Required - Type of ID document
 *                 example: "passport"
 *               guestIdNumber:
 *                 type: string
 *                 description: Required - ID document number (5-50 characters)
 *                 example: "A12345678"
 *               idDocument:
 *                 type: string
 *                 format: binary
 *                 description: Required - ID document file (JPEG, PNG, or PDF, max 5MB)
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
 *                   example: Booking created and approved successfully! Check your email for confirmation.
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
  fileService.idDocumentUploader().single("idDocument"), // Required file upload
  asyncHandler(async (req: any, res: any) => {
    try {
      const data = createBookingSchema.parse(req.body);

      // Validate required ID fields
      const { guestIdType, guestIdNumber } = req.body;

      // Check if ID document is uploaded
      if (!req.file) {
        throw new AppError("ID document is required", 400);
      }

      // Check if ID type is provided
      if (!guestIdType) {
        throw new AppError("ID type is required", 400);
      }

      // Check if ID number is provided
      if (!guestIdNumber) {
        throw new AppError("ID number is required", 400);
      }

      // Validate ID type
      const validIdTypes = [
        "passport",
        "drivers_license",
        "national_id",
        "voters_card",
      ];
      if (!validIdTypes.includes(guestIdType)) {
        throw new AppError(
          "ID type must be one of: passport, drivers_license, national_id, voters_card",
          400
        );
      }

      // Validate ID number
      if (guestIdNumber.trim().length < 5 || guestIdNumber.trim().length > 50) {
        throw new AppError(
          "ID number must be between 5 and 50 characters",
          400
        );
      }

      // Check property availability
      const property = await prisma.property.findUnique({
        where: { id: data.propertyId },
        include: {
          host: {
            select: { email: true },
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

      // Note: No maximum guest restriction as per requirements

      // Calculate pricing using booking service (consistent with pricing route)
      const pricing = await bookingService.calculatePricing(
        data.propertyId,
        data.checkIn.toISOString(),
        data.checkOut.toISOString(),
        data.adults
      );

      const nights = Math.ceil(
        (data.checkOut.getTime() - data.checkIn.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // Generate booking number
      const bookingCode = `MAR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Prepare ID document URL
      const baseUrl = process.env.BASE_URL || "http://localhost:5000";
      const guestIdDocumentUrl = `${baseUrl}/uploads/${req.file.filename}`;

      // Create booking - auto-approved with valid ID
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
          nights: nights,
          baseAmount: pricing.baseAmount,
          cleaningFee: pricing.cleaningFee,
          cautionFee: pricing.cautionFee,
          taxes: pricing.taxes,
          discount: pricing.discounts,
          total: pricing.totalAmount,
          status: BookingStatus.APPROVED, // Auto-approve with valid ID
          paymentStatus: PaymentStatus.PENDING,
          // Required ID document fields
          guestIdType: guestIdType,
          guestIdNumber: guestIdNumber,
          guestIdDocumentUrl: guestIdDocumentUrl,
          approvedBy: req.user.id,
          approvedAt: new Date(),
        },
        include: {
          property: {
            select: {
              name: true,
              host: {
                select: { email: true },
              },
            },
          },
          customer: {
            select: { email: true },
          },
        },
      });

      auditLog("BOOKING_CREATED_WITH_ID", req.user.id, {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        propertyId: data.propertyId,
        guestIdType: guestIdType,
        hasIdDocument: true,
      });

      // Send booking confirmation email (auto-approved with ID)
      await emailService.sendBookingConfirmation(booking.guestEmail, booking);

      res.status(201).json({
        success: true,
        message:
          "Booking created and approved successfully! Check your email for confirmation.",
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
 * @swagger
 * /bookings/code/{bookingCode}/edit:
 *   patch:
 *     summary: Edit booking details using booking code
 *     description: Allows customers to edit certain booking details (dates, email, phone) using booking code
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking Code (e.g., MAR-12345)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               checkInDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-09-01"
 *               checkOutDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-09-05"
 *               adults:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *               children:
 *                 type: integer
 *                 minimum: 0
 *                 example: 1
 *               infants:
 *                 type: integer
 *                 minimum: 0
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
 *                 example: "+2348012345678"
 *               guestAddress:
 *                 type: string
 *                 example: "123 Main St, Lagos"
 *               specialRequests:
 *                 type: string
 *                 example: "Late check-in required"
 *               arrivalTime:
 *                 type: string
 *                 example: "18:00"
 *     responses:
 *       200:
 *         description: Booking updated successfully
 *       400:
 *         description: Invalid data or booking cannot be edited
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.patch(
  "/:bookingCode/edit",
  requireAuth(),
  [
    param("bookingCode").isString(),
    body("checkInDate").optional().isISO8601(),
    body("checkOutDate").optional().isISO8601(),
    body("guestEmail").optional().isEmail(),
    body("guestPhone").optional().isString().trim(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { bookingCode } = req.params;
    const updateData = req.body;

    // Get current booking with property details
    const booking = await prisma.booking.findUnique({
      where: { bookingCode },
      include: {
        property: {
          select: {
            id: true,
            hostId: true,
            name: true,
            baseRate: true,
            weekendPremium: true,
            monthlyDiscount: true,
            cleaningFee: true,
            cautionFee: true,
            minStay: true,
            maxStay: true,
          },
        },
        customer: {
          select: { id: true, email: true },
        },
      },
    });

    if (!booking) throw new AppError("Booking not found", 404);

    // Authorization check - users can edit their own bookings, admins can edit any booking
    const isCustomer = booking.customerId === req.user.id;
    const isHost = booking.property.hostId === req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    if (!isCustomer && !isHost && !isAdmin) {
      throw new AppError("Not authorized to edit this booking", 403);
    }

    // Business rules for editing (admins can bypass these restrictions)
    if (isCustomer && !isAdmin) {
      // Customers can only edit pending or confirmed bookings
      if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
        throw new AppError(
          "Can only edit bookings that are pending or confirmed",
          400
        );
      }

      // If booking is confirmed and has paid amount, require admin approval for changes
      if (booking.status === "CONFIRMED" && booking.paidAmount > 0) {
        throw new AppError(
          "Cannot edit confirmed bookings with payments. Please contact support.",
          400
        );
      }
    }

    // Note: Admins can edit any booking regardless of status

    // Validate date changes if provided
    if (updateData.checkInDate || updateData.checkOutDate) {
      const checkIn = updateData.checkInDate
        ? new Date(updateData.checkInDate)
        : booking.checkInDate;
      const checkOut = updateData.checkOutDate
        ? new Date(updateData.checkOutDate)
        : booking.checkOutDate;

      if (checkIn >= checkOut) {
        throw new AppError("Check-out date must be after check-in date", 400);
      }

      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (nights < booking.property.minStay) {
        throw new AppError(
          `Minimum stay is ${booking.property.minStay} night(s)`,
          400
        );
      }

      if (nights > booking.property.maxStay) {
        throw new AppError(
          `Maximum stay is ${booking.property.maxStay} night(s)`,
          400
        );
      }

      // Check availability for new dates (excluding current booking)
      const conflictingBookings = await prisma.booking.findMany({
        where: {
          propertyId: booking.propertyId,
          id: { not: booking.id }, // Exclude current booking
          status: { in: ["CONFIRMED", "APPROVED"] },
          OR: [
            {
              checkInDate: { lt: checkOut },
              checkOutDate: { gt: checkIn },
            },
          ],
        },
      });

      if (conflictingBookings.length > 0) {
        throw new AppError(
          "Property is not available for the selected dates",
          400
        );
      }

      updateData.nights = nights;
    }

    // Recalculate pricing if dates or guest count changed
    let pricingUpdate = {};
    if (
      updateData.checkInDate ||
      updateData.checkOutDate ||
      updateData.adults ||
      updateData.children
    ) {
      const nights = updateData.nights || booking.nights;
      const adults = updateData.adults || booking.adults;
      const children = updateData.children || booking.children;

      // Use booking service to recalculate pricing
      const pricingResult = await bookingService.calculatePricing(
        booking.propertyId,
        updateData.checkInDate || booking.checkInDate.toISOString(),
        updateData.checkOutDate || booking.checkOutDate.toISOString(),
        adults
      );

      pricingUpdate = {
        baseAmount: pricingResult.baseAmount,
        cleaningFee: pricingResult.cleaningFee,
        cautionFee: pricingResult.cautionFee,
        taxes: pricingResult.taxes,
        discount: pricingResult.discounts,
        total: pricingResult.totalAmount,
      };
    }

    // Prepare update object
    const finalUpdateData = {
      ...updateData,
      ...pricingUpdate,
      updatedAt: new Date(),
    };

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { bookingCode },
      data: finalUpdateData,
      include: {
        property: {
          select: { name: true, hostId: true },
        },
        customer: {
          select: { email: true },
        },
      },
    });

    // Send notifications about the booking change
    if (isCustomer) {
      // Notify host about customer changes
      await prisma.notification.create({
        data: {
          userId: booking.property.hostId,
          type: "BOOKING_UPDATED",
          title: "Booking Updated by Customer",
          message: `Customer ${req.user.email} updated booking ${booking.bookingCode}`,
          metadata: {
            bookingId: booking.id,
            updatedFields: Object.keys(updateData),
          },
        },
      });
    } else {
      // Notify customer about host/admin changes
      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: "BOOKING_UPDATED",
          title: "Booking Updated",
          message: `Your booking ${booking.bookingCode} has been updated`,
          metadata: {
            bookingId: booking.id,
            updatedFields: Object.keys(updateData),
          },
        },
      });
    }

    auditLog(
      "BOOKING_UPDATED",
      req.user.id,
      {
        bookingId: booking.id,
        updatedFields: Object.keys(updateData),
        oldValues: Object.keys(updateData).reduce((acc, key) => {
          acc[key] = booking[key as keyof typeof booking];
          return acc;
        }, {} as any),
        newValues: updateData,
      },
      req.ip
    );

    res.json({
      success: true,
      message: "Booking updated successfully",
      data: updatedBooking,
    });
  })
);

// /**
//  * @swagger
//  * /bookings/{id}/continue-payment:
//  *   post:
//  *     summary: Continue payment for approved booking
//  *     description: Allows customers to continue payment process for approved bookings with pending payments
//  *     tags:
//  *       - Bookings
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Booking ID
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - paymentMethod
//  *             properties:
//  *               paymentMethod:
//  *                 type: string
//  *                 enum: [card, bank_transfer, wallet]
//  *                 example: "card"
//  *               returnUrl:
//  *                 type: string
//  *                 format: uri
//  *                 example: "https://yourdomain.com/booking/confirmation"
//  *     responses:
//  *       200:
//  *         description: Payment initiation successful
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                 message:
//  *                   type: string
//  *                 data:
//  *                   type: object
//  *                   properties:
//  *                     paymentUrl:
//  *                       type: string
//  *                     reference:
//  *                       type: string
//  *                     amount:
//  *                       type: number
//  *       400:
//  *         description: Invalid booking status or payment already completed
//  *       403:
//  *         description: Not authorized
//  *       404:
//  *         description: Booking not found
//  */
// router.post(
//   "/:id/continue-payment",
//   requireAuth(),
//   [
//     param("id").isString(),
//     body("paymentMethod").isIn(["card", "bank_transfer", "wallet"]),
//     body("returnUrl").optional().isURL(),
//   ],
//   validate,
//   asyncHandler(async (req: any, res: any) => {
//     const { id } = req.params;
//     const { paymentMethod, returnUrl } = req.body;
//
//     // Get booking with customer and property details
//     const booking = await prisma.booking.findUnique({
//       where: { id },
//       include: {
//         customer: {
//           select: {
//             id: true,
//             email: true,
//             phone: true,
//           },
//         },
//         property: {
//           select: {
//             id: true,
//             name: true,
//             hostId: true,
//           },
//         },
//       },
//     });
//
//     if (!booking) throw new AppError("Booking not found", 404);
//
//     // Authorization - only booking owner can continue payment
//     if (booking.customerId !== req.user.id) {
//       throw new AppError(
//         "Not authorized to make payment for this booking",
//         403
//       );
//     }
//
//     // Check booking status - must be approved
//     if (booking.status !== "APPROVED") {
//       throw new AppError("Booking must be approved before making payment", 400);
//     }
//
//     // Check payment status - must be pending or processing
//     if (!["PENDING", "PROCESSING"].includes(booking.paymentStatus)) {
//       throw new AppError(
//         "Payment already completed or failed for this booking",
//         400
//       );
//     }
//
//     // Calculate remaining amount to pay
//     const remainingAmount = booking.total - booking.paidAmount;
//
//     if (remainingAmount <= 0) {
//       throw new AppError("No remaining amount to pay", 400);
//     }
//
//     // Generate payment reference
//     const paymentReference = `MAR_${booking.bookingCode}_${Date.now()}`;
//
//     try {
//       let paymentData: any = {};
//
//       if (paymentMethod === "card") {
//         // Initialize Paystack payment
//         const paystackResponse = await fetch(
//           "https://api.paystack.co/transaction/initialize",
//           {
//             method: "POST",
//             headers: {
//               Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//               "Content-Type": "application/json",
//             },
//             body: JSON.stringify({
//               email: booking.customer.email,
//               amount: remainingAmount * 100, // Paystack expects kobo
//               reference: paymentReference,
//               callback_url:
//                 returnUrl ||
//                 `${process.env.FRONTEND_URL}/booking/confirmation?bookingId=${id}`,
//               metadata: {
//                 bookingId: id,
//                 bookingCode: booking.bookingCode,
//                 customerName: booking.guestName || booking.guestEmail,
//                 propertyName: booking.property.name,
//                 paymentType: "booking_continuation",
//               },
//             }),
//           }
//         );
//
//         const paystackData = await paystackResponse.json();
//
//         if (!paystackData.status) {
//           throw new AppError("Failed to initialize payment", 500);
//         }
//
//         paymentData = {
//           paymentUrl: paystackData.data.authorization_url,
//           reference: paymentReference,
//           amount: remainingAmount,
//           provider: "paystack",
//         };
//       } else if (paymentMethod === "bank_transfer") {
//         // For bank transfer, provide bank details and receipt upload info
//         paymentData = {
//           bankDetails: {
//             bankName: "First Bank of Nigeria",
//             accountNumber: "2034567890", // Your business account
//             accountName: "MAR ABU PROJECTS SERVICES LLC",
//             reference: paymentReference,
//           },
//           amount: remainingAmount,
//           instructions:
//             "After making the transfer, please upload your receipt using the receipt upload feature",
//           provider: "bank_transfer",
//         };
//       } else if (paymentMethod === "wallet") {
//         // Handle wallet payments (you can integrate with local payment providers)
//         paymentData = {
//           walletInstructions:
//             "Wallet payment coming soon. Please use card or bank transfer.",
//           amount: remainingAmount,
//           provider: "wallet",
//         };
//       }
//
//       // Create payment record
//       const payment = await prisma.payment.create({
//         data: {
//           bookingId: id,
//           userId: req.user.id,
//           amount: remainingAmount,
//           method: paymentMethod.toUpperCase() as any,
//           reference: paymentReference,
//           status: paymentMethod === "bank_transfer" ? "PENDING" : "INITIATED",
//         },
//       });
//
//       // Update booking payment status
//       if (paymentMethod !== "bank_transfer") {
//         await prisma.booking.update({
//           where: { id },
//           data: {
//             paymentStatus: "PROCESSING",
//           },
//         });
//       }
//
//       // Send notification to host
//       await prisma.notification.create({
//         data: {
//           userId: booking.property.hostId,
//           type: "PAYMENT_INITIATED",
//           title: "Payment Continuation Started",
//           message: `Customer ${req.user.email} has initiated payment continuation for booking ${booking.bookingCode}`,
//           metadata: {
//             bookingId: id,
//             paymentId: payment.id,
//             amount: remainingAmount,
//             method: paymentMethod,
//           },
//         },
//       });
//
//       auditLog(
//         "PAYMENT_CONTINUATION_INITIATED",
//         req.user.id,
//         {
//           bookingId: id,
//           paymentId: payment.id,
//           amount: remainingAmount,
//           method: paymentMethod,
//           reference: paymentReference,
//         },
//         req.ip
//       );
//
//       res.json({
//         success: true,
//         message: "Payment initiation successful",
//         data: {
//           paymentId: payment.id,
//           reference: paymentReference,
//           amount: remainingAmount,
//           ...paymentData,
//         },
//       });
//     } catch (error: any) {
//       console.error("Payment initialization error:", error);
//       throw new AppError(error.message || "Failed to initialize payment", 500);
//     }
//   })
// );
//
/**
 * @route   PATCH /api/v1/bookings/:bookingCode/status
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
  "/:bookingCode/status",
  requireAuth({ role: UserRole.ADMIN }),
  [
    param("bookingCode").isString(),
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
      where: { bookingCode: req.params.bookingCode },
      include: {
        property: {
          select: {
            hostId: true,
            name: true,
          },
        },
        customer: {
          select: { email: true },
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
      customerName: booking.guestName || booking.guestEmail,
      propertyName: booking.property.name,
      bookingCode: booking.bookingCode,
      status,
      reason,
    });

    auditLog(
      "BOOKING_STATUS_UPDATED",
      req.user.id,
      {
        bookingCode: req.params.bookingCode,
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
 * @route   POST /api/v1/bookings/:bookingCode/cancel
 * @desc    Cancel booking
 * @access  Protected (booking owner)
 */
/**
 * @swagger
 * /bookings/{bookingCode}/cancel:
 *   post:
 *     summary: Cancel a booking
 *     description: Allows a booking owner to cancel a booking if it is still pending or approved.
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking code to cancel
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
  "/:bookingCode/cancel",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const bookingCode = req.params.bookingCode;
    const { reason } = cancelBookingSchema.parse(req.body);

    // Fetch booking with payment
    const booking = await prisma.booking.findUnique({
      where: { bookingCode: bookingCode },
      include: {
        payment: true,
        property: {
          include: {
            host: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        customer: true,
      },
    });

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    // Only owner or admin can cancel
    const isOwner = booking.customerId === req.user.id;
    const isAdmin = req.user.role === UserRole.ADMIN;
    if (!isOwner && !isAdmin) throw new AppError("Unauthorized", 403);

    // Already cancelled or refunded
    if (["CANCELLED", "REFUNDED", "COMPLETED"].includes(booking.status)) {
      return res.status(409).json({
        success: false,
        message: "Booking already cancelled or completed",
      });
    }

    // Must be paid to be refund-eligible
    const payment = booking.payment;
    if (!payment || payment.status !== PaymentStatus.PAID) {
      // Just cancel, no refund
      const cancelledBooking = await prisma.booking.update({
        where: { bookingCode: bookingCode },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt: new Date(),
          cancelledBy: req.user.id,
        },
      });

      // Send cancellation email to customer
      try {
        await emailService.sendBookingCancelledEmail(
          booking.customer.email,
          {
            ...cancelledBooking,
            property: booking.property,
            customer: booking.customer,
          },
          reason
        );
      } catch (emailError) {
        console.error(
          "Failed to send cancellation email to customer:",
          emailError
        );
      }

      // Send cancellation notification to host
      try {
        if (booking.property.host?.email) {
          await emailService.sendBookingCancelledEmail(
            booking.property.host.email,
            {
              ...cancelledBooking,
              property: booking.property,
              customer: booking.customer,
            },
            reason
          );
        }
      } catch (emailError) {
        console.error("Failed to send cancellation email to host:", emailError);
      }

      auditLog("BOOKING_CANCELLED", req.user.id, { bookingCode }, req.ip);
      return res.json({
        success: true,
        message: "Booking cancelled (no refund, not paid)",
      });
    }

    // Check refund eligibility (>24h before check-in)
    const now = new Date();
    const cutoff = new Date(booking.checkInDate);
    cutoff.setHours(cutoff.getHours() - 24);
    if (now >= cutoff) {
      return res.status(409).json({
        success: false,
        message: "Refund not allowed within 24 hours of check-in",
      });
    }

    // Prevent double refund requests
    const existingRefund = await prisma.refund.findFirst({
      where: {
        paymentId: payment.id,
        status: {
          in: [
            RefundStatus.PENDING,
            RefundStatus.PROCESSING,
            RefundStatus.REFUNDED,
          ],
        },
      },
    });
    if (existingRefund) {
      return res.status(409).json({
        success: false,
        message: "Refund already requested or processed for this booking",
      });
    }

    // Transaction: mark booking cancelled, create refund request, update payment
    const [cancelledBooking, refund] = await prisma.$transaction([
      prisma.booking.update({
        where: { bookingCode: bookingCode },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt: now,
          cancelledBy: req.user.id,
          refundAmount: payment.amount,
        },
      }),
      prisma.refund.create({
        data: {
          paymentId: payment.id,
          amount: payment.amount,
          reason: reason,
          status: RefundStatus.PENDING,
          processedBy: req.user.id,
        },
      }),
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          refundStatus: RefundStatus.PENDING,
          refundRequestedAt: now,
          refundAmount: payment.amount,
        },
      }),
    ]);

    // Send cancellation email to customer
    try {
      await emailService.sendBookingCancelledEmail(
        booking.customer.email,
        {
          ...cancelledBooking,
          property: booking.property,
          customer: booking.customer,
        },
        reason
      );
    } catch (emailError) {
      console.error(
        "Failed to send cancellation email to customer:",
        emailError
      );
    }

    // Send cancellation notification to host
    try {
      if (booking.property.host?.email) {
        await emailService.sendBookingCancelledEmail(
          booking.property.host.email,
          {
            ...cancelledBooking,
            property: booking.property,
            customer: booking.customer,
          },
          reason
        );
      }
    } catch (emailError) {
      console.error("Failed to send cancellation email to host:", emailError);
    }

    auditLog(
      "BOOKING_CANCELLED_REFUND_REQUESTED",
      req.user.id,
      { bookingCode, refundId: refund.id, paymentId: payment.id },
      req.ip
    );

    res.json({
      success: true,
      message:
        "Booking cancelled and refund requested. Awaiting admin approval.",
      booking: cancelledBooking,
      refund,
    });
  })
);

/**
 * @route   GET /api/v1/bookings/:bookingCode/invoice
 * @desc    Get booking invoice
 * @access  Protected (authorized users only)
 */
/**
 * @swagger
 * /bookings/{bookingCode}/invoice:
 *   get:
 *     summary: Get booking invoice
 *     description: Retrieve an invoice for a specific booking. Only the booking owner, the property host, or an admin can access this invoice.
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingCode
 *         required: true
 *         description: The booking code of the booking
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
  "/:bookingCode/invoice",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const booking = await prisma.booking.findUnique({
      where: { bookingCode: req.params.bookingCode },
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
          select: { email: true, phone: true },
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
            ...(booking.cautionFee > 0
              ? [
                  {
                    description: "Service fee",
                    quantity: 1,
                    rate: booking.cautionFee,
                    amount: booking.cautionFee,
                  },
                ]
              : []),
          ],
          subtotal: booking.baseAmount,
          fees: booking.cleaningFee + booking.cautionFee,
          total: booking.total,
        },
      },
    });
  })
);

export default router;
