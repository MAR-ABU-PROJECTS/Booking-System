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
router.get("/", (0, authservice_1.optionalAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20, city, type, minPrice, maxPrice, bedrooms, bathrooms, maxGuests, amenities, sortBy = "createdAt", order = "desc", } = req.query;
    const { page: validPage, limit: validLimit } = (0, helpers_1.validatePagination)(page, limit);
    // Build where clause
    const where = {
        status: client_1.PropertyStatus.ACTIVE,
    };
    if (city)
        where.city = { contains: city, mode: "insensitive" };
    if (type)
        where.type = type;
    if (bedrooms)
        where.bedrooms = { gte: parseInt(bedrooms) };
    if (bathrooms)
        where.bathrooms = { gte: parseInt(bathrooms) };
    if (maxGuests)
        where.maxGuests = { gte: parseInt(maxGuests) };
    if (minPrice || maxPrice) {
        where.baseRate = {};
        if (minPrice)
            where.baseRate.gte = parseFloat(minPrice);
        if (maxPrice)
            where.baseRate.lte = parseFloat(maxPrice);
    }
    // Handle amenities filter
    if (amenities) {
        const amenityList = Array.isArray(amenities) ? amenities : [amenities];
        where.amenities = {
            hasEvery: amenityList,
        };
    }
    // Build order by clause
    const orderBy = {};
    orderBy[sortBy] = order;
    const [properties, total] = await Promise.all([
        server_1.prisma.property.findMany({
            where,
            orderBy,
            skip: (validPage - 1) * validLimit,
            take: validLimit,
            include: {
                host: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
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
        server_1.prisma.property.count({ where }),
    ]);
    // Calculate average ratings
    const propertiesWithRatings = properties.map((property) => {
        const ratings = property.reviews.map((r) => r.rating);
        const averageRating = ratings.length > 0
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
    const pagination = (0, helpers_1.calculatePagination)(validPage, validLimit, total);
    res.json({
        success: true,
        data: {
            properties: propertiesWithRatings,
            pagination,
        },
    });
}));
/**
 * @route   GET /api/v1/properties/:id
 * @desc    Get property details
 * @access  Public
 */
router.get("/:id", (0, authservice_1.optionalAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const property = await server_1.prisma.property.findUnique({
        where: { id: req.params.id },
        include: {
            host: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
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
                        select: {
                            firstName: true,
                            lastName: true,
                            avatar: true,
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
        throw new error_middleware_2.AppError("Property not found", 404);
    }
    // Calculate average rating
    const ratings = property.reviews.map((r) => r.rating);
    const averageRating = ratings.length > 0
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
}));
/**
 * @route   GET /api/v1/properties/:id/availability
 * @desc    Check property availability for dates
 * @access  Public
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
// ===============================
// PROPERTY HOST ROUTES
// ===============================
/**
 * @route   GET /api/v1/properties/my-properties
 * @desc    Get properties owned by current user
 * @access  Property Host
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
router.post("/", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.body)("name").trim().notEmpty().withMessage("Property name required"),
    (0, express_validator_1.body)("description").trim().notEmpty().withMessage("Description required"),
    (0, express_validator_1.body)("type")
        .isIn(Object.values(client_1.PropertyType))
        .withMessage("Invalid property type"),
    (0, express_validator_1.body)("address").trim().notEmpty().withMessage("Address required"),
    (0, express_validator_1.body)("city").trim().notEmpty().withMessage("City required"),
    (0, express_validator_1.body)("state").trim().notEmpty().withMessage("State required"),
    (0, express_validator_1.body)("zipCode").trim().notEmpty().withMessage("Zip code required"),
    (0, express_validator_1.body)("country").trim().notEmpty().withMessage("Country required"),
    (0, express_validator_1.body)("latitude").isFloat().withMessage("Valid latitude required"),
    (0, express_validator_1.body)("longitude").isFloat().withMessage("Valid longitude required"),
    (0, express_validator_1.body)("bedrooms")
        .isInt({ min: 0 })
        .withMessage("Valid bedroom count required"),
    (0, express_validator_1.body)("bathrooms")
        .isInt({ min: 0 })
        .withMessage("Valid bathroom count required"),
    (0, express_validator_1.body)("maxGuests")
        .isInt({ min: 1 })
        .withMessage("Valid guest count required"),
    (0, express_validator_1.body)("baseRate")
        .isFloat({ min: 0 })
        .withMessage("Valid base rate required"),
    (0, express_validator_1.body)("cleaningFee").optional().isFloat({ min: 0 }),
    (0, express_validator_1.body)("amenities").isArray().withMessage("Amenities must be an array"),
    (0, express_validator_1.body)("houseRules").optional().isArray(),
    (0, express_validator_1.body)("images").isArray().withMessage("Images must be an array"),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const propertyData = {
        ...req.body,
        hostId: req.user.id,
        status: client_1.PropertyStatus.PENDING, // Requires admin approval
    };
    const property = await server_1.prisma.property.create({
        data: propertyData,
        include: {
            host: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
        },
    });
    // Create notification for admin
    await server_1.prisma.notification.create({
        data: {
            userId: req.user.id, // This would be admin ID in real implementation
            type: "PROPERTY_SUBMITTED",
            title: "New Property Submitted",
            message: `${property.host.firstName} ${property.host.lastName} submitted a new property: ${property.name}`,
            metadata: {
                propertyId: property.id,
            },
        },
    });
    (0, logger_middleware_1.auditLog)("PROPERTY_CREATED", req.user.id, {
        propertyId: property.id,
        propertyName: property.name,
    }, req.ip);
    res.status(201).json({
        success: true,
        message: "Property created successfully. It will be reviewed by our team.",
        data: property,
    });
}));
/**
 * @route   PUT /api/v1/properties/:id
 * @desc    Update property
 * @access  Property Host (owner), Admin
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
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        avatar: true,
                    },
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
