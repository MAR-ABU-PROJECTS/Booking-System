"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// MAR ABU PROJECTS SERVICES LLC - Payment Processing Routes
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const authservice_1 = require("../services/authservice");
const error_middleware_1 = require("../middlewares/error.middleware");
const error_middleware_2 = require("../middlewares/error.middleware");
const server_1 = require("../server");
const logger_middleware_1 = require("../middlewares/logger.middleware");
const emailservice_1 = require("../services/emailservice");
const paystackservice_1 = require("../services/paystackservice");
const flutterwaveservice_1 = require("../services/flutterwaveservice");
const router = (0, express_1.Router)();
// Validation middleware
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    next();
};
// ===============================
// PAYMENT INITIATION
// ===============================
/**
 * @route   POST /api/v1/payments/initialize
 * @desc    Initialize payment for a booking
 * @access  Protected (booking owner)
 */
router.post('/initialize', (0, authservice_1.requireAuth)(), [
    (0, express_validator_1.body)('bookingId').isString().withMessage('Booking ID required'),
    (0, express_validator_1.body)('paymentMethod').isIn(Object.values(client_1.PaymentMethod)).withMessage('Valid payment method required'),
    (0, express_validator_1.body)('currency').optional().isIn(['NGN', 'USD', 'GBP', 'EUR']).withMessage('Valid currency required'),
], validate, (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { bookingId, paymentMethod, currency = 'NGN' } = req.body;
    // Get booking details
    const booking = yield server_1.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            property: {
                select: {
                    name: true,
                    hostId: true,
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
        throw new error_middleware_2.AppError('Booking not found', 404);
    }
    // Check if user owns the booking
    if (booking.customerId !== req.user.id) {
        throw new error_middleware_2.AppError('Not authorized to pay for this booking', 403);
    }
    // Check if booking is approved
    if (booking.status !== client_1.BookingStatus.APPROVED) {
        throw new error_middleware_2.AppError('Booking must be approved before payment', 400);
    }
    // Check if already paid
    if (booking.paymentStatus === client_1.PaymentStatus.PAID) {
        throw new error_middleware_2.AppError('Booking is already paid', 400);
    }
    // Generate payment reference
    const paymentReference = `MAR_${bookingId}_${Date.now()}`;
    // Create payment record
    const payment = yield server_1.prisma.payment.create({
        data: {
            bookingId,
            amount: booking.total,
            currency,
            paymentMethod,
            paymentReference,
            status: client_1.PaymentStatus.PENDING,
            metadata: {
                customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
                customerEmail: booking.customer.email,
                propertyName: booking.property.name,
                bookingNumber: booking.bookingNumber,
            },
        },
    });
    let paymentData = {};
    try {
        // Initialize payment with selected provider
        switch (paymentMethod) {
            case client_1.PaymentMethod.PAYSTACK:
                paymentData = yield paystackservice_1.paystackService.initializePayment({
                    reference: paymentReference,
                    amount: booking.total * 100, // Paystack expects kobo
                    email: booking.customer.email,
                    currency,
                    callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
                    metadata: {
                        bookingId,
                        paymentId: payment.id,
                        customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
                    },
                });
                break;
            case client_1.PaymentMethod.FLUTTERWAVE:
                paymentData = yield flutterwaveservice_1.flutterwaveService.initializePayment({
                    tx_ref: paymentReference,
                    amount: booking.total,
                    currency,
                    redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
                    customer: {
                        email: booking.customer.email,
                        name: `${booking.customer.firstName} ${booking.customer.lastName}`,
                    },
                    customizations: {
                        title: 'MAR Abu Projects Services',
                        description: `Payment for booking ${booking.bookingNumber}`,
                        logo: `${process.env.FRONTEND_URL}/logo.png`,
                    },
                    meta: {
                        bookingId,
                        paymentId: payment.id,
                    },
                });
                break;
            case client_1.PaymentMethod.BANK_TRANSFER:
                paymentData = {
                    payment_url: null,
                    reference: paymentReference,
                    bank_details: {
                        bank_name: 'First Bank of Nigeria',
                        account_number: '1234567890',
                        account_name: 'MAR ABU PROJECTS SERVICES LLC',
                        routing_number: '011151312',
                    },
                    instructions: [
                        'Transfer the exact amount to the account details above',
                        'Use the payment reference as your transfer description',
                        'Upload your payment receipt after transfer',
                        'Payment will be verified within 24 hours',
                    ],
                };
                break;
            default:
                throw new error_middleware_2.AppError('Payment method not supported', 400);
        }
        // Update payment with provider response
        yield server_1.prisma.payment.update({
            where: { id: payment.id },
            data: {
                providerReference: paymentData.reference || paymentReference,
                providerResponse: paymentData,
            },
        });
        (0, logger_middleware_1.auditLog)('PAYMENT_INITIALIZED', req.user.id, {
            paymentId: payment.id,
            bookingId,
            amount: booking.total,
            paymentMethod,
            reference: paymentReference,
        }, req.ip);
        res.status(201).json({
            success: true,
            message: 'Payment initialized successfully',
            data: {
                payment: {
                    id: payment.id,
                    reference: paymentReference,
                    amount: booking.total,
                    currency,
                    paymentMethod,
                    status: payment.status,
                },
                paymentData,
            },
        });
    }
    catch (error) {
        // Update payment status to failed
        yield server_1.prisma.payment.update({
            where: { id: payment.id },
            data: { status: client_1.PaymentStatus.FAILED },
        });
        throw new error_middleware_2.AppError('Failed to initialize payment', 500);
    }
})));
// ===============================
// PAYMENT VERIFICATION
// ===============================
/**
 * @route   POST /api/v1/payments/verify/:reference
 * @desc    Verify payment status
 * @access  Protected
 */
