"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.propertyService = exports.PropertyService = exports.availabilitySchema = exports.searchPropertiesSchema = exports.updatePropertySchema = exports.createPropertySchema = void 0;
// MAR ABU PROJECTS SERVICES LLC - Property Management Service
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
// ===============================
// VALIDATION SCHEMAS
// ===============================
exports.createPropertySchema = zod_1.z.object({
    name: zod_1.z.string().min(3, "Property name must be at least 3 characters"),
    description: zod_1.z.string().optional(),
    type: zod_1.z.nativeEnum(client_1.PropertyType),
    address: zod_1.z.string().min(10, "Address must be at least 10 characters"),
    city: zod_1.z.string().min(2, "City is required"),
    state: zod_1.z.string().min(2, "State is required"),
    country: zod_1.z.string().default("Nigeria"),
    latitude: zod_1.z.number().optional(),
    longitude: zod_1.z.number().optional(),
    bedrooms: zod_1.z.number().int().min(1, "Must have at least 1 bedroom"),
    bathrooms: zod_1.z.number().int().min(1, "Must have at least 1 bathroom"),
    maxGuests: zod_1.z.number().int().min(1, "Must accommodate at least 1 guest"),
    size: zod_1.z.number().positive().optional(),
    floor: zod_1.z.number().int().optional(),
    buildingName: zod_1.z.string().optional(),
    baseRate: zod_1.z.number().positive("Base rate must be positive"),
    weekendPremium: zod_1.z.number().min(0).max(100).default(0),
    monthlyDiscount: zod_1.z.number().min(0).max(50).default(0),
    cleaningFee: zod_1.z.number().min(0).default(0),
    securityDeposit: zod_1.z.number().min(0).default(0),
    cautionFee: zod_1.z.number().min(0).max(1).default(0.05),
    minStay: zod_1.z.number().int().min(1).default(1),
    maxStay: zod_1.z.number().int().max(365).default(90),
    checkInTime: zod_1.z
        .string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .default("15:00"),
    checkOutTime: zod_1.z
        .string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .default("11:00"),
    cancellationPolicy: zod_1.z.string().optional(),
    houseRules: zod_1.z.string().optional(),
    amenities: zod_1.z
        .array(zod_1.z.object({
        name: zod_1.z.string().min(1),
        category: zod_1.z.string().default("Basic"),
        icon: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
    }))
        .default([]),
});
exports.updatePropertySchema = exports.createPropertySchema.partial();
exports.searchPropertiesSchema = zod_1.z.object({
    city: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    type: zod_1.z.nativeEnum(client_1.PropertyType).optional(),
    status: zod_1.z.nativeEnum(client_1.PropertyStatus).optional(),
    minPrice: zod_1.z.number().optional(),
    maxPrice: zod_1.z.number().optional(),
    minBedrooms: zod_1.z.number().int().optional(),
    maxGuests: zod_1.z.number().int().optional(),
    amenities: zod_1.z.array(zod_1.z.string()).optional(),
    checkIn: zod_1.z.string().datetime().optional(),
    checkOut: zod_1.z.string().datetime().optional(),
    page: zod_1.z.number().int().min(1).default(1),
    limit: zod_1.z.number().int().min(1).max(100).default(20),
    sortBy: zod_1.z.enum(["price", "rating", "created", "name"]).default("created"),
    sortOrder: zod_1.z.enum(["asc", "desc"]).default("desc"),
});
exports.availabilitySchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    available: zod_1.z.boolean().default(true),
    price: zod_1.z.number().positive().optional(),
    minStay: zod_1.z.number().int().min(1).optional(),
    notes: zod_1.z.string().optional(),
});
// ===============================
// PROPERTY SERVICE CLASS
// ===============================
class PropertyService {
    /**
     * Create a new property
     */
    async createProperty(hostId, propertyData) {
        try {
            // Validate input
            const validatedData = exports.createPropertySchema.parse(propertyData);
            // Create property with amenities
            const { amenities, ...propertyFields } = validatedData;
            const property = await prisma.property.create({
                data: {
                    ...propertyFields,
                    hostId,
                    currency: "NGN",
                    propertyAmenities: {
                        create: amenities.map((amenity) => ({
                            name: amenity.name,
                            category: amenity.category,
                            icon: amenity.icon,
                            description: amenity.description,
                        })),
                    },
                },
                include: {
                    host: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    propertyImages: {
                        orderBy: { order: "asc" },
                    },
                    propertyAmenities: true,
                },
            });
            // Log audit
            await this.logAudit(hostId, "CREATE", "Property", property.id, {
                propertyName: property.name,
            });
            return property;
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(", ")}`);
            }
            throw error;
        }
    }
    /**
     * Get property by ID
     */
    async getPropertyById(propertyId, includeUnavailable = false) {
        const whereClause = { id: propertyId };
        if (!includeUnavailable) {
            whereClause.status = { not: client_1.PropertyStatus.INACTIVE };
        }
        const property = await prisma.property.findFirst({
            where: whereClause,
            include: {
                host: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                propertyImages: {
                    orderBy: { order: "asc" },
                },
                propertyAmenities: true,
                reviews: {
                    where: { approved: true },
                    select: { rating: true },
                },
            },
        });
        if (!property)
            return null;
        // Calculate average rating
        const averageRating = property.reviews.length > 0
            ? property.reviews.reduce((sum, review) => sum + review.rating, 0) /
                property.reviews.length
            : 0;
        const { reviews, ...propertyWithoutReviews } = property;
        return {
            ...propertyWithoutReviews,
            averageRating: Number(averageRating.toFixed(1)),
            reviewCount: reviews.length,
        };
    }
    /**
     * Update property
     */
    async updateProperty(propertyId, hostId, updateData, userRole) {
        try {
            // Validate input
            const validatedData = exports.updatePropertySchema.parse(updateData);
            // Check ownership or admin permissions
            const existingProperty = await prisma.property.findUnique({
                where: { id: propertyId },
                select: { hostId: true },
            });
            if (!existingProperty) {
                throw new Error("Property not found");
            }
            if (existingProperty.hostId !== hostId && userRole !== client_1.UserRole.ADMIN) {
                throw new Error("Unauthorized to update this property");
            }
            // Separate amenities from other fields
            const { amenities, ...propertyFields } = validatedData;
            // Update property
            const updatedProperty = await prisma.property.update({
                where: { id: propertyId },
                data: {
                    ...propertyFields,
                    ...(amenities && {
                        amenities: amenities.map((a) => a.name),
                    }),
                },
                include: {
                    host: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    propertyImages: {
                        orderBy: { order: "asc" },
                    },
                    propertyAmenities: true,
                },
            });
            // Log audit
            await this.logAudit(hostId, "UPDATE", "Property", propertyId, validatedData);
            return updatedProperty;
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(", ")}`);
            }
            throw error;
        }
    }
    /**
     * Delete property
     */
    async deleteProperty(propertyId, hostId, userRole) {
        // Check ownership or admin permissions
        const existingProperty = await prisma.property.findUnique({
            where: { id: propertyId },
            select: { hostId: true, name: true },
        });
        if (!existingProperty) {
            throw new Error("Property not found");
        }
        if (existingProperty.hostId !== hostId && userRole !== client_1.UserRole.ADMIN) {
            throw new Error("Unauthorized to delete this property");
        }
        // Check for active bookings
        const activeBookings = await prisma.booking.count({
            where: {
                propertyId,
                status: {
                    in: ["PENDING", "APPROVED", "CONFIRMED", "CHECKED_IN"],
                },
            },
        });
        if (activeBookings > 0) {
            throw new Error("Cannot delete property with active bookings");
        }
        // Soft delete by setting status to INACTIVE
        await prisma.property.update({
            where: { id: propertyId },
            data: { status: client_1.PropertyStatus.INACTIVE },
        });
        // Log audit
        await this.logAudit(hostId, "DELETE", "Property", propertyId, {
            propertyName: existingProperty.name,
        });
    }
    /**
     * Search and filter properties
     */
    async searchProperties(searchParams) {
        try {
            // Validate input
            const validatedParams = exports.searchPropertiesSchema.parse(searchParams);
            const { city, state, type, status, minPrice, maxPrice, minBedrooms, maxGuests, amenities, checkIn, checkOut, page, limit, sortBy, sortOrder, } = validatedParams;
            // Build where clause
            const whereClause = {
                status: status || { not: client_1.PropertyStatus.INACTIVE },
            };
            if (city)
                whereClause.city = { contains: city, mode: "insensitive" };
            if (state)
                whereClause.state = { contains: state, mode: "insensitive" };
            if (type)
                whereClause.type = type;
            if (minPrice || maxPrice) {
                whereClause.baseRate = {};
                if (minPrice)
                    whereClause.baseRate.gte = minPrice;
                if (maxPrice)
                    whereClause.baseRate.lte = maxPrice;
            }
            if (minBedrooms)
                whereClause.bedrooms = { gte: minBedrooms };
            if (maxGuests)
                whereClause.maxGuests = { gte: maxGuests };
            // Filter by amenities
            if (amenities && amenities.length > 0) {
                whereClause.amenities = {
                    some: {
                        name: { in: amenities },
                    },
                };
            }
            // Check availability if dates provided
            if (checkIn && checkOut) {
                const checkInDate = new Date(checkIn);
                const checkOutDate = new Date(checkOut);
                whereClause.AND = [
                    {
                        NOT: {
                            bookings: {
                                some: {
                                    AND: [
                                        { checkIn: { lt: checkOutDate } },
                                        { checkOut: { gt: checkInDate } },
                                        {
                                            status: {
                                                in: [
                                                    "PENDING_APPROVAL",
                                                    "APPROVED",
                                                    "CONFIRMED",
                                                    "CHECKED_IN",
                                                ],
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    {
                        NOT: {
                            availability: {
                                some: {
                                    AND: [
                                        { date: { gte: checkInDate } },
                                        { date: { lt: checkOutDate } },
                                        { available: false },
                                    ],
                                },
                            },
                        },
                    },
                ];
            }
            // Build order by
            const orderBy = {};
            switch (sortBy) {
                case "price":
                    orderBy.baseRate = sortOrder;
                    break;
                case "rating":
                    orderBy.reviews = { _avg: { rating: sortOrder } };
                    break;
                case "name":
                    orderBy.name = sortOrder;
                    break;
                case "created":
                default:
                    orderBy.createdAt = sortOrder;
                    break;
            }
            // Execute queries
            const [properties, total] = await Promise.all([
                prisma.property.findMany({
                    where: whereClause,
                    include: {
                        host: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                        propertyImages: {
                            where: { isMain: true },
                            take: 1,
                        },
                        propertyAmenities: true,
                        reviews: {
                            where: { approved: true },
                            select: { rating: true },
                        },
                    },
                    orderBy,
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma.property.count({ where: whereClause }),
            ]);
            // Process results
            const processedProperties = properties.map((property) => {
                const { reviews, ...propertyData } = property;
                const averageRating = reviews.length > 0
                    ? reviews.reduce((sum, review) => sum + review.rating, 0) /
                        reviews.length
                    : 0;
                return {
                    ...propertyData,
                    averageRating: Number(averageRating.toFixed(1)),
                    reviewCount: reviews.length,
                };
            });
            return {
                properties: processedProperties,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(", ")}`);
            }
            throw error;
        }
    }
    /**
     * Get properties by host
     */
    async getPropertiesByHost(hostId, includeInactive = false) {
        const whereClause = { hostId };
        if (!includeInactive) {
            whereClause.status = { not: client_1.PropertyStatus.INACTIVE };
        }
        const properties = await prisma.property.findMany({
            where: whereClause,
            include: {
                host: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                propertyImages: {
                    orderBy: { order: "asc" },
                },
                propertyAmenities: true,
                reviews: {
                    where: { approved: true },
                    select: { rating: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return properties.map((property) => {
            const { reviews, ...propertyData } = property;
            const averageRating = reviews.length > 0
                ? reviews.reduce((sum, review) => sum + review.rating, 0) /
                    reviews.length
                : 0;
            return {
                ...propertyData,
                averageRating: Number(averageRating.toFixed(1)),
                reviewCount: reviews.length,
            };
        });
    }
    /**
     * Update property availability
     */
    async updateAvailability(propertyId, hostId, availabilityData, userRole) {
        try {
            // Validate input
            const validatedData = exports.availabilitySchema.parse(availabilityData);
            // Check ownership
            const property = await prisma.property.findUnique({
                where: { id: propertyId },
                select: { hostId: true },
            });
            if (!property) {
                throw new Error("Property not found");
            }
            if (property.hostId !== hostId && userRole !== client_1.UserRole.ADMIN) {
                throw new Error("Unauthorized to update availability");
            }
            const startDate = new Date(validatedData.startDate);
            const endDate = new Date(validatedData.endDate);
            // Generate dates between start and end
            const dates = [];
            for (let date = new Date(startDate); date < endDate; date.setDate(date.getDate() + 1)) {
                dates.push(new Date(date));
            }
            // Batch update availability
            await prisma.$transaction(dates.map((date) => prisma.propertyAvailability.upsert({
                where: {
                    propertyId_date: {
                        propertyId,
                        date,
                    },
                },
                update: {
                    available: validatedData.available,
                    price: validatedData.price,
                    minStay: validatedData.minStay,
                    notes: validatedData.notes,
                },
                create: {
                    propertyId,
                    date,
                    available: validatedData.available,
                    price: validatedData.price,
                    minStay: validatedData.minStay,
                    notes: validatedData.notes,
                },
            })));
            // Log audit
            await this.logAudit(hostId, "UPDATE", "PropertyAvailability", propertyId, {
                startDate: validatedData.startDate,
                endDate: validatedData.endDate,
                available: validatedData.available,
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(", ")}`);
            }
            throw error;
        }
    }
    /**
     * Check property availability
     */
    async checkAvailability(propertyId, checkIn, checkOut) {
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        // Check for existing bookings
        const existingBookings = await prisma.booking.findMany({
            where: {
                propertyId,
                AND: [
                    { checkInDate: { lt: checkOutDate } },
                    { checkOutDate: { gt: checkInDate } },
                    {
                        status: {
                            in: ["PENDING", "APPROVED", "CONFIRMED", "CHECKED_IN"],
                        },
                    },
                ],
            },
            select: { checkInDate: true, checkOutDate: true },
        });
        if (existingBookings.length > 0) {
            return { available: false };
        }
        // Check availability overrides
        const unavailableDates = await prisma.propertyAvailability.findMany({
            where: {
                propertyId,
                date: { gte: checkInDate, lt: checkOutDate },
                available: false,
            },
            select: { date: true },
        });
        if (unavailableDates.length > 0) {
            return {
                available: false,
                blockedDates: unavailableDates.map((d) => d.date.toISOString()),
            };
        }
        // Calculate price (including any date-specific pricing)
        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            select: { baseRate: true },
        });
        if (!property) {
            throw new Error("Property not found");
        }
        const specialPricing = await prisma.propertyAvailability.findMany({
            where: {
                propertyId,
                date: { gte: checkInDate, lt: checkOutDate },
                price: { not: null },
            },
            select: { date: true, price: true },
        });
        // Calculate total price
        let totalPrice = 0;
        const dates = [];
        for (let date = new Date(checkInDate); date < checkOutDate; date.setDate(date.getDate() + 1)) {
            dates.push(new Date(date));
        }
        for (const date of dates) {
            const specialPrice = specialPricing.find((sp) => sp.date.toDateString() === date.toDateString());
            totalPrice += specialPrice?.price || property.baseRate;
        }
        return {
            available: true,
            price: totalPrice,
        };
    }
    /**
     * Get property analytics
     */
    async getPropertyAnalytics(propertyId, hostId, userRole, startDate, endDate) {
        // Check ownership
        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            select: { hostId: true },
        });
        if (!property) {
            throw new Error("Property not found");
        }
        if (property.hostId !== hostId && userRole !== client_1.UserRole.ADMIN) {
            throw new Error("Unauthorized to view analytics");
        }
        const dateFilter = {};
        if (startDate)
            dateFilter.gte = new Date(startDate);
        if (endDate)
            dateFilter.lte = new Date(endDate);
        const [bookingStats, revenueStats, reviewStats] = await Promise.all([
            // Booking statistics
            prisma.booking.aggregate({
                where: {
                    propertyId,
                    ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
                },
                _count: { id: true },
                _sum: { total: true, nights: true },
                _avg: { total: true },
            }),
            // Revenue by month
            prisma.booking.groupBy({
                by: ["createdAt"],
                where: {
                    propertyId,
                    status: {
                        in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "COMPLETED"],
                    },
                    ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
                },
                _sum: { total: true },
                _count: { id: true },
            }),
            // Review statistics
            prisma.review.aggregate({
                where: {
                    propertyId,
                    approved: true,
                    ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
                },
                _count: { id: true },
                _avg: { rating: true },
            }),
        ]);
        return {
            bookings: {
                total: bookingStats._count.id || 0,
                totalRevenue: bookingStats._sum.total || 0,
                averageBookingValue: bookingStats._avg.total || 0,
                totalNights: bookingStats._sum.nights || 0,
            },
            reviews: {
                total: reviewStats._count.id || 0,
                averageRating: reviewStats._avg.rating || 0,
            },
            revenueByMonth: revenueStats,
        };
    }
    /**
     * Log audit trail
     */
    async logAudit(userId, action, entity, entityId, changes) {
        try {
            await prisma.auditLog.create({
                data: {
                    userId,
                    action,
                    entity,
                    entityId,
                    changes: changes || {},
                },
            });
        }
        catch (error) {
            console.error("Failed to log audit:", error);
        }
    }
}
exports.PropertyService = PropertyService;
exports.propertyService = new PropertyService();
