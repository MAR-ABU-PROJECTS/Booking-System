"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// MAR ABU PROJECTS SERVICES LLC - Property Routes
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const authservice_1 = require("../services/authservice");
const error_middleware_1 = require("../middlewares/error.middleware");
const error_middleware_2 = require("../middlewares/error.middleware");
const server_1 = require("../server");
const logger_middleware_1 = require("../middlewares/logger.middleware");
const helpers_1 = require("../utils/helpers");
const router = (0, express_1.Router)();
// Validation middleware
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
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
// PUBLIC PROPERTY ROUTES
// ===============================
/**
 * @route   GET /api/v1/properties
 * @desc    Get all properties (public)
 * @access  Public
 */
/**
 * @swagger
 * /properties:
 *   get:
 *     summary: Get all active properties
 *     description: Public endpoint to list all active properties with optional filters, sorting, and pagination.
 *     tags:
 *       - Properties
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *         description: Number of properties per page
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city (case-insensitive)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Property type (e.g., apartment, villa)
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum nightly rate
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum nightly rate
 *       - in: query
 *         name: bedrooms
 *         schema:
 *           type: integer
 *         description: Minimum number of bedrooms
 *       - in: query
 *         name: bathrooms
 *         schema:
 *           type: integer
 *         description: Minimum number of bathrooms
 *       - in: query
 *         name: maxGuests
 *         schema:
 *           type: integer
 *         description: Minimum number of guests allowed
 *       - in: query
 *         name: amenities
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: List of required amenities
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           example: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of properties retrieved successfully
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
 *                     properties:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: prop_12345
 *                           name:
 *                             type: string
 *                             example: Ocean View Apartment
 *                           city:
 *                             type: string
 *                             example: Lagos
 *                           type:
 *                             type: string
 *                             example: apartment
 *                           baseRate:
 *                             type: number
 *                             example: 120
 *                           averageRating:
 *                             type: number
 *                             example: 4.5
 *                           reviewCount:
 *                             type: integer
 *                             example: 15
 *                           bookingCount:
 *                             type: integer
 *                             example: 8
 *                           host:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: host_67890
 *optionalAuth(),
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      city,
      type,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      maxGuests,
      amenities,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const { page: validPage, limit: validLimit } = validatePagination(
      page,
      limit
    );

    // Build where clause
    const where: any = {
      status: PropertyStatus.ACTIVE,
    };

    if (city) where.city = { contains: city, mode: "insensitive" };
    if (type) where.type = type;
    if (bedrooms) where.bedrooms = { gte: parseInt(bedrooms) };
    if (bathrooms) where.bathrooms = { gte: parseInt(bathrooms) };
    if (maxGuests) where.maxGuests = { gte: parseInt(maxGuests) };
    if (minPrice || maxPrice) {
      where.baseRate = {};
      if (minPrice) where.baseRate.gte = parseFloat(minPrice);
      if (maxPrice) where.baseRate.lte = parseFloat(maxPrice);
    }

    // Handle amenities filter
    if (amenities) {
      const amenityList = Array.isArray(amenities) ? amenities : [amenities];
      where.amenities = {
        hasEvery: amenityList,
      };
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = order;

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy,
        skip: (validPage - 1) * validLimit,
        take: validLimit,
        include: {
          host: {
            select: {
              id: true,avatar: true,
            },
          },
          reviews: {
            where: { approved: true },
            select: {
              rating: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              bookings: true,
            },
          },
        },
      }),
      prisma.property.count({ where }),
    ]);

    // Calculate average ratings
    const propertiesWithRatings = properties.map((property) => {
      const ratings = property.reviews.map((r) => r.rating);
      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
          : 0;

      return {
        ...property,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount: property._count.reviews,
        bookingCount: property._count.bookings,
        reviews: undefined, // Remove reviews array from response
      };
    });

    const pagination = calculatePagination(validPage, validLimit, total);

    res.json({
      success: true,
      data: {
        properties: propertiesWithRatings,
        pagination,
      },
    });
  })
);

/**
 * @route   GET /api/v1/properties/:id
 * @desc    Get property details
 * @access  Public
 */
