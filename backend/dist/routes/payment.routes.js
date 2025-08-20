"use strict";
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
            message: "Validation failed",
            errors: errors.array(),
        });
    }
    next();
};
// ===============================
// PAYMENT INITIATION
// ===============================
/**
 * @route   POST /api/v1/payment/initialize
 * @desc    Initialize payment for a booking
 * @access  Protected (booking owner)
 */
/**
 * @swagger
 * /payment/initialize:
 *   post:
 *     summary: Initialize a payment for an approved booking
 *     description: Creates a payment record and initializes the payment with the selected provider (Paystack, Flutterwave, or Bank Transfer).
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - paymentMethod
 *             properties:
 *               bookingId:
 *                 type: string
 *                 example: "bkg_12345"
 *               paymentMethod:
 *                 type: string
 *                 enum: [PAYSTACK, FLUTTERWAVE, BANK_TRANSFER]
 *                 example: "PAYSTACK"
 *               currency:
 *                 type: string
 *                 enum: [NGN, USD, GBP, EUR]
 *                 default: NGN
 *                 example: "NGN"
 *     responses:
 *       201:
 *         description: Payment initialized successfully
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
 *                   example: "Payment initialized successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "pay_67890"
 *                         reference:
 *                           type: string
 *                           example: "MAR_bkg_12345_17111223344"
 *                         amount:
 *                           type: number
 *                           example: 75000
 *                         currency:
 *                           type: string
 *                           example: "NGN"
 *                         paymentMethod:
 *                           type: string
 *                           example: "PAYSTACK"
 *                         status:
 *                           type: string
 *                           example: "PENDING"
 *                     paymentData:
 *                       type: object
 *                       description: Provider-specific initialization data (redirect URL, reference, bank details, etc.)
 *                       example:
 *                         authorization_url: "https://checkout.paystack.com/abc123"
 *                         access_code: "abc123"
 *                         reference: "MAR_bkg_12345_17111223344"
 *       400:
 *         description: Invalid request (e.g. booking not approved, already paid, invalid method)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User not authorized to pay for this booking
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to initialize payment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/initialize", (0, authservice_1.requireAuth)(), [
    (0, express_validator_1.body)("bookingId").isString().withMessage("Booking ID required"),
    (0, express_validator_1.body)("paymentMethod")
        .isIn(Object.values(client_1.PaymentMethod))
        .withMessage("Valid payment method required"),
    (0, express_validator_1.body)("currency")
        .optional()
        .isIn(["NGN", "USD", "GBP", "EUR"])
        .withMessage("Valid currency required"),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { bookingId, paymentMethod, currency = "NGN" } = req.body;
    // Get booking details
    const booking = await server_1.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            property: {
                select: {
                    name: true,
                    hostId: true,
                    type: true,
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
    // Safety check for booking and property existence
    if (!booking || !booking.property) {
        return res.status(404).json({
            success: false,
            message: "Booking or property not found",
        });
    }
    // Check if user owns the booking
    if (booking.customerId !== req.user.id) {
        throw new error_middleware_2.AppError("Not authorized to pay for this booking", 403);
    }
    // Check if booking is approved
    if (booking.status !== client_1.BookingStatus.APPROVED) {
        throw new error_middleware_2.AppError("Booking must be approved before payment", 400);
    }
    // Check if already paid
    if (booking.paymentStatus === client_1.PaymentStatus.PAID) {
        throw new error_middleware_2.AppError("Booking is already paid", 400);
    }
    // Generate payment reference
    const paymentReference = `MAR_${bookingId}_${Date.now()}`;
    // Check for existing payment for this booking
    let payment = await server_1.prisma.payment.findUnique({
        where: { bookingId },
    });
    if (payment) {
        if (payment.status === client_1.PaymentStatus.PAID) {
            throw new error_middleware_2.AppError("Booking is already paid", 400);
        }
        // Update existing payment record for retry
        payment = await server_1.prisma.payment.update({
            where: { id: payment.id },
            data: {
                reference: paymentReference,
                method: paymentMethod,
                status: client_1.PaymentStatus.PENDING,
                amount: booking.total,
                currency,
                gatewayResponse: {
                    customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
                    customerEmail: booking.customer.email,
                    propertyName: booking.property.name,
                    bookingCode: booking.bookingCode,
                },
            },
        });
    }
    else {
        // Create new payment record
        payment = await server_1.prisma.payment.create({
            data: {
                bookingId,
                userId: booking.customerId,
                amount: booking.total,
                currency,
                method: paymentMethod,
                reference: paymentReference,
                status: client_1.PaymentStatus.PENDING,
                gatewayResponse: {
                    customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
                    customerEmail: booking.customer.email,
                    propertyName: booking.property.name,
                    bookingCode: booking.bookingCode,
                },
            },
        });
    }
    let paymentData = {};
    try {
        // Initialize payment with selected provider
        switch (paymentMethod) {
            case client_1.PaymentMethod.PAYSTACK:
                paymentData = await paystackservice_1.paystackService.initializePayment({
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
                paymentData = await flutterwaveservice_1.flutterwaveService.initializePayment({
                    email: booking.customer.email, // <-- Add this line
                    tx_ref: paymentReference,
                    amount: booking.total,
                    currency,
                    redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
                    customer: {
                        email: booking.customer.email,
                        name: `${booking.customer.firstName} ${booking.customer.lastName}`,
                    },
                    customizations: {
                        title: "MAR Abu Projects Services",
                        description: `Payment for booking ${booking.bookingCode}`,
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
                        bank_name: "First Bank of Nigeria",
                        account_number: "1234567890",
                        account_name: "MAR ABU PROJECTS SERVICES LLC",
                        routing_number: "011151312",
                    },
                    instructions: [
                        "Transfer the exact amount to the account details above",
                        "Use the payment reference as your transfer description",
                        "Upload your payment receipt after transfer",
                        "Payment will be verified within 24 hours",
                    ],
                };
                break;
            default:
                throw new error_middleware_2.AppError("Payment method not supported", 400);
        }
        // Update payment with provider response
        await server_1.prisma.payment.update({
            where: { id: payment.id },
            data: {
                reference: paymentData.reference || paymentReference,
                gatewayResponse: paymentData,
            },
        });
        (0, logger_middleware_1.auditLog)("PAYMENT_INITIALIZED", req.user.id, {
            paymentId: payment.id,
            bookingId,
            amount: booking.total,
            paymentMethod,
            reference: paymentReference,
        }, req.ip);
        res.status(201).json({
            success: true,
            message: "Payment initialized successfully",
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
        // Log error for debugging
        if (error instanceof Error) {
            console.error(error.stack || error.message);
        }
        else {
            console.error(error);
        }
        // Update payment status to failed
        await server_1.prisma.payment.update({
            where: { id: payment.id },
            data: { status: client_1.PaymentStatus.FAILED },
        });
        throw new error_middleware_2.AppError("Failed to initialize payment", 500);
    }
}));
/**
 * @route   GET /payment/callback
 * @desc    Handle Paystack payment callback
 * @access  Public
 */
