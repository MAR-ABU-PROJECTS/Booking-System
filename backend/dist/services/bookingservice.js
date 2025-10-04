"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingService = exports.BookingService = exports.bookingActionSchema = exports.searchBookingsSchema = exports.updateBookingSchema = exports.createBookingSchema = void 0;
// MAR ABU PROJECTS SERVICES LLC - Booking Management Service
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const emailservice_1 = require("./emailservice");
const paystackservice_1 = require("./paystackservice");
const error_middleware_1 = require("../middlewares/error.middleware");
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
// NOTE: all refunds are full; remove refundAmount from the schema
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
        // Calculate daily rates (normalized, additive weekend premium)
        const breakdown = [];
        for (let cursor = new Date(checkInDate); cursor < checkOutDate; cursor.setDate(cursor.getDate() + 1)) {
            // Normalize to midnight to avoid TZ drift
            const date = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            // Check for special pricing override
            const specialPricing = await prisma.propertyAvailability.findUnique({
                where: {
                    propertyId_date: {
                        propertyId,
                        date,
                    },
                },
                select: { price: true },
            });
            // Use special pricing if available, otherwise use base rate (no weekend premium)
            const dailyRate = specialPricing?.price ?? property.baseRate;
            breakdown.push({
                date: date.toISOString().split("T")[0],
                rate: dailyRate,
                isWeekend,
            });
        }
        // BASE AMOUNT = Property's base rate per night (from database)
        const baseAmount = property.baseRate;
        // Total nightly amount (sum of all nights with weekend premiums)
        const totalNightlyAmount = breakdown.reduce((sum, d) => sum + d.rate, 0);
        // Calculate standalone fees
        const cleaningFee = property.cleaningFee || 0;
        const serviceFeeRate = property.serviceFee || 0.05;
        const serviceFee = Math.round(totalNightlyAmount * serviceFeeRate);
        const taxes = 0; // Add tax calculation if needed
        // Calculate discounts
        let discounts = 0;
        if (promoCode) {
            const promo = await prisma.promoCode.findUnique({
                where: { code: promoCode },
            });
            if (promo &&
                promo.active &&
                (!promo.startDate || promo.startDate <= new Date()) &&
                (!promo.endDate || promo.endDate >= new Date())) {
                discounts = Math.round(totalNightlyAmount * (promo.discount / 100));
            }
        }
        // TOTAL = (Total Nightly Amount) + Cleaning Fee + Service Fee + Taxes - Discounts
        const totalAmount = totalNightlyAmount + cleaningFee + serviceFee + taxes - discounts;
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
            // Create booking with status APPROVED
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
                    status: client_1.BookingStatus.APPROVED, // <-- Auto-approve
                    paymentStatus: client_1.PaymentStatus.PENDING,
                    approvedBy: customerId,
                    approvedAt: new Date(),
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
            // Emails
            await emailservice_1.emailService.sendBookingConfirmation(booking.guestEmail, booking);
            await emailservice_1.emailService.sendBookingApprovedEmail(booking.guestEmail, booking);
            // Notifications
            await this.sendBookingNotifications(booking, "APPROVED");
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
                review: { select: { id: true, rating: true } },
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
            const validatedParams = exports.searchBookingsSchema.parse(searchParams);
            const { status, paymentStatus, propertyId, customerId, checkInFrom, checkInTo, bookingNumber, guestEmail, page, limit, sortBy, sortOrder, } = validatedParams;
            const whereClause = {};
            // Role scoping
            if (userId && userRole) {
                if (userRole === client_1.UserRole.CUSTOMER) {
                    whereClause.customerId = userId;
                }
                else if (userRole === client_1.UserRole.ADMIN) {
                    whereClause.property = { hostId: userId };
                }
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
                // NB: your field is bookingCode; keep compatibility if you meant bookingNumber in API layer
                whereClause.bookingCode = {
                    contains: bookingNumber,
                    mode: "insensitive",
                };
            if (guestEmail)
                whereClause.guestEmail = { contains: guestEmail, mode: "insensitive" };
            if (checkInFrom || checkInTo) {
                whereClause.checkInDate = {};
                if (checkInFrom)
                    whereClause.checkInDate.gte = new Date(checkInFrom);
                if (checkInTo)
                    whereClause.checkInDate.lte = new Date(checkInTo);
            }
            const orderBy = {};
            switch (sortBy) {
                case "checkIn":
                    orderBy.checkInDate = sortOrder;
                    break;
                case "totalAmount":
                    orderBy.total = sortOrder;
                    break;
                case "status":
                    orderBy.status = sortOrder;
                    break;
                case "created":
                default:
                    orderBy.createdAt = sortOrder;
                    break;
            }
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
                        receipts: { orderBy: { uploadedAt: "desc" } },
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
            const validatedData = exports.updateBookingSchema.parse(updateData);
            const existingBooking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: { property: { select: { hostId: true } } },
            });
            if (!existingBooking) {
                throw new Error("Booking not found");
            }
            const canUpdate = existingBooking.customerId === userId ||
                existingBooking.property.hostId === userId ||
                userRole === client_1.UserRole.ADMIN;
            if (!canUpdate) {
                throw new Error("Unauthorized to update this booking");
            }
            if (existingBooking.status === client_1.BookingStatus.COMPLETED &&
                userRole !== client_1.UserRole.ADMIN) {
                throw new Error("Cannot update completed booking");
            }
            // Recalculate pricing if dates/guests changed
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
                    total: pricing.totalAmount,
                };
            }
            const updatedBooking = await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    ...validatedData,
                    ...(validatedData.checkIn && {
                        checkInDate: new Date(validatedData.checkIn),
                    }),
                    ...(validatedData.checkOut && {
                        checkOutDate: new Date(validatedData.checkOut),
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
     * Perform booking action (approve, reject, confirm, check-in/out, cancel)
     * - On "cancel": if payment is PAID, trigger a FULL refund via processRefund()
     */
    async performBookingAction(bookingId, actionData, userId, userRole) {
        try {
            const validatedAction = exports.bookingActionSchema.parse(actionData);
            const booking = await this.getBookingById(bookingId);
            if (!booking) {
                throw new Error("Booking not found");
            }
            // Allow booking owner to cancel, host/admin for other actions
            let canPerformAction = false;
            if (validatedAction.action === "cancel") {
                canPerformAction =
                    booking.customer.id === userId ||
                        booking.property.host.id === userId ||
                        userRole === client_1.UserRole.ADMIN;
            }
            else {
                canPerformAction =
                    booking.property.host.id === userId || userRole === client_1.UserRole.ADMIN;
            }
            if (!canPerformAction) {
                throw new Error("Unauthorized to perform this action");
            }
            let updateData = { adminNotes: validatedAction.adminNotes };
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
                    updateData.cancelledAt = new Date();
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
                    if ([
                        client_1.BookingStatus.COMPLETED,
                        client_1.BookingStatus.CANCELLED,
                    ].includes(booking.status)) {
                        throw new Error("Cannot cancel completed or already cancelled booking");
                    }
                    // If already paid, do a FULL refund and mark cancelled within the same transaction.
                    if (booking.payment?.status === client_1.PaymentStatus.PAID) {
                        // processRefund handles: marking refund pending, calling gateway, updating payment,
                        // cancelling booking, and audit logging — all atomically.
                        const cancelled = await this.processRefund(bookingId, validatedAction.reason || "Cancellation", {
                            id: userId,
                            role: userRole,
                        });
                        // Send emails/notifications about refund
                        await emailservice_1.emailService.sendBookingCancellationWithRefund(booking.customer.email, booking.id);
                        await this.sendBookingNotifications(cancelled, "REFUND_PENDING");
                        return cancelled;
                    }
                    // If not paid yet, just cancel.
                    updateData.status = client_1.BookingStatus.CANCELLED;
                    updateData.cancellationReason =
                        validatedAction.reason || booking.cancellationReason;
                    updateData.cancelledAt = new Date();
                    break;
                default:
                    throw new Error("Invalid action");
            }
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
            await this.logAudit(userId, "UPDATE", "Booking", bookingId, {
                action: validatedAction.action,
                reason: validatedAction.reason,
                newStatus: updateData.status,
            });
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
     * FULL refund processor (Paystack) + cancel booking + audit
     * - Throws AppError on failures
     * - Atomic via Prisma $transaction
     */
    async processRefund(bookingId, reason, user) {
        return prisma.$transaction(async (tx) => {
            // fetch booking + payment
            const booking = await tx.booking.findUnique({
                where: { id: bookingId },
                include: {
                    payment: true,
                    customer: true,
                    property: { include: { host: true } },
                },
            });
            if (!booking)
                throw new error_middleware_1.AppError("Booking not found", 404);
            const payment = booking.payment;
            if (!payment || payment.status !== client_1.PaymentStatus.PAID) {
                throw new error_middleware_1.AppError("No valid payment found for refund", 400);
            }
            // prevent double refunds
            if (payment.refundStatus === client_1.RefundStatus.REFUNDED) {
                throw new error_middleware_1.AppError("Refund already processed", 400);
            }
            // check refund window (no refund within 24h to check-in)
            if (!this.isRefundAllowed(booking.checkInDate)) {
                throw new error_middleware_1.AppError("Refund not allowed within 24h of check-in", 400);
            }
            // mark refund as pending
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    refundStatus: client_1.RefundStatus.PENDING,
                    refundRequestedAt: new Date(),
                },
            });
            try {
                // Paystack refund (full)
                const refund = await paystackservice_1.paystackService.refundPayment(payment.reference);
                // update payment
                const updatedPayment = await tx.payment.update({
                    where: { id: payment.id },
                    data: {
                        refundStatus: client_1.RefundStatus.REFUNDED,
                        refundAmount: refund?.data?.amount
                            ? refund.data.amount / 100
                            : booking.total, // fallback to total
                        refundCompletedAt: new Date(),
                        refundedAt: new Date(),
                        gatewayResponse: JSON.parse(JSON.stringify(refund || {})),
                    },
                });
                // update booking as cancelled (if not already)
                const cancelledBooking = await tx.booking.update({
                    where: { id: booking.id },
                    data: {
                        status: client_1.BookingStatus.CANCELLED,
                        cancelledAt: new Date(),
                        cancellationReason: reason,
                        paymentStatus: client_1.PaymentStatus.PENDING, // reset since refunded
                        refundAmount: updatedPayment.refundAmount ?? booking.total,
                    },
                    include: {
                        customer: true,
                        property: { include: { host: true } },
                        receipts: true,
                    },
                });
                // audit log
                await tx.auditLog.create({
                    data: {
                        userId: user.id,
                        action: "REFUND_BOOKING",
                        entity: "Booking",
                        entityId: booking.id,
                        changes: { refund: "FULL_REFUND" },
                        metadata: {
                            reason,
                            role: user.role,
                        },
                    },
                });
                return cancelledBooking;
            }
            catch (err) {
                await tx.payment.update({
                    where: { id: payment.id },
                    data: {
                        refundStatus: client_1.RefundStatus.FAILED,
                        refundFailedReason: err?.message || "Unknown refund error",
                    },
                });
                throw new error_middleware_1.AppError(`Refund failed: ${err?.message || "Unknown error"}`, 500);
            }
        });
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
        // Overlapping bookings
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
        // Availability overrides
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
        const latestBooking = await prisma.booking.findFirst({
            where: { bookingCode: { startsWith: `${prefix}${year}` } },
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
        console.log(`Sending ${eventType} notification for booking ${booking.bookingCode}`);
        const validTypes = Object.values(client_1.NotificationType);
        const notificationType = `BOOKING_${eventType}`;
        const safeType = validTypes.includes(notificationType)
            ? notificationType
            : client_1.NotificationType.BOOKING_REQUEST; // Use a default valid enum value
        const notifications = [
            {
                userId: booking.customerId,
                type: safeType, // Cast to NotificationType if needed
                title: `Booking ${eventType}`,
                message: `Your booking ${booking.bookingCode} has been ${eventType.toLowerCase()}`,
                data: JSON.stringify({ bookingId: booking.id }),
            },
            {
                userId: booking.property.hostId,
                type: safeType, // Cast to NotificationType if needed
                title: `New booking ${eventType}`,
                message: `Booking ${booking.bookingCode} for ${booking.property.name} has been ${eventType.toLowerCase()}`,
                data: JSON.stringify({ bookingId: booking.id }),
            },
        ];
        await prisma.notification.createMany({ data: notifications });
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
    /**
     * Refund window helper (no refunds within 24h of check-in)
     */
    isRefundAllowed(checkInDate) {
        const cutoff = new Date(checkInDate);
        cutoff.setHours(cutoff.getHours() - 24);
        return new Date() < cutoff;
    }
}
exports.BookingService = BookingService;
exports.bookingService = new BookingService();