/**
 * @swagger
 * /properties/{id}:
 *   get:
 *     summary: Get property details
 *     description: Public endpoint to retrieve detailed information about a single property, including host info, reviews, and unavailable dates.
 *     tags:
 *       - Properties
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: prop_12345
 *         description: The unique ID of the property
 *     responses:
 *       200:
 *         description: Property details retrieved successfully
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
 *                       example: prop_12345
 *                     name:
 *                       type: string
 *                       example: Ocean View Apartment
 *                     type:
 *                       type: string
 *                       example: apartment
 *                     city:
 *                       type: string
 *                       example: Lagos
 *                     state:
 *                       type: string
 *                       example: Lagos State
 *                     country:
 *                       type: string
 *                       example: Nigeria
 *                     baseRate:
 *                       type: number
 *                       example: 120
 *                     bedrooms:
 *                       type: integer
 *                       example: 2
 *                     bathrooms:
 *                       type: integer
 *                       example: 2
 *                     maxGuests:
 *                       type: integer
 *                       example: 4
 *                     averageRating:
 *                       type: number
 *                       example: 4.5
 *                     reviewCount:
 *                       type: integer
 *                       example: 15
 *                     unavailableDates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           checkIn:
 *                             type: string
 *                             format: date
 *                             example: 2025-08-01
 *                           checkOut:
 *                             type: string
 *                             format: date
 *                             example: 2025-08-05
 *                     host:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: host_67890
 *optionalAuth(),
  asyncHandler(async (req: any, res: any) => {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        host: {
          select: {
            id: true,avatar: true,
            createdAt: true,
            _count: {
              select: {
                hostedProperties: true,
              },
            },
          },
        },
        reviews: {
          where: { approved: true },
          orderBy: { createdAt: "desc" },
          include: {
            customer: {
              select: {avatar: true,
              },
            },
          },
        },
        bookings: {
          where: {
            status: {
              in: ["APPROVED", "PENDING"],
            },
          },
          select: {
            checkInDate: true,
            checkOutDate: true,
          },
        },
      },
    });

    if (!property) {
      throw new AppError("Property not found", 404);
    }

    // Calculate average rating
    const ratings = property.reviews.map((r) => r.rating);
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : 0;

    // Get unavailable dates
    const unavailableDates = property.bookings.map((booking) => ({
      checkIn: booking.checkInDate,
      checkOut: booking.checkOutDate,
    }));

    const responseData = {
      ...property,
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount: property.reviews.length,
      unavailableDates,
      hostPropertyCount: property.host._count.hostedProperties,
    };

    res.json({
      success: true,
      data: responseData,
    });
  })
);

/**
 * @route   GET /api/v1/properties/:id/availability
 * @desc    Check property availability for dates
 * @access  Public
 */
/**
 * @swagger
 * /properties/{id}/availability:
 *   get:
 *     summary: Check property availability
 *     description: Public endpoint to check if a property is available between given check-in and check-out dates.
 *     tags:
 *       - Properties
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: prop_12345
 *         description: The unique ID of the property
 *       - in: query
 *         name: checkIn
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: 2025-09-01
 *         description: Desired check-in date (ISO 8601 format)
 *       - in: query
 *         name: checkOut
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: 2025-09-05
 *         description: Desired check-out date (ISO 8601 format)
 *     responses:
 *       200:
 *         description: Availability check result
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
 *                     available:
 *                       type: boolean
 *                       example: true
 *                     checkIn:
 *                       type: string
 *                       format: date
 *                       example: 2025-09-01
 *                     checkOut:
 *                       type: string
 *                       format: date
 *                       example: 2025-09-05
 *                     propertyId:
 *                       type: string
 *                       example: prop_12345
 *       404:
 *         description: Property not found
 *       500:
 *         description: Server error
 */
router.get("/:id/availability", [
    (0, express_validator_1.param)("id").isString(),
    (0, express_validator_1.query)("checkIn").isISO8601(),
    (0, express_validator_1.query)("checkOut").isISO8601(),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { checkIn, checkOut } = req.query;
    const property = await server_1.prisma.property.findUnique({
        where: { id: req.params.id },
    });
    if (!property) {
        throw new error_middleware_2.AppError("Property not found", 404);
    }
    // Check for overlapping bookings
    const overlappingBookings = await server_1.prisma.booking.count({
        where: {
            propertyId: req.params.id,
            status: {
                in: ["PENDING", "APPROVED"],
            },
            OR: [
                {
                    checkInDate: {
                        lte: new Date(checkOut),
                    },
                    checkOutDate: {
                        gte: new Date(checkIn),
                    },
                },
            ],
        },
    });
    const isAvailable = overlappingBookings === 0;
    res.json({
        success: true,
        data: {
            available: isAvailable,
            checkIn,
            checkOut,
            propertyId: req.params.id,
        },
    });
}));
/**
 * @route   GET /api/v1/properties/:id/booked-dates
 * @desc    Get all booked dates for a property
 * @access  Public
 */