/**
 * @swagger
 * /payment/callback:
 *   get:
 *     summary: Verify Paystack payment
 *     description: Endpoint called by Paystack after payment is completed. Verifies the transaction using the provided reference or trxref.
 *     tags:
 *       - Payments
 *     parameters:
 *       - in: query
 *         name: reference
 *         schema:
 *           type: string
 *         required: false
 *         description: The payment reference returned by Paystack.
 *       - in: query
 *         name: trxref
 *         schema:
 *           type: string
 *         required: false
 *         description: Alternative payment reference (also returned by Paystack).
 *     responses:
 *       200:
 *         description: Payment verified successfully
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
 *                   example: Payment verified successfully
 *                 data:
 *                   type: object
 *                   description: Paystack transaction details
 *       400:
 *         description: Missing or invalid payment reference / verification failed
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
 *                   example: Payment verification failed
 *                 data:
 *                   type: object
 *                   nullable: true
 *       500:
 *         description: Server error during payment verification
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
 *                   example: Payment verification error
 */
router.get("/callback", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { reference, trxref } = req.query;
    // Use reference or trxref (Paystack sends both)
    const paymentReference = reference || trxref;
    if (!paymentReference) {
        return res
            .status(400)
            .json({ success: false, message: "Missing payment reference" });
    }
    try {
        // Verify payment with Paystack
        const verificationResult = await paystackservice_1.paystackService.verifyPayment(paymentReference);
        const isSuccessful = verificationResult.status === "success" &&
            (verificationResult.data.status === "successful" ||
                verificationResult.data.status === "success");
        if (isSuccessful) {
            // Optionally update payment and booking status in DB here
            return res.status(200).json({
                success: true,
                message: "Payment verified successfully",
                data: verificationResult.data,
            });
        }
        else {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed",
                data: verificationResult.data,
            });
        }
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Payment verification error",
        });
    }
}));
// ===============================
// PAYMENT VERIFICATION
// ===============================
/**
 * @route   POST /api/v1/payment/verify/:reference
 * @desc    Verify payment status
 * @access  Protected
 */