router.post('/verify/:reference', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { reference } = req.params;
    const payment = yield server_1.prisma.payment.findUnique({
        where: { paymentReference: reference },
        include: {
            booking: {
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
                    customer: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            },
        },
    });
    if (!payment) {
        throw new error_middleware_2.AppError('Payment not found', 404);
    }
    // Check if user is authorized
    if (payment.booking.customerId !== req.user.id && req.user.role !== client_1.UserRole.ADMIN) {
        throw new error_middleware_2.AppError('Not authorized to verify this payment', 403);
    }
    let verificationResult = {};
    try {
        // Verify payment with provider
        switch (payment.paymentMethod) {
            case client_1.PaymentMethod.PAYSTACK:
                verificationResult = yield paystackservice_1.paystackService.verifyPayment(reference);
                break;
            case client_1.PaymentMethod.FLUTTERWAVE:
                verificationResult = yield flutterwaveservice_1.flutterwaveService.verifyPayment(reference);
                break;
            case client_1.PaymentMethod.BANK_TRANSFER:
                // Bank transfer verification is done manually by admin
                if (req.user.role !== client_1.UserRole.ADMIN) {
                    throw new error_middleware_2.AppError('Bank transfer verification requires admin approval', 403);
                }
                verificationResult = { status: 'success', data: { status: 'successful' } };
                break;
            default:
                throw new error_middleware_2.AppError('Payment method not supported for verification', 400);
        }
        const isSuccessful = verificationResult.status === 'success' &&
            (verificationResult.data.status === 'successful' ||
                verificationResult.data.status === 'success');
        if (isSuccessful) {
            // Update payment status
            yield server_1.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: client_1.PaymentStatus.PAID,
                    paidAt: new Date(),
                    providerResponse: verificationResult,
                },
            });
            // Update booking payment status
            yield server_1.prisma.booking.update({
                where: { id: payment.bookingId },
                data: {
                    paymentStatus: client_1.PaymentStatus.PAID,
                    paidAmount: payment.amount,
                    paidAt: new Date(),
                },
            });
            // Create notifications
            yield Promise.all([
                // Notify customer
                server_1.prisma.notification.create({
                    data: {
                        userId: payment.booking.customerId,
                        type: 'PAYMENT_CONFIRMED',
                        title: 'Payment Confirmed',
                        message: `Your payment for booking ${payment.booking.bookingNumber} has been confirmed.`,
                        metadata: {
                            bookingId: payment.bookingId,
                            paymentId: payment.id,
                            amount: payment.amount,
                        },
                    },
                }),
                // Notify host
                server_1.prisma.notification.create({
                    data: {
                        userId: payment.booking.property.hostId,
                        type: 'PAYMENT_RECEIVED',
                        title: 'Payment Received',
                        message: `Payment received for booking ${payment.booking.bookingNumber} at ${payment.booking.property.name}.`,
                        metadata: {
                            bookingId: payment.bookingId,
                            paymentId: payment.id,
                            amount: payment.amount,
                        },
                    },
                }),
            ]);
            // Send email confirmations
            yield Promise.all([
                emailservice_1.emailService.sendPaymentConfirmation(payment.booking.customer.email, {
                    customerName: `${payment.booking.customer.firstName} ${payment.booking.customer.lastName}`,
                    bookingNumber: payment.booking.bookingNumber,
                    propertyName: payment.booking.property.name,
                    amount: payment.amount,
                    paymentReference: reference,
                }),
                emailservice_1.emailService.sendPaymentNotificationToHost(payment.booking.property.host.email, {
                    hostName: `${payment.booking.property.host.firstName} ${payment.booking.property.host.lastName}`,
                    customerName: `${payment.booking.customer.firstName} ${payment.booking.customer.lastName}`,
                    bookingNumber: payment.booking.bookingNumber,
                    propertyName: payment.booking.property.name,
                    amount: payment.amount,
                }),
            ]);
            (0, logger_middleware_1.auditLog)('PAYMENT_VERIFIED', req.user.id, {
                paymentId: payment.id,
                bookingId: payment.bookingId,
                amount: payment.amount,
                reference,
                status: 'successful',
            }, req.ip);
            res.json({
                success: true,
                message: 'Payment verified successfully',
                data: {
                    payment: {
                        id: payment.id,
                        reference,
                        amount: payment.amount,
                        status: client_1.PaymentStatus.PAID,
                        paidAt: new Date(),
                    },
                    booking: {
                        id: payment.booking.id,
                        bookingNumber: payment.booking.bookingNumber,
                        paymentStatus: client_1.PaymentStatus.PAID,
                    },
                },
            });
        }
        else {
            // Payment failed
            yield server_1.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: client_1.PaymentStatus.FAILED,
                    providerResponse: verificationResult,
                },
            });
            (0, logger_middleware_1.auditLog)('PAYMENT_FAILED', req.user.id, {
                paymentId: payment.id,
                bookingId: payment.bookingId,
                reference,
                reason: ((_a = verificationResult.data) === null || _a === void 0 ? void 0 : _a.gateway_response) || 'Payment failed',
            }, req.ip);
            throw new error_middleware_2.AppError('Payment verification failed', 400);
        }
    }
    catch (error) {
        if (error instanceof error_middleware_2.AppError) {
            throw error;
        }
        yield server_1.prisma.payment.update({
            where: { id: payment.id },
            data: { status: client_1.PaymentStatus.FAILED },
        });
        throw new error_middleware_2.AppError('Payment verification failed', 500);
    }
})));
// ===============================
// PAYMENT WEBHOOK HANDLERS
// ===============================
/**
 * @route   POST /api/v1/payments/webhook/paystack
 * @desc    Handle Paystack webhook
 * @access  Public (webhook)
 */