/**
 * @swagger
 * /properties/{id}/booked-dates:
 *   get:
 *     summary: Get all booked dates for a property
 *     description: Returns all booked date ranges for a property to help frontend disable unavailable dates
 *     tags:
 *       - Properties
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *     responses:
 *       200:
 *         description: Successfully retrieved booked dates
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
 *                     propertyId:
 *                       type: string
 *                     bookedDateRanges:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           checkIn:
 *                             type: string
 *                             format: date
 *                           checkOut:
 *                             type: string
 *                             format: date
 *                           status:
 *                             type: string
 *       404:
 *         description: Property not found
 */
router.get("/:id/booked-dates", [(0, express_validator_1.param)("id").isString()], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const property = await server_1.prisma.property.findUnique({
        where: { id: req.params.id },
    });
    if (!property) {
        throw new error_middleware_2.AppError("Property not found", 404);
    }
    // Get all approved and pending bookings for this property
    const bookedDates = await server_1.prisma.booking.findMany({
        where: {
            propertyId: req.params.id,
            status: {
                in: ["PENDING", "APPROVED", "CONFIRMED", "CHECKED_IN"],
            },
        },
        select: {
            checkInDate: true,
            checkOutDate: true,
            status: true,
        },
        orderBy: {
            checkInDate: "asc",
        },
    });
    const bookedDateRanges = bookedDates.map((booking) => ({
        checkIn: booking.checkInDate.toISOString().split("T")[0],
        checkOut: booking.checkOutDate.toISOString().split("T")[0],
        status: booking.status,
    }));
    res.json({
        success: true,
        data: {
            propertyId: req.params.id,
            bookedDateRanges,
        },
    });
}));
// ===============================
// PROPERTY HOST ROUTES
// ===============================
/**
 * @route   GET /api/v1/properties/my-properties
 * @desc    Get properties owned by current user
 * @access  Property Host
 */
/**
 * @swagger
 * /api/v1/properties/my-properties:
 *   get:
 *     summary: Get properties owned by the current authenticated user
 *     description: Retrieves a paginated list of properties created by the logged-in property host (or admin). Includes booking count, review count, and average rating for each property.
 *     tags:
 *       - Properties
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: "Page number for pagination (default: 1)"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *         description: "Number of items per page (default: 20)"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           example: ACTIVE
 *         description: Filter properties by status (e.g., ACTIVE, INACTIVE, PENDING)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: createdAt
 *         description: "Field to sort by (default: createdAt)"
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           example: desc
 *         description: "Sort order (default: desc)"
 *     responses:
 *       200:
 *         description: Successfully retrieved user's properties
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
 *                     properties:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "prop_123"
 *                           title:
 *                             type: string
 *                             example: "Luxury Beachfront Villa"
 *                           status:
 *                             type: string
 *                             example: ACTIVE
 *                           averageRating:
 *                             type: number
 *                             example: 4.5
 *                           reviewCount:
 *                             type: integer
 *                             example: 12
 *                           bookingCount:
 *                             type: integer
 *                             example: 8
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 50
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *       401:
 *         description: Unauthorized — missing or invalid token
 *       403:
 *         description: Forbidden — user does not have the required role
 */