/**
 * @swagger
 * /payment/verify/{reference}:
 *   post:
 *     summary: Verify a payment by reference
 *     description: Verifies the status of a payment with Paystack, Flutterwave, or manually for bank transfers. Updates booking and payment records if successful.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment reference to verify
 *     responses:
 *       200:
 *         description: Payment verified successfully
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
 *                   example: "Payment verified successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "pay_12345"
 *                         reference:
 *                           type: string
 *                           example: "MAR_abc123_1699999999999"
 *                         amount:
 *                           type: number
 *                           example: 50000
 *                         status:
 *                           type: string
 *                           enum: [PENDING, PAID, FAILED]
 *                           example: "PAID"
 *                         paidAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-08-16T12:34:56.000Z"
 *                     booking:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "book_98765"
 *                         bookingCode:
 *                           type: string
 *                           example: "BK123456"
 *                         paymentStatus:
 *                           type: string
 *                           enum: [PENDING, PAID, FAILED]
 *                           example: "PAID"
 *       400:
 *         description: Payment verification failed
 *       401:
 *         description: Unauthorized (not logged in)
 *       403:
 *         description: Forbidden (user not authorized to verify this payment)
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
router.post("/verify/:reference", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { reference } = req.params;
    const payment = await server_1.prisma.payment.findUnique({
        where: { reference: reference },
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
        throw new error_middleware_2.AppError("Payment not found", 404);
    }
    // Check if user is authorized
    if (payment.booking.customerId !== req.user.id &&
        req.user.role !== client_1.UserRole.ADMIN) {
        throw new error_middleware_2.AppError("Not authorized to verify this payment", 403);
    }
    let verificationResult = {};
    try {
        // Verify payment with provider
        switch (payment.method) {
            case client_1.PaymentMethod.PAYSTACK:
                verificationResult = await paystackservice_1.paystackService.verifyPayment(reference);
                break;
            case client_1.PaymentMethod.FLUTTERWAVE:
                verificationResult =
                    await flutterwaveservice_1.flutterwaveService.verifyPayment(reference);
                break;
            case client_1.PaymentMethod.BANK_TRANSFER:
                // Bank transfer verification is done manually by admin
                if (req.user.role !== client_1.UserRole.ADMIN) {
                    throw new error_middleware_2.AppError("Bank transfer verification requires admin approval", 403);
                }
                verificationResult = {
                    status: "success",
                    data: { status: "successful" },
                };
                break;
            default:
                throw new error_middleware_2.AppError("Payment method not supported for verification", 400);
        }
        const isSuccessful = verificationResult.status === "success" &&
            (verificationResult.data.status === "successful" ||
                verificationResult.data.status === "success");
        if (isSuccessful) {
            // Update payment status
            await server_1.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: client_1.PaymentStatus.PAID,
                    paidAt: new Date(),
                    gatewayResponse: verificationResult,
                },
            });
            // Update booking payment status
            await server_1.prisma.booking.update({
                where: { id: payment.bookingId },
                data: {
                    paymentStatus: client_1.PaymentStatus.PAID,
                    paidAmount: payment.amount,
                    paidAt: new Date(),
                },
            });
            // Create notifications
            await Promise.all([
                // Notify customer
                server_1.prisma.notification.create({
                    data: {
                        userId: payment.booking.customerId,
                        type: client_1.NotificationType.PAYMENT_RECEIVED,
                        title: "Payment Confirmed",
                        message: `Your payment for booking ${payment.booking.bookingCode} has been confirmed.`,
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
                        type: "PAYMENT_RECEIVED",
                        title: "Payment Received",
                        message: `Payment received for booking ${payment.booking.bookingCode} at ${payment.booking.property.name}.`,
                        metadata: {
                            bookingId: payment.bookingId,
                            paymentId: payment.id,
                            amount: payment.amount,
                        },
                    },
                }),
            ]);
            // Send email confirmations
            await Promise.all([
                emailservice_1.emailService.sendPaymentConfirmation(payment.booking.customer.email, {
                    customerName: `${payment.booking.customer.firstName} ${payment.booking.customer.lastName}`,
                    bookingCode: payment.booking.bookingCode,
                    propertyName: payment.booking.property.name,
                    amount: payment.amount,
                    paymentReference: reference,
                }),
                emailservice_1.emailService.sendPaymentNotificationToHost(payment.booking.property.host.email, {
                    hostName: `${payment.booking.property.host.firstName} ${payment.booking.property.host.lastName}`,
                    customerName: `${payment.booking.customer.firstName} ${payment.booking.customer.lastName}`,
                    bookingCode: payment.booking.bookingCode,
                    propertyName: payment.booking.property.name,
                    amount: payment.amount,
                }),
            ]);
            (0, logger_middleware_1.auditLog)("PAYMENT_VERIFIED", req.user.id, {
                paymentId: payment.id,
                bookingId: payment.bookingId,
                amount: payment.amount,
                reference,
                status: "successful",
            }, req.ip);
            res.json({
                success: true,
                message: "Payment verified successfully",
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
                        bookingCode: payment.booking.bookingCode,
                        paymentStatus: client_1.PaymentStatus.PAID,
                    },
                },
            });
        }
        else {
            // Payment failed
            await server_1.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: client_1.PaymentStatus.FAILED,
                    gatewayResponse: verificationResult,
                },
            });
            (0, logger_middleware_1.auditLog)("PAYMENT_FAILED", req.user.id, {
                paymentId: payment.id,
                bookingId: payment.bookingId,
                reference,
                reason: verificationResult.data?.gateway_response || "Payment failed",
            }, req.ip);
            throw new error_middleware_2.AppError("Payment verification failed", 400);
        }
    }
    catch (error) {
        if (error instanceof error_middleware_2.AppError) {
            throw error;
        }
        await server_1.prisma.payment.update({
            where: { id: payment.id },
            data: { status: client_1.PaymentStatus.FAILED },
        });
        throw new error_middleware_2.AppError("Payment verification failed", 500);
    }
}));
// ===============================
// PAYMENT WEBHOOK HANDLERS
// ===============================
/**
 * @route   POST /api/v1/payment/webhook/paystack
 * @desc    Handle Paystack webhook
 * @access  Public (webhook)
 */
