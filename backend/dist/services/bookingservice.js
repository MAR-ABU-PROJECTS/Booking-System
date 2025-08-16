"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingService = exports.BookingService = exports.bookingActionSchema = exports.searchBookingsSchema = exports.updateBookingSchema = exports.createBookingSchema = void 0;
// MAR ABU PROJECTS SERVICES LLC - Booking Management Service
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
// ===============================
// VALIDATION SCHEMAS
// ===============================
exports.createBookingSchema = zod_1.z.object({
    propertyId: zod_1.z.string().cuid("Invalid property ID"),
    checkIn: zod_1.z.string().datetime("Invalid check-in date"),
    checkOut: zod_1.z.string().datetime("Invalid check-out date"),
    adults: zod_1.z.number().int().min(1, "Must have at least 1 adult"),
    children: zod_1.z
        .number()
        .int()
        .min(0, "Children count cannot be negative")
        .default(0),
    guestName: zod_1.z.string().min(2, "Guest name must be at least 2 characters"),
    guestEmail: zod_1.z.string().email("Invalid guest email"),
    guestPhone: zod_1.z.string().min(10, "Valid phone number required"),
    guestAddress: zod_1.z.string().optional(),
    specialRequests: zod_1.z.string().optional(),
    arrivalTime: zod_1.z.string().optional(),
    paymentMethod: zod_1.z
        .enum(["bank_transfer", "card", "mobile_money", "cash"])
        .default("bank_transfer"),
});
exports.updateBookingSchema = zod_1.z.object({
    checkIn: zod_1.z.string().datetime().optional(),
    checkOut: zod_1.z.string().datetime().optional(),
    adults: zod_1.z.number().int().min(1).optional(),
    children: zod_1.z.number().int().min(0).optional(),
    guestName: zod_1.z.string().min(2).optional(),
    guestEmail: zod_1.z.string().email().optional(),
    guestPhone: zod_1.z.string().min(10).optional(),
    guestAddress: zod_1.z.string().optional(),
    specialRequests: zod_1.z.string().optional(),
    arrivalTime: zod_1.z.string().optional(),
    adminNotes: zod_1.z.string().optional(),
});
exports.searchBookingsSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.BookingStatus).optional(),
    paymentStatus: zod_1.z.nativeEnum(client_1.PaymentStatus).optional(),
    propertyId: zod_1.z.string().cuid().optional(),
    customerId: zod_1.z.string().cuid().optional(),
    checkInFrom: zod_1.z.string().datetime().optional(),
    checkInTo: zod_1.z.string().datetime().optional(),
    bookingNumber: zod_1.z.string().optional(),
    guestEmail: zod_1.z.string().email().optional(),
    page: zod_1.z.number().int().min(1).default(1),
    limit: zod_1.z.number().int().min(1).max(100).default(20),
    sortBy: zod_1.z
        .enum(["created", "checkIn", "totalAmount", "status"])
        .default("created"),
    sortOrder: zod_1.z.enum(["asc", "desc"]).default("desc"),
});
exports.bookingActionSchema = zod_1.z.object({
    action: zod_1.z.enum([
        "approve",
        "reject",
        "confirm",
        "check_in",
        "check_out",
        "cancel",
    ]),
    reason: zod_1.z.string().optional(),
    refundAmount: zod_1.z.number().positive().optional(),
    adminNotes: zod_1.z.string().optional(),
});
// ===============================
// BOOKING SERVICE CLASS
// ===============================
class BookingService {
    /**
     * Calculate booking pricing
     */
    async calculatePricing(propertyId, checkIn, checkOut, adults = 1, promoCode) {
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        // Validate dates
        if (checkInDate >= checkOutDate) {
            throw new Error("Check-out date must be after check-in date");
        }
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
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
        });
        if (!property) {
            throw new Error("Property not found");
        }
        if (property.status !== "ACTIVE") {
            throw new Error("Property is not available for booking");
        }
        if (adults > property.maxGuests) {
            throw new Error(`Property can accommodate maximum ${property.maxGuests} guests`);
        }
        // Check availability
        const availability = await this.checkAvailability(propertyId, checkIn, checkOut);
        if (!availability.available) {
            throw new Error("Property is not available for selected dates");
        }
        // Calculate daily rates
        const breakdown = [];
        let baseAmount = 0;
        for (let date = new Date(checkInDate); date < checkOutDate; date.setDate(date.getDate() + 1)) {
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const weekendPremium = property.weekendPremium || 0;
            // Check for special pricing
            const specialPricing = await prisma.propertyAvailability.findUnique({
                where: {
                    propertyId_date: {
                        propertyId,
                        date: new Date(date),
                    },
                },
                select: { price: true },
            });
            let dailyRate = specialPricing?.price || property.baseRate;
            if (isWeekend && !specialPricing?.price) {
                dailyRate = dailyRate * (1 + weekendPremium / 100);
            }
            breakdown.push({
                date: date.toISOString().split("T")[0],
                rate: dailyRate,
                isWeekend,
            });
            baseAmount += dailyRate;
        }
        // Calculate fees
        const cleaningFee = property.cleaningFee || 0;
        const serviceFeeRate = property.serviceFee || 0.05;
        const serviceFee = Math.round((baseAmount + cleaningFee) * serviceFeeRate);
        const taxes = 0; // Add tax calculation if needed
        let discounts = 0;
        if (promoCode) {
            // Lookup promo code and apply discount
            const promo = await prisma.promoCode.findUnique({
                where: { code: promoCode },
            });
            if (promo &&
                promo.active &&
                (!promo.startDate || promo.startDate <= new Date()) &&
                (!promo.endDate || promo.endDate >= new Date())) {
                discounts = Math.round((baseAmount + cleaningFee) * (promo.discount / 100));
            }
        }
        const totalAmount = baseAmount + cleaningFee + serviceFee + taxes - discounts;
        return {
            baseAmount: Math.round(baseAmount),
            cleaningFee: Math.round(cleaningFee),
            serviceFee,
            taxes,
            discounts,
            totalAmount: Math.round(totalAmount),
            breakdown,
        };
    }
    /**
     * Create a new booking
     */
    async createBooking(customerId, bookingData) {
        try {
            // Validate input
            const validatedData = exports.createBookingSchema.parse(bookingData);
            const { checkIn, checkOut, adults, children, propertyId } = validatedData;
            // Calculate pricing
            const pricing = await this.calculatePricing(propertyId, checkIn, checkOut, adults);
            // Generate booking number
            const bookingCode = await this.generateBookingNumber();
            // Calculate nights
            const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
                (1000 * 60 * 60 * 24));
            // Create booking
            const booking = await prisma.booking.create({
                data: {
                    bookingCode,
                    customerId,
                    propertyId,
                    checkInDate: new Date(checkIn),
                    checkOutDate: new Date(checkOut),
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
                    discount: pricing.discounts,
                    total: pricing.totalAmount,
                    status: client_1.BookingStatus.PENDING,
                    paymentStatus: client_1.PaymentStatus.PENDING,
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
            });
            // Log audit
            await this.logAudit(customerId, "CREATE", "Booking", booking.id, {
                bookingNumber: booking.bookingCode,
                propertyName: booking.property.name,
                totalAmount: booking.total,
            });
            // Send notifications (implement notification service)
            await this.sendBookingNotifications(booking, "CREATED");
            return booking;
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(", ")}`);
            }
            throw error;
        }
    }
    /**
     * Get booking by ID
     */
    async getBookingById(bookingId, userId, userRole) {
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
                    orderBy: { uploadedAt: "desc" },
                    select: {
                        id: true,
                        fileName: true,
                        fileUrl: true,
                        amount: true,
                        status: true,
                        uploadedAt: true,
                    },
                },
                review: {
                    select: {
                        id: true,
                        rating: true,
                    },
                },
            },
        });
        if (!booking)
            return null;
        // Check access permissions
        if (userId && userRole) {
            const hasAccess = booking.customerId === userId ||
                booking.property.hostId === userId ||
                userRole === client_1.UserRole.ADMIN;
            if (!hasAccess) {
                throw new Error("Unauthorized to view this booking");
            }
        }
        return booking;
    }
    /**
     * Search and filter bookings
     */
    async searchBookings(searchParams, userId, userRole) {
        try {
            // Validate input
            const validatedParams = exports.searchBookingsSchema.parse(searchParams);
            const { status, paymentStatus, propertyId, customerId, checkInFrom, checkInTo, bookingNumber, guestEmail, page, limit, sortBy, sortOrder, } = validatedParams;
            // Build where clause
            const whereClause = {};
            // Apply filters based on user role
            if (userId && userRole) {
                if (userRole === client_1.UserRole.CUSTOMER) {
                    whereClause.customerId = userId;
                }
                else if (userRole === client_1.UserRole.ADMIN) {
                    whereClause.property = { hostId: userId };
                }
                // Admins can see all bookings
            }
            if (status)
                whereClause.status = status;
            if (paymentStatus)
                whereClause.paymentStatus = paymentStatus;
            if (propertyId)
                whereClause.propertyId = propertyId;
            if (customerId)
                whereClause.customerId = customerId;
            if (bookingNumber)
                whereClause.bookingNumber = {
                    contains: bookingNumber,
                    mode: "insensitive",
                };
            if (guestEmail)
                whereClause.guestEmail = { contains: guestEmail, mode: "insensitive" };
            if (checkInFrom || checkInTo) {
                whereClause.checkIn = {};
                if (checkInFrom)
                    whereClause.checkIn.gte = new Date(checkInFrom);
                if (checkInTo)
                    whereClause.checkIn.lte = new Date(checkInTo);
            }
            // Build order by
            const orderBy = {};
            switch (sortBy) {
                case "checkIn":
                    orderBy.checkIn = sortOrder;
                    break;
                case "totalAmount":
                    orderBy.totalAmount = sortOrder;
                    break;
                case "status":
                    orderBy.status = sortOrder;
                    break;
                case "created":
                default:
                    orderBy.createdAt = sortOrder;
                    break;
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
                            orderBy: { uploadedAt: "desc" },
                        },
                    },
                    orderBy,
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma.booking.count({ where: whereClause }),
                this.getBookingSummary(whereClause),
            ]);
            return {
                bookings: bookings,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                summary,
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
     * Update booking
     */
    async updateBooking(bookingId, updateData, userId, userRole) {
        try {
            // Validate input
            const validatedData = exports.updateBookingSchema.parse(updateData);
            // Get existing booking
            const existingBooking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: { property: { select: { hostId: true } } },
            });
            if (!existingBooking) {
                throw new Error("Booking not found");
            }
            // Check permissions
            const canUpdate = existingBooking.customerId === userId ||
                existingBooking.property.hostId === userId ||
                userRole === client_1.UserRole.ADMIN;
            if (!canUpdate) {
                throw new Error("Unauthorized to update this booking");
            }
            // Don't allow updates to confirmed/completed bookings unless admin
            if (existingBooking.status === client_1.BookingStatus.COMPLETED &&
                userRole !== client_1.UserRole.ADMIN) {
                throw new Error("Cannot update completed booking");
            }
            // Recalculate pricing if dates or guests changed
            let pricingUpdate = {};
            if (validatedData.checkIn ||
                validatedData.checkOut ||
                validatedData.adults) {
                const checkIn = validatedData.checkIn || existingBooking.checkInDate.toISOString();
                const checkOut = validatedData.checkOut || existingBooking.checkOutDate.toISOString();
                const adults = validatedData.adults || existingBooking.adults;
                const pricing = await this.calculatePricing(existingBooking.propertyId, checkIn, checkOut, adults);
                const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
                    (1000 * 60 * 60 * 24));
                pricingUpdate = {
                    nights,
                    baseAmount: pricing.baseAmount,
                    cleaningFee: pricing.cleaningFee,
                    serviceFee: pricing.serviceFee,
                    totalAmount: pricing.totalAmount,
                };
            }
            // Update booking
            const updatedBooking = await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    ...validatedData,
                    ...(validatedData.checkIn && {
                        checkIn: new Date(validatedData.checkIn),
                    }),
                    ...(validatedData.checkOut && {
                        checkOut: new Date(validatedData.checkOut),
                    }),
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
            });
            // Log audit
            await this.logAudit(userId, "UPDATE", "Booking", bookingId, validatedData);
            return updatedBooking;
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(", ")}`);
            }
            throw error;
        }
    }
    /**
     * Perform booking action (approve, reject, confirm, etc.)
     */
    async performBookingAction(bookingId, actionData, userId, userRole) {
        try {
            // Validate input
            const validatedAction = exports.bookingActionSchema.parse(actionData);
            // Get booking
            const booking = await this.getBookingById(bookingId);
            if (!booking) {
                throw new Error("Booking not found");
            }
            // Check permissions
            const canPerformAction = booking.property.host.id === userId || userRole === client_1.UserRole.ADMIN;
            if (!canPerformAction) {
                throw new Error("Unauthorized to perform this action");
            }
            let updateData = {
                adminNotes: validatedAction.adminNotes,
            };
            switch (validatedAction.action) {
                case "approve":
                    if (booking.status !== client_1.BookingStatus.PENDING) {
                        throw new Error("Booking is not pending approval");
                    }
                    updateData.status = client_1.BookingStatus.APPROVED;
                    updateData.approvedBy = userId;
                    updateData.approvedAt = new Date();
                    break;
                case "reject":
                    if (booking.status !== client_1.BookingStatus.PENDING) {
                        throw new Error("Booking is not pending approval");
                    }
                    updateData.status = client_1.BookingStatus.CANCELLED;
                    updateData.cancellationReason = validatedAction.reason;
                    updateData.cancellationDate = new Date();
                    break;
                case "confirm":
                    if (booking.status !== client_1.BookingStatus.APPROVED) {
                        throw new Error("Booking must be approved before confirmation");
                    }
                    updateData.status = client_1.BookingStatus.CONFIRMED;
                    break;
                case "check_in":
                    if (booking.status !== client_1.BookingStatus.CONFIRMED) {
                        throw new Error("Booking must be confirmed before check-in");
                    }
                    updateData.status = client_1.BookingStatus.CHECKED_IN;
                    break;
                case "check_out":
                    if (booking.status !== client_1.BookingStatus.CHECKED_IN) {
                        throw new Error("Guest must be checked in before check-out");
                    }
                    updateData.status = client_1.BookingStatus.CHECKED_OUT;
                    // Auto-complete after checkout
                    setTimeout(() => {
                        this.completeBooking(bookingId);
                    }, 1000);
                    break;
                case "cancel":
                    if (["COMPLETED", "CANCELLED"].includes(booking.status)) {
                        throw new Error("Cannot cancel completed or already cancelled booking");
                    }
                    updateData.status = client_1.BookingStatus.CANCELLED;
                    updateData.cancellationReason = validatedAction.reason;
                    updateData.cancellationDate = new Date();
                    if (validatedAction.refundAmount) {
                        updateData.refundAmount = validatedAction.refundAmount;
                        updateData.paymentStatus = client_1.PaymentStatus.REFUNDED;
                    }
                    break;
                default:
                    throw new Error("Invalid action");
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
            });
            // Log audit
            await this.logAudit(userId, "UPDATE", "Booking", bookingId, {
                action: validatedAction.action,
                reason: validatedAction.reason,
                newStatus: updateData.status,
            });
            // Send notifications
            await this.sendBookingNotifications(updatedBooking, validatedAction.action.toUpperCase());
            return updatedBooking;
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(", ")}`);
            }
            throw error;
        }
    }
    /**
     * Complete booking (auto-triggered after checkout)
     */
    async completeBooking(bookingId) {
        await prisma.booking.update({
            where: { id: bookingId },
            data: { status: client_1.BookingStatus.COMPLETED },
        });
    }
    /**
     * Check availability for booking dates
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
                            in: [
                                client_1.BookingStatus.PENDING,
                                client_1.BookingStatus.APPROVED,
                                client_1.BookingStatus.CONFIRMED,
                                client_1.BookingStatus.CHECKED_IN,
                            ],
                        },
                    },
                ],
            },
        });
        if (existingBookings.length > 0) {
            return { available: false, reason: "Dates already booked" };
        }
        // Check availability overrides
        const unavailableDates = await prisma.propertyAvailability.findMany({
            where: {
                propertyId,
                date: { gte: checkInDate, lt: checkOutDate },
                available: false,
            },
        });
        if (unavailableDates.length > 0) {
            return {
                available: false,
                reason: "Property not available for selected dates",
            };
        }
        return { available: true };
    }
    /**
     * Generate unique booking number
     */
    async generateBookingNumber() {
        const year = new Date().getFullYear();
        const prefix = "MAR"; // MAR ABU prefix
        // Get the latest booking number for this year
        const latestBooking = await prisma.booking.findFirst({
            where: {
                bookingCode: {
                    startsWith: `${prefix}${year}`,
                },
            },
            orderBy: { createdAt: "desc" },
            select: { bookingCode: true },
        });
        let sequence = 1;
        if (latestBooking) {
            const lastSequence = parseInt(latestBooking.bookingCode.slice(-6));
            sequence = lastSequence + 1;
        }
        return `${prefix}${year}-${sequence.toString().padStart(6, "0")}`;
    }
    /**
     * Get booking summary statistics
     */
    async getBookingSummary(whereClause) {
        const [revenueResult, statusCounts] = await Promise.all([
            prisma.booking.aggregate({
                where: {
                    ...whereClause,
                    status: {
                        in: [
                            client_1.BookingStatus.CONFIRMED,
                            client_1.BookingStatus.CHECKED_IN,
                            client_1.BookingStatus.CHECKED_OUT,
                            client_1.BookingStatus.COMPLETED,
                        ],
                    },
                },
                _sum: { total: true },
            }),
            prisma.booking.groupBy({
                by: ["status"],
                where: whereClause,
                _count: { id: true },
            }),
        ]);
        const statusMap = statusCounts.reduce((acc, item) => {
            acc[item.status] = item._count.id;
            return acc;
        }, {});
        return {
            totalRevenue: revenueResult._sum.total || 0,
            pendingApprovals: statusMap[client_1.BookingStatus.PENDING] || 0,
            activeBookings: (statusMap[client_1.BookingStatus.CONFIRMED] || 0) +
                (statusMap[client_1.BookingStatus.CHECKED_IN] || 0),
            completedBookings: statusMap[client_1.BookingStatus.COMPLETED] || 0,
        };
    }
    /**
     * Send booking notifications (placeholder - implement with notification service)
     */
    async sendBookingNotifications(booking, eventType) {
        // This would integrate with a notification service
        console.log(`Sending ${eventType} notification for booking ${booking.bookingNumber}`);
        // Create notification records
        const notifications = [
            {
                userId: booking.customerId,
                type: `BOOKING_${eventType}`,
                title: `Booking ${eventType}`,
                message: `Your booking ${booking.bookingNumber} has been ${eventType.toLowerCase()}`,
                data: { bookingId: booking.id },
            },
            {
                userId: booking.property.hostId,
                type: `BOOKING_${eventType}`,
                title: `New booking ${eventType}`,
                message: `Booking ${booking.bookingNumber} for ${booking.property.name} has been ${eventType.toLowerCase()}`,
                data: { bookingId: booking.id },
            },
        ];
        await prisma.notification.createMany({
            data: notifications,
        });
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
exports.BookingService = BookingService;
exports.bookingService = new BookingService();