router.get("/my-properties", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20, status, sortBy = "createdAt", order = "desc", } = req.query;
    const { page: validPage, limit: validLimit } = (0, helpers_1.validatePagination)(page, limit);
    const where = { hostId: req.user.id };
    if (status)
        where.status = status;
    const orderBy = {};
    orderBy[sortBy] = order;
    const [properties, total] = await Promise.all([
        server_1.prisma.property.findMany({
            where,
            orderBy,
            skip: (validPage - 1) * validLimit,
            take: validLimit,
            include: {
                _count: {
                    select: {
                        bookings: true,
                        reviews: true,
                    },
                },
                reviews: {
                    where: { approved: true },
                    select: { rating: true },
                },
            },
        }),
        server_1.prisma.property.count({ where }),
    ]);
    // Calculate average ratings and stats
    const propertiesWithStats = properties.map((property) => {
        const ratings = property.reviews.map((r) => r.rating);
        const averageRating = ratings.length > 0
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
            : 0;
        return {
            ...property,
            averageRating: Math.round(averageRating * 10) / 10,
            reviewCount: property._count.reviews,
            bookingCount: property._count.bookings,
            reviews: undefined,
        };
    });
    const pagination = (0, helpers_1.calculatePagination)(validPage, validLimit, total);
    res.json({
        success: true,
        data: {
            properties: propertiesWithStats,
            pagination,
        },
    });
}));
/**
 * @route   POST /api/v1/properties
 * @desc    Create new property
 * @access  Property Host
 */
/**
 * @swagger
 * /api/v1/properties:
 *   post:
 *     summary: Create a new property
 *     description: Allows a property host (admin role) to submit a new property listing. Newly created properties require admin approval before becoming active.
 *     tags:
 *       - Properties
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - type
 *               - address
 *               - city
 *               - state
 *               - zipCode
 *               - country
 *               - latitude
 *               - longitude
 *               - bedrooms
 *               - bathrooms
 *               - maxGuests
 *               - baseRate
 *               - amenities
 *               - images
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Luxury Beachfront Villa"
 *               description:
 *                 type: string
 *                 example: "A stunning beachfront villa with private pool and ocean views."
 *               type:
 *                 type: string
 *                 example: "VILLA"
 *                 enum: [APARTMENT, HOUSE, VILLA, CABIN, CONDO]
 *               address:
 *                 type: string
 *                 example: "123 Beach Road"
 *               city:
 *                 type: string
 *                 example: "Malibu"
 *               state:
 *                 type: string
 *                 example: "CA"
 *               zipCode:
 *                 type: string
 *                 example: "90265"
 *               country:
 *                 type: string
 *                 example: "USA"
 *               latitude:
 *                 type: number
 *                 example: 34.0259
 *               longitude:
 *                 type: number
 *                 example: -118.7798
 *               bedrooms:
 *                 type: integer
 *                 example: 4
 *               bathrooms:
 *                 type: integer
 *                 example: 3
 *               maxGuests:
 *                 type: integer
 *                 example: 8
 *               baseRate:
 *                 type: number
 *                 example: 350.00
 *               cleaningFee:
 *                 type: number
 *                 example: 50.00
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["WiFi", "Air Conditioning", "Pool", "Parking"]
 *               houseRules:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["No smoking", "No pets"]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
 *     responses:
 *       201:
 *         description: Property created successfully (pending approval)
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
 *                   example: "Property created successfully. It will be reviewed by our team."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "prop_123"
 *                     name:
 *                       type: string
 *                       example: "Luxury Beachfront Villa"
 *                     status:
 *                       type: string
 *                       example: "PENDING"
 *                     host:
 *                       type: object
 *                       properties:
 *requireAuth({ role: UserRole.ADMIN }),
  [
    body("name").trim().notEmpty().withMessage("Property name required"),
    body("description").trim().notEmpty().withMessage("Description required"),
    body("type")
      .isIn(Object.values(PropertyType))
      .withMessage("Invalid property type"),
    body("address").trim().notEmpty().withMessage("Address required"),
    body("city").trim().notEmpty().withMessage("City required"),
    body("state").trim().notEmpty().withMessage("State required"),
    body("zipCode").trim().notEmpty().withMessage("Zip code required"),
    body("country").trim().notEmpty().withMessage("Country required"),
    body("latitude").isFloat().withMessage("Valid latitude required"),
    body("longitude").isFloat().withMessage("Valid longitude required"),
    body("bedrooms")
      .isInt({ min: 0 })
      .withMessage("Valid bedroom count required"),
    body("bathrooms")
      .isInt({ min: 0 })
      .withMessage("Valid bathroom count required"),
    body("maxGuests")
      .isInt({ min: 1 })
      .withMessage("Valid guest count required"),
    body("baseRate")
      .isFloat({ min: 0 })
      .withMessage("Valid base rate required"),
    body("cleaningFee").optional().isFloat({ min: 0 }),
    body("amenities").isArray().withMessage("Amenities must be an array"),
    body("houseRules").optional().isArray(),
    body("images").isArray().withMessage("Images must be an array"),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const propertyData = {
      ...req.body,
      hostId: req.user.id,
      status: PropertyStatus.PENDING, // Requires admin approval
    };

    const property = await prisma.property.create({
      data: propertyData,
      include: {
        host: {
          select: {email: true,
          },
        },
      },
    });

    // Create notification for admin
    await prisma.notification.create({
      data: {
        userId: req.user.id, // This would be admin ID in real implementation
        type: "PROPERTY_SUBMITTED",
        title: "New Property Submitted",
        message: `${user.email} ${user.email} submitted a new property: ${property.name}`,
        metadata: {
          propertyId: property.id,
        },
      },
    });

    auditLog(
      "PROPERTY_CREATED",
      req.user.id,
      {
        propertyId: property.id,
        propertyName: property.name,
      },
      req.ip
    );

    res.status(201).json({
      success: true,
      message:
        "Property created successfully. It will be reviewed by our team.",
      data: property,
    });
  })
);

/**
 * @route   PUT /api/v1/properties/:id
 * @desc    Update property
 * @access  Property Host (owner), Admin
 */