/**
 * @swagger
 * /webhook/paystack:
 *   post:
 *     summary: Paystack webhook endpoint
 *     description: |
 *       This endpoint is called by Paystack to notify your system about payment events.
 *       **Note:** This is an internal webhook endpoint and should not be called directly by clients.
 *     tags:
 *       - Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 example: charge.success
 *               data:
 *                 type: object
 *                 description: Paystack payment data payload
 *                 example:
 *                   reference: "7PVGX8MEk85tgeEpVDtD"
 *                   amount: 500000
 *                   status: "success"
 *     parameters:
 *       - in: header
 *         name: x-paystack-signature
 *         required: true
 *         schema:
 *           type: string
 *         description: Paystack webhook signature for verifying authenticity
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 */
router.post("/webhook/paystack", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const signature = req.headers["x-paystack-signature"];
    const body = JSON.stringify(req.body);
    // Verify webhook signature
    const isValid = paystackservice_1.paystackService.verifyWebhookSignature(body, signature);
    if (!isValid) {
        throw new error_middleware_2.AppError("Invalid webhook signature", 400);
    }
    const { event, data } = req.body;
    if (event === "charge.success") {
        const reference = data.reference;
        const payment = await server_1.prisma.payment.findUnique({
            where: { reference: reference },
            include: { booking: true },
        });
        if (payment && payment.status === client_1.PaymentStatus.PENDING) {
            // Update payment status
            await server_1.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: client_1.PaymentStatus.PAID,
                    paidAt: new Date(),
                    gatewayResponse: data,
                },
            });
            // Update booking
            await server_1.prisma.booking.update({
                where: { id: payment.bookingId },
                data: {
                    paymentStatus: client_1.PaymentStatus.PAID,
                    paidAmount: payment.amount,
                    paidAt: new Date(),
                },
            });
            (0, logger_middleware_1.auditLog)("WEBHOOK_PAYMENT_SUCCESS", "system", {
                paymentId: payment.id,
                bookingId: payment.bookingId,
                reference,
                provider: "paystack",
            }, req.ip);
        }
    }
    res.status(200).json({ success: true });
}));
/**
 * @route   POST /api/v1/payment/webhook/flutterwave
 * @desc    Handle Flutterwave webhook
 * @access  Public (webhook)
 */