router.post('/webhook/paystack', (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const signature = req.headers['x-paystack-signature'];
    const body = JSON.stringify(req.body);
    // Verify webhook signature
    const isValid = paystackservice_1.paystackService.verifyWebhookSignature(body, signature);
    if (!isValid) {
        throw new error_middleware_2.AppError('Invalid webhook signature', 400);
    }
    const { event, data } = req.body;
    if (event === 'charge.success') {
        const reference = data.reference;
        const payment = yield server_1.prisma.payment.findUnique({
            where: { paymentReference: reference },
            include: { booking: true },
        });
        if (payment && payment.status === client_1.PaymentStatus.PENDING) {
            // Update payment status
            yield server_1.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: client_1.PaymentStatus.PAID,
                    paidAt: new Date(),
                    providerResponse: data,
                },
            });
            // Update booking
            yield server_1.prisma.booking.update({
                where: { id: payment.bookingId },
                data: {
                    paymentStatus: client_1.PaymentStatus.PAID,
                    paidAmount: payment.amount,
                    paidAt: new Date(),
                },
            });
            (0, logger_middleware_1.auditLog)('WEBHOOK_PAYMENT_SUCCESS', 'system', {
                paymentId: payment.id,
                bookingId: payment.bookingId,
                reference,
                provider: 'paystack',
            }, req.ip);
        }
    }
    res.status(200).json({ success: true });
})));
/**
 * @route   POST /api/v1/payments/webhook/flutterwave
 * @desc    Handle Flutterwave webhook
 * @access  Public (webhook)
 */