/**
 * @swagger
 * /api/v1/properties/{id}:
 *   put:
 *     summary: Update an existing property
 *     description: Allows a property host (owner) or admin to update property details.
 *     tags:
 *       - Properties
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the property to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Luxury Beachfront Villa"
 *               description:
 *                 type: string
 *                 example: "An updated description of the beachfront villa."
 *               type:
 *                 type: string
 *                 enum: [APARTMENT, HOUSE, VILLA, CABIN, CONDO]
 *                 example: "VILLA"
 *               baseRate:
 *                 type: number
 *                 example: 400.00
 *               cleaningFee:
 *                 type: number
 *                 example: 60.00
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["WiFi", "Air Conditioning", "Private Pool"]
 *               houseRules:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["No smoking", "No pets"]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
 *     responses:
 *       200:
 *         description: Property updated successfully
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
 *                   example: "Property updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "prop_123"
 *                     name:
 *                       type: string
 *                       example: "Updated Luxury Beachfront Villa"
 *                     baseRate:
 *                       type: number
 *                       example: 400.00
 *                     cleaningFee:
 *                       type: number
 *                       example: 60.00
 *       400:
 *         description: Bad request — validation errors
 *       401:
 *         description: Unauthorized — missing or invalid token
 *       403:
 *         description: Forbidden — not authorized to update this property
 *       404:
 *         description: Property not found
 */
router.put("/:id", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.param)("id").isString(),
    (0, express_validator_1.body)("name").optional().trim().notEmpty(),
    (0, express_validator_1.body)("description").optional().trim().notEmpty(),
    (0, express_validator_1.body)("type").optional().isIn(Object.values(client_1.PropertyType)),
    (0, express_validator_1.body)("baseRate").optional().isFloat({ min: 0 }),
    (0, express_validator_1.body)("cleaningFee").optional().isFloat({ min: 0 }),
    (0, express_validator_1.body)("amenities").optional().isArray(),
    (0, express_validator_1.body)("houseRules").optional().isArray(),
    (0, express_validator_1.body)("images").optional().isArray(),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const property = await server_1.prisma.property.findUnique({
        where: { id: req.params.id },
    });
    if (!property) {
        throw new error_middleware_2.AppError("Property not found", 404);
    }
    // Check ownership or admin role
    const isOwner = property.hostId === req.user.id;
    const isAdmin = req.user.role === client_1.UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
        throw new error_middleware_2.AppError("Not authorized to update this property", 403);
    }
    const updatedProperty = await server_1.prisma.property.update({
        where: { id: req.params.id },
        data: req.body,
    });
    (0, logger_middleware_1.auditLog)("PROPERTY_UPDATED", req.user.id, {
        propertyId: req.params.id,
        changes: req.body,
    }, req.ip);
    res.json({
        success: true,
        message: "Property updated successfully",
        data: updatedProperty,
    });
}));
/**
 * @route   DELETE /api/v1/properties/:id
 * @desc    Delete property
 * @access  Property Host (owner), Admin
 */