/**
 * @swagger
 * /webhook/flutterwave:
 *   post:
 *     summary: Flutterwave Webhook
 *     description: |
 *       Endpoint to receive and process **Flutterwave webhook events**.
 *       Currently listens for `charge.completed` events where the status is `successful`.
 *       On success, updates the related payment and booking records.
 *
 *       ⚠️ This endpoint is intended **for Flutterwave servers only**.
 *       Do not call it manually from your client.
 *     tags:
 *       - Webhooks
 *     requestBody:
 *       required: true
 *       description: Webhook payload sent from Flutterwave.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 example: charge.completed
 *               data:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     example: successful
 *                   tx_ref:
 *                     type: string
 *                     example: FLW-MOCK-123456
 *                   amount:
 *                     type: number
 *                     example: 5000
 *                   currency:
 *                     type: string
 *                     example: NGN
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid webhook signature
 *       500:
 *         description: Server error while processing webhook
 */
router.post("/webhook/flutterwave", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const signature = req.headers["verif-hash"];
    // Verify webhook signature (prefer using raw body if required)
    const isValid = flutterwaveservice_1.flutterwaveService.verifyWebhookSignature(req.body, signature);
    if (!isValid) {
        return res
            .status(400)
            .json({ success: false, message: "Invalid webhook signature" });
    }
    try {
        const { event, data } = req.body;
        if (event === "charge.completed" && data.status === "successful") {
            const reference = data.tx_ref;
            const payment = await server_1.prisma.payment.findUnique({
                where: { reference },
                include: { booking: true },
            });
            if (payment && payment.status === client_1.PaymentStatus.PENDING) {
                await server_1.prisma.$transaction([
                    server_1.prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: client_1.PaymentStatus.PAID,
                            paidAt: new Date(),
                            gatewayResponse: data,
                        },
                    }),
                    server_1.prisma.booking.update({
                        where: { id: payment.bookingId },
                        data: {
                            paymentStatus: client_1.PaymentStatus.PAID,
                            paidAmount: payment.amount,
                            paidAt: new Date(),
                        },
                    }),
                ]);
                (0, logger_middleware_1.auditLog)("WEBHOOK_PAYMENT_SUCCESS", "system", {
                    paymentId: payment.id,
                    bookingId: payment.bookingId,
                    reference,
                    provider: "flutterwave",
                    amount: payment.amount,
                    currency: data.currency,
                }, req.ip);
            }
        }
        return res.status(200).json({ success: true });
    }
    catch (error) {
        // Log but still acknowledge receipt to avoid retries
        console.error("Flutterwave webhook error:", error);
        return res.status(200).json({ success: true });
    }
}));
// ===============================
// PAYMENT MANAGEMENT
// ===============================
/**
 * @route   GET /api/v1/payments
 * @desc    Get payment history
 * @access  Protected
 */