router.post('/webhook/flutterwave', (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const signature = req.headers['verif-hash'];
    // Verify webhook signature
    const isValid = flutterwaveservice_1.flutterwaveService.verifyWebhookSignature(req.body, signature);
    if (!isValid) {
        throw new error_middleware_2.AppError('Invalid webhook signature', 400);
    }
    const { event, data } = req.body;
    if (event === 'charge.completed' && data.status === 'successful') {
        const reference = data.tx_ref;
        const payment = yield server_1.prisma.payment.findUnique({
            where: { paymentReference: reference },
            include: { booking: true },
        });
        if (payment && payment.status === client_1.PaymentStatus.PENDING) {
            // Update payment status
            yield server_1.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: client_1.PaymentStatus.PAID,
                    paidAt: new Date(),
                    providerResponse: data,
                },
            });
            // Update booking
            yield server_1.prisma.booking.update({
                where: { id: payment.bookingId },
                data: {
                    paymentStatus: client_1.PaymentStatus.PAID,
                    paidAmount: payment.amount,
                    paidAt: new Date(),
                },
            });
            (0, logger_middleware_1.auditLog)('WEBHOOK_PAYMENT_SUCCESS', 'system', {
                paymentId: payment.id,
                bookingId: payment.bookingId,
                reference,
                provider: 'flutterwave',
            }, req.ip);
        }
    }
    res.status(200).json({ success: true });
})));
// ===============================
// PAYMENT MANAGEMENT
// ===============================
/**
 * @route   GET /api/v1/payments
 * @desc    Get payment history
 * @access  Protected
 */
router.get('/', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 20, status, paymentMethod, bookingId, } = req.query;
    // Build where clause
    const where = {};
    // Regular users can only see their own payments
    if (req.user.role === client_1.UserRole.CUSTOMER) {
        where.booking = { customerId: req.user.id };
    }
    else if (req.user.role === client_1.UserRole.ADMIN) {
        where.booking = { property: { hostId: req.user.id } };
    }
    if (status)
        where.status = status;
    if (paymentMethod)
        where.paymentMethod = paymentMethod;
    if (bookingId)
        where.bookingId = bookingId;
    const [payments, total] = yield Promise.all([
        server_1.prisma.payment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
            include: {
                booking: {
                    select: {
                        id: true,
                        bookingNumber: true,
                        property: {
                            select: {
                                name: true,
                                city: true,
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
                },
            },
        }),
        server_1.prisma.payment.count({ where }),
    ]);
    res.json({
        success: true,
        data: {
            payments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        },
    });
})));
/**
 * @route   GET /api/v1/payments/:id
 * @desc    Get payment details
 * @access  Protected (authorized users only)
 */