/**
 * @swagger
 * /api/v1/properties/{id}:
 *   delete:
 *     summary: Delete a property
 *     description: Allows a property host (owner) or admin to delete a property, provided there are no active (pending or approved) bookings.
 *     tags:
 *       - Properties
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the property to delete
 *     responses:
 *       200:
 *         description: Property deleted successfully
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
 *                   example: "Property deleted successfully"
 *       400:
 *         description: Cannot delete property with active bookings
 *       401:
 *         description: Unauthorized — missing or invalid token
 *       403:
 *         description: Forbidden — not authorized to delete this property
 *       404:
 *         description: Property not found
 */
router.delete("/:id", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const property = await server_1.prisma.property.findUnique({
        where: { id: req.params.id },
        include: {
            bookings: {
                where: {
                    status: {
                        in: ["PENDING", "APPROVED"],
                    },
                },
            },
        },
    });
    if (!property) {
        throw new error_middleware_2.AppError("Property not found", 404);
    }
    // Check ownership or admin role
    const isOwner = property.hostId === req.user.id;
    const isAdmin = req.user.role === client_1.UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
        throw new error_middleware_2.AppError("Not authorized to delete this property", 403);
    }
    // Check for active bookings
    if (property.bookings.length > 0) {
        throw new error_middleware_2.AppError("Cannot delete property with active bookings", 400);
    }
    await server_1.prisma.property.delete({
        where: { id: req.params.id },
    });
    (0, logger_middleware_1.auditLog)("PROPERTY_DELETED", req.user.id, {
        propertyId: req.params.id,
        propertyName: property.name,
    }, req.ip);
    res.json({
        success: true,
        message: "Property deleted successfully",
    });
}));
/**
 * @route   GET /api/v1/properties/:id/bookings
 * @desc    Get property bookings
 * @access  Property Host (owner), Admin
 */
/**
 * @swagger
 * /api/v1/properties/{id}/bookings:
 *   get:
 *     summary: Get bookings for a specific property
 *     description: "Allows a property host (owner) or admin to view bookings for a given property, with optional pagination, filtering, and sorting."
 *     tags:
 *       - Properties
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "The ID of the property whose bookings you want to retrieve"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: "Page number for pagination (default: 1)"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *         description: "Number of items per page (default: 20)"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           example: APPROVED
 *         description: "Filter bookings by status (e.g., PENDING, APPROVED, CANCELLED)"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: createdAt
 *         description: "Field to sort results by (default: createdAt)"
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           example: desc
 *         description: "Sort order (default: desc)"
 *     responses:
 *       200:
 *         description: Successfully retrieved property bookings
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
 *                     bookings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "book_123"
 *                           status:
 *                             type: string
 *                             example: APPROVED
 *                           startDate:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-08-15T12:00:00.000Z"
 *                           endDate:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-08-20T12:00:00.000Z"
 *                           totalPrice:
 *                             type: number
 *                             example: 1500.00
 *                           customer:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         currentPage:
 *                           type: integer
 *       404:
 *         description: Property not found
 *       403:
 *         description: Not authorized to view these bookings
 */
router.get("/:id/bookings", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const property = await server_1.prisma.property.findUnique({
        where: { id: req.params.id },
    });
    if (!property) {
        throw new error_middleware_2.AppError("Property not found", 404);
    }
    // Check ownership or admin role
    const isOwner = property.hostId === req.user.id;
    const isAdmin = req.user.role === client_1.UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
        throw new error_middleware_2.AppError("Not authorized to view these bookings", 403);
    }
    const { page = 1, limit = 20, status, sortBy = "createdAt", order = "desc", } = req.query;
    const { page: validPage, limit: validLimit } = (0, helpers_1.validatePagination)(page, limit);
    const where = { propertyId: req.params.id };
    if (status)
        where.status = status;
    const orderBy = {};
    orderBy[sortBy] = order;
    const [bookings, total] = await Promise.all([
        server_1.prisma.booking.findMany({
            where,
            orderBy,
            skip: (validPage - 1) * validLimit,
            take: validLimit,
            include: {
                customer: {
                    select: { email: true, phone: true, avatar: true },
                },
            },
        }),
        server_1.prisma.booking.count({ where }),
    ]);
    const pagination = (0, helpers_1.calculatePagination)(validPage, validLimit, total);
    res.json({
        success: true,
        data: {
            bookings,
            pagination,
        },
    });
}));
exports.default = router;