/**
 * @swagger
 * /payment:
 *   get:
 *     summary: Get list of payments
 *     description: Retrieve paginated payments. Customers only see their own payments, admins see payments for properties they host.
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of records per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *         description: Filter by payment status
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [CREDIT_CARD, PAYPAL, BANK_TRANSFER, CASH]
 *         description: Filter by payment method
 *       - in: query
 *         name: bookingId
 *         schema:
 *           type: string
 *         description: Filter by booking ID
 *     responses:
 *       200:
 *         description: List of payments with pagination
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
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           status:
 *                             type: string
 *                           paymentMethod:
 *                             type: string
 *                           booking:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               bookingCode:
 *                                 type: string
 *                               property:
 *                                 type: object
 *                                 properties:
 *                                   name:
 *                                     type: string
 *                                   city:
 *                                     type: string
 *                               customer:
 *                                 type: object
 *                                 properties:
 *                                   firstName:
 *                                     type: string
 *                                   lastName:
 *                                     type: string
 *                                   email:
 *                                     type: string
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
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - insufficient role permissions
 *       500:
 *         description: Server error
 */
router.get("/", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
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
    const [payments, total] = await Promise.all([
        server_1.prisma.payment.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
            include: {
                booking: {
                    select: {
                        id: true,
                        bookingCode: true,
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
}));
/**
 * @route   GET /api/v1/payment/:id
 * @desc    Get payment details
 * @access  Protected (authorized users only)
 */
/**
 * @swagger
 * /payment/{id}:
 *   get:
 *     summary: Get payment details by ID
 *     description: Retrieve detailed information about a specific payment, including related booking, property, and customer details.
 *                  Access is restricted to the payment’s customer, the host of the property, or an admin.
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique identifier of the payment
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved payment details
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
 *                       example: "pay_123456"
 *                     amount:
 *                       type: number
 *                       example: 50000
 *                     status:
 *                       type: string
 *                       enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *                       example: COMPLETED
 *                     paymentMethod:
 *                       type: string
 *                       enum: [CARD, BANK_TRANSFER, PAYPAL]
 *                       example: CARD
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-16T14:32:21.000Z"
 *                     booking:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "booking_abc123"
 *                         bookingCode:
 *                           type: string
 *                           example: "BK-2025-001"
 *                         property:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               example: "Ocean View Apartment"
 *                             hostId:
 *                               type: string
 *                               example: "user_host_789"
 *                         customer:
 *                           type: object
 *                           properties:
 *                             firstName:
 *                               type: string
 *                               example: "John"
 *                             lastName:
 *                               type: string
 *                               example: "Doe"
 *                             email:
 *                               type: string
 *                               example: "john.doe@example.com"
 *       403:
 *         description: Not authorized to view this payment
 *       404:
 *         description: Payment not found
 */
router.get("/:id", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const payment = await server_1.prisma.payment.findUnique({
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
        throw new error_middleware_2.AppError("Payment not found", 404);
    }
    // Check authorization
    const isCustomer = payment.booking.customerId === req.user.id;
    const isHost = payment.booking.property.hostId === req.user.id;
    const isAdmin = req.user.role === client_1.UserRole.ADMIN;
    if (!isCustomer && !isHost && !isAdmin) {
        throw new error_middleware_2.AppError("Not authorized to view this payment", 403);
    }
    res.json({
        success: true,
        data: payment,
    });
}));
/**
 * @route   POST /api/v1/payment/:id/refund
 * @desc    Process refund
 * @access  Admin only
 */
/**
 * @swagger
 * /payment/{id}/refund:
 *   post:
 *     summary: Refund a payment
 *     description: Initiates a refund for a specific payment. Only admins can process refunds. Refunds can be partial (if an `amount` is provided) or full (default).
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique identifier of the payment to refund
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to refund. Defaults to full payment amount if not provided.
 *                 example: 25000
 *               reason:
 *                 type: string
 *                 description: Reason for refund
 *                 example: "Guest canceled booking"
 *     responses:
 *       200:
 *         description: Refund processed successfully
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
 *                   example: Refund processed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "refund_abc123"
 *                     paymentId:
 *                       type: string
 *                       example: "pay_123456"
 *                     amount:
 *                       type: number
 *                       example: 25000
 *                     reason:
 *                       type: string
 *                       example: "Guest canceled booking"
 *                     status:
 *                       type: string
 *                       enum: [PROCESSING, COMPLETED, FAILED]
 *                       example: COMPLETED
 *                     processedBy:
 *                       type: string
 *                       example: "admin_user_001"
 *                     processedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-16T15:45:12.000Z"
 *       400:
 *         description: Invalid refund request (e.g. refund amount exceeds payment amount, or payment not paid)
 *       403:
 *         description: Not authorized (only admins can refund)
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Failed to process refund with payment provider
 */
router.post("/:id/refund", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.body)("amount")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Valid refund amount required"),
    (0, express_validator_1.body)("reason").isString().withMessage("Refund reason required"),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { amount, reason } = req.body;
    const payment = await server_1.prisma.payment.findUnique({
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
        throw new error_middleware_2.AppError("Payment not found", 404);
    }
    if (payment.status !== client_1.PaymentStatus.PAID) {
        throw new error_middleware_2.AppError("Can only refund successful payments", 400);
    }
    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) {
        throw new error_middleware_2.AppError("Refund amount cannot exceed payment amount", 400);
    }
    // // Create refund record
    // const refund = await prisma.refund.create({
    //   data: {
    //     paymentId: payment.id,
    //     amount: refundAmount,
    //     reason,
    //     processedBy: req.user.id,
    //     status: "PROCESSING",
    //   },
    // });
    // // Process refund with payment provider
    // let refundResult: any = {};
    // try {
    //   switch (payment.paymentMethod) {
    //     case PaymentMethod.PAYSTACK:
    //       refundResult = await paystackService.refundPayment(
    //         payment.providerReference!,
    //         refundAmount * 100
    //       );
    //       break;
    //     case PaymentMethod.FLUTTERWAVE:
    //       refundResult = await flutterwaveService.refundPayment(
    //         payment.providerReference!,
    //         refundAmount
    //       );
    //       break;
    //     default:
    //       // For bank transfers, mark as manual refund
    //       refundResult = {
    //         status: "success",
    //         message: "Manual refund required",
    //       };
    //   }
    //   // Update refund status
    //   await prisma.refund.update({
    //     where: { id: refund.id },
    //     data: {
    //       status: "COMPLETED",
    //       processedAt: new Date(),
    //       providerResponse: refundResult,
    //     },
    //   });
    //   // Notify customer
    //   await prisma.notification.create({
    //     data: {
    //       userId: payment.booking.customerId,
    //       type: NotificationType.REFUND_PROCESSED,
    //       title: "Refund Processed",
    //       message: `Your refund of ₦${refundAmount} has been processed for booking ${payment.booking.bookingCode}.`,
    //       metadata: {
    //         refundId: refund.id,
    //         amount: refundAmount,
    //         reason,
    //       },
    //     },
    //   });
    //   // Send email notification
    //   await emailService.sendRefundNotification(
    //     payment.booking.customer.email,
    //     {
    //       customerName: `${payment.booking.customer.firstName} ${payment.booking.customer.lastName}`,
    //       refundAmount,
    //       bookingCode: payment.booking.bookingCode,
    //       reason,
    //     }
    //   );
    //   auditLog(
    //     "REFUND_PROCESSED",
    //     req.user.id,
    //     {
    //       refundId: refund.id,
    //       paymentId: payment.id,
    //       amount: refundAmount,
    //       reason,
    //     },
    //     req.ip
    //   );
    //   res.json({
    //     success: true,
    //     message: "Refund processed successfully",
    //     data: refund,
    //   });
    // } catch (error) {
    //   // Update refund status to failed
    //   await prisma.refund.update({
    //     where: { id: refund.id },
    //     data: { status: "FAILED" },
    //   });
    //   throw new AppError("Failed to process refund", 500);
    // }
}));
exports.default = router;