router.get('/:id', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const payment = yield server_1.prisma.payment.findUnique({
        where: { id: req.params.id },
        include: {
            booking: {
                include: {
                    property: {
                        select: {
                            name: true,
                            hostId: true,
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
            },
        },
    });
    if (!payment) {
        throw new error_middleware_2.AppError('Payment not found', 404);
    }
    // Check authorization
    const isCustomer = payment.booking.customerId === req.user.id;
    const isHost = payment.booking.property.hostId === req.user.id;
    const isAdmin = req.user.role === client_1.UserRole.ADMIN;
    if (!isCustomer && !isHost && !isAdmin) {
        throw new error_middleware_2.AppError('Not authorized to view this payment', 403);
    }
    res.json({
        success: true,
        data: payment,
    });
})));
/**
 * @route   POST /api/v1/payments/:id/refund
 * @desc    Process refund
 * @access  Admin only
 */
router.post('/:id/refund', (0, authservice_1.requireAuth)(client_1.UserRole.ADMIN), [
    (0, express_validator_1.body)('amount').optional().isFloat({ min: 0 }).withMessage('Valid refund amount required'),
    (0, express_validator_1.body)('reason').isString().withMessage('Refund reason required'),
], validate, (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { amount, reason } = req.body;
    const payment = yield server_1.prisma.payment.findUnique({
        where: { id: req.params.id },
        include: {
            booking: {
                include: {
                    customer: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            },
        },
    });
    if (!payment) {
        throw new error_middleware_2.AppError('Payment not found', 404);
    }
    if (payment.status !== client_1.PaymentStatus.PAID) {
        throw new error_middleware_2.AppError('Can only refund successful payments', 400);
    }
    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) {
        throw new error_middleware_2.AppError('Refund amount cannot exceed payment amount', 400);
    }
    // Create refund record
    const refund = yield server_1.prisma.refund.create({
        data: {
            paymentId: payment.id,
            amount: refundAmount,
            reason,
            processedBy: req.user.id,
            status: 'PROCESSING',
        },
    });
    // Process refund with payment provider
    let refundResult = {};
    try {
        switch (payment.paymentMethod) {
            case client_1.PaymentMethod.PAYSTACK:
                refundResult = yield paystackservice_1.paystackService.refundPayment(payment.providerReference, refundAmount * 100);
                break;
            case client_1.PaymentMethod.FLUTTERWAVE:
                refundResult = yield flutterwaveservice_1.flutterwaveService.refundPayment(payment.providerReference, refundAmount);
                break;
            default:
                // For bank transfers, mark as manual refund
                refundResult = { status: 'success', message: 'Manual refund required' };
        }
        // Update refund status
        yield server_1.prisma.refund.update({
            where: { id: refund.id },
            data: {
                status: 'COMPLETED',
                processedAt: new Date(),
                providerResponse: refundResult,
            },
        });
        // Notify customer
        yield server_1.prisma.notification.create({
            data: {
                userId: payment.booking.customerId,
                type: 'REFUND_PROCESSED',
                title: 'Refund Processed',
                message: `Your refund of ₦${refundAmount} has been processed for booking ${payment.booking.bookingNumber}.`,
                metadata: {
                    refundId: refund.id,
                    amount: refundAmount,
                    reason,
                },
            },
        });
        // Send email notification
        yield emailservice_1.emailService.sendRefundNotification(payment.booking.customer.email, {
            customerName: `${payment.booking.customer.firstName} ${payment.booking.customer.lastName}`,
            refundAmount,
            bookingNumber: payment.booking.bookingNumber,
            reason,
        });
        (0, logger_middleware_1.auditLog)('REFUND_PROCESSED', req.user.id, {
            refundId: refund.id,
            paymentId: payment.id,
            amount: refundAmount,
            reason,
        }, req.ip);
        res.json({
            success: true,
            message: 'Refund processed successfully',
            data: refund,
        });
    }
    catch (error) {
        // Update refund status to failed
        yield server_1.prisma.refund.update({
            where: { id: refund.id },
            data: { status: 'FAILED' },
        });
        throw new error_middleware_2.AppError('Failed to process refund', 500);
    }
})));
exports.default = router;
