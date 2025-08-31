// MAR ABU PROJECTS SERVICES LLC - Payment Processing Routes
import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import {
  PaymentStatus,
  PaymentMethod,
  BookingStatus,
  UserRole,
  NotificationType,
  RefundStatus,
} from "@prisma/client";
import { requireAuth } from "../services/authservice";
import { asyncHandler } from "../middlewares/error.middleware";
import { AppError } from "../middlewares/error.middleware";
import { prisma } from "../server";
import { auditLog } from "../middlewares/logger.middleware";
import { emailService } from "../services/emailservice";
import { paystackService } from "../services/paystackservice";
import { flutterwaveService } from "../services/flutterwaveservice";
import { isRefundAllowed } from "../utils/helpers";
import { z } from "zod";

const router = Router();

// Zod schema for refund approval/rejection
const refundApproveSchema = z.object({
  idempotencyKey: z.string().min(8).max(64).optional(),
});
const refundRejectSchema = z.object({
  reason: z.string().min(2).max(255),
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
router.post(
  "/initialize",
  requireAuth(),
  [
    body("bookingId").isString().withMessage("Booking ID required"),
    body("paymentMethod")
      .isIn(Object.values(PaymentMethod))
      .withMessage("Valid payment method required"),
    body("currency")
      .optional()
      .isIn(["NGN", "USD", "GBP", "EUR"])
      .withMessage("Valid currency required"),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { bookingId, paymentMethod, currency = "NGN" } = req.body;

    // Fetch booking with relations
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: { select: { name: true, hostId: true, type: true } },
        customer: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
      },
    });

    if (!booking || !booking.property) {
      return res
        .status(404)
        .json({ success: false, message: "Booking or property not found" });
    }

    if (booking.customerId !== req.user.id) {
      throw new AppError("Not authorized to pay for this booking", 403);
    }

    if (booking.status !== BookingStatus.APPROVED) {
      throw new AppError("Booking must be approved before payment", 400);
    }

    if (booking.paymentStatus === PaymentStatus.PAID) {
      throw new AppError("Booking is already paid", 400);
    }

    // Generate fresh payment reference
    const paymentReference = `MAR_${bookingId}_${Date.now()}`;

    // Common gateway metadata
    const gatewayMeta = {
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      customerEmail: booking.customer.email,
      propertyName: booking.property.name,
      bookingCode: booking.bookingCode,
    };

    // Either fetch existing payment or create new
    let payment = await prisma.payment.findUnique({ where: { bookingId } });

    if (payment) {
      if (payment.status === PaymentStatus.PAID) {
        throw new AppError("Booking is already paid", 400);
      }
      // Update record for retry
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          reference: paymentReference,
          method: paymentMethod,
          status: PaymentStatus.PENDING,
          amount: booking.total,
          currency,
          gatewayResponse: gatewayMeta,
        },
      });
    } else {
      // Fresh payment record
      payment = await prisma.payment.create({
        data: {
          bookingId,
          userId: booking.customerId,
          amount: booking.total,
          currency,
          method: paymentMethod,
          reference: paymentReference,
          status: PaymentStatus.PENDING,
          gatewayResponse: gatewayMeta,
        },
      });
    }

    let paymentData: any = {};
    try {
      switch (paymentMethod) {
        case PaymentMethod.PAYSTACK:
          paymentData = await paystackService.initializePayment({
            reference: paymentReference,
            amount: booking.total, // Naira → service converts to kobo
            email: booking.customer.email,
            currency,
            callback_url: `${process.env.FRONTEND_URL}/api/v1/payment/callback`,
            metadata: { bookingId, paymentId: payment.id, ...gatewayMeta },
          });
          break;

        case PaymentMethod.FLUTTERWAVE:
          paymentData = await flutterwaveService.initializePayment({
            // email: booking.customer.email,
            tx_ref: paymentReference,
            amount: booking.total,
            currency,
            redirect_url: `${process.env.FRONTEND_URL}/api/v1/payment/callback?reference=${paymentReference}`,
            customer: {
              email: booking.customer.email,
              name: gatewayMeta.customerName,
              // phone: booking.customer.phone, // Ensure phone is available in booking.customer
            },
            customizations: {
              title: "MAR Abu Projects Services",
              description: `Payment for booking ${booking.bookingCode}`,
              logo: `${process.env.FRONTEND_URL}/logo.png`,
            },
            meta: { bookingId, paymentId: payment.id },
          });
          break;

        case PaymentMethod.BANK_TRANSFER:
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
          throw new AppError("Payment method not supported", 400);
      }

      // Update payment with provider response (store both references if available)
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          reference: paymentReference,
          transactionId: paymentData.reference || null,
          gatewayResponse: paymentData,
          status: PaymentStatus.PENDING,
        },
      });

      auditLog(
        "PAYMENT_INITIALIZED",
        req.user.id,
        {
          paymentId: payment.id,
          bookingId,
          amount: booking.total,
          paymentMethod,
          reference: paymentReference,
        },
        req.ip
      );

      return res.status(201).json({
        success: true,
        message: "Payment initialized successfully",
        data: {
          payment: {
            id: payment.id,
            reference: paymentReference,
            providerReference: paymentData.reference || paymentReference,
            amount: booking.total,
            currency,
            paymentMethod,
            status: payment.status,
          },
          paymentData,
        },
      });
    } catch (error) {
      console.error("Payment initialization failed:", error);

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          gatewayResponse: { error: (error as Error).message },
        },
      });

      throw new AppError("Failed to initialize payment", 500);
    }
  })
);

/**
 * @route   GET /payment/callback
 * @desc    Handle Paystack payment callback
 * @access  Public
 */
/**
 * @swagger
 * /payment/callback:
 *   get:
 *     summary: Verify payment callback (Paystack or Flutterwave)
 *     description: |
 *       Called by Paystack or Flutterwave after checkout.
 *       Verifies the payment using the provider API and updates booking/payment status.
 *     tags:
 *       - Payments
 *     parameters:
 *       - in: query
 *         name: reference
 *         schema: { type: string }
 *         description: Paystack reference
 *       - in: query
 *         name: tx_ref
 *         schema: { type: string }
 *         description: Flutterwave reference
 *       - in: query
 *         name: transaction_id
 *         schema: { type: string }
 *         description: Flutterwave transaction ID (numeric)
 *     responses:
 *       200:
 *         description: Payment verified successfully
 */
router.get(
  "/callback",
  asyncHandler(async (req: any, res: any) => {
    const paymentReference = req.query.reference || req.query.tx_ref; // Paystack: reference, Flutterwave: tx_ref
    const transactionId = req.query.transaction_id; // Flutterwave numeric id

    if (!paymentReference && !transactionId) {
      throw new AppError("Missing payment reference or transaction_id", 400);
    }

    // Lookup existing payment in DB
    const existingPayment = await prisma.payment.findUnique({
      where: { reference: paymentReference },
      include: { booking: true },
    });

    if (!existingPayment) {
      throw new AppError("Payment not found", 404);
    }

    // Already paid?
    if (existingPayment.status === PaymentStatus.PAID) {
      return res.json({
        success: true,
        message: "Payment already processed",
      });
    }

    let verificationResult: any;

    switch (existingPayment.method) {
      case PaymentMethod.PAYSTACK:
        verificationResult =
          await paystackService.verifyPayment(paymentReference);
        break;

      case PaymentMethod.FLUTTERWAVE: {
        // ✅ Always use numeric transaction_id for Flutterwave
        const flwId = transactionId || existingPayment.transactionId;
        if (!flwId)
          throw new AppError("Missing Flutterwave transaction id", 400);

        verificationResult = await flutterwaveService.verifyPayment(flwId);

        // Store the transaction_id in DB if not already stored
        if (!existingPayment.transactionId && verificationResult?.data?.id) {
          await prisma.payment.update({
            where: { id: existingPayment.id },
            data: { transactionId: verificationResult.data.id.toString() },
          });
        }
        break;
      }

      default:
        throw new AppError("Unsupported payment method", 400);
    }

    // Check if successful
    const isSuccessful =
      verificationResult?.data?.status === "success" ||
      verificationResult?.data?.status === "successful";

    if (isSuccessful) {
      // Update Payment record
      const updatedPayment = await prisma.payment.update({
        where: { reference: paymentReference },
        data: {
          status: PaymentStatus.PAID,
          gatewayResponse: verificationResult.data ?? verificationResult,
          transactionId:
            verificationResult.data?.id?.toString() ??
            existingPayment.transactionId,
          paidAt: new Date(
            verificationResult.data?.paid_at ??
              verificationResult.data?.created_at ??
              new Date()
          ),
        },
      });

      // Update Booking record
      if (existingPayment.bookingId) {
        await prisma.booking.update({
          where: { id: existingPayment.bookingId },
          data: {
            status: BookingStatus.CONFIRMED,
            paymentStatus: PaymentStatus.PAID,
          },
        });
      }

      auditLog(
        "PAYMENT_SUCCESS",
        existingPayment.userId,
        {
          paymentId: existingPayment.id,
          bookingId: existingPayment.bookingId,
          provider: existingPayment.method,
        },
        req.ip
      );

      return res.json({
        success: true,
        message: "Payment successful",
        reference: paymentReference,
      });
    }

    // Otherwise mark as failed
    await prisma.payment.update({
      where: { reference: paymentReference },
      data: {
        status: PaymentStatus.FAILED,
        gatewayResponse: verificationResult.data ?? verificationResult,
        failedAt: new Date(),
      },
    });

    if (existingPayment.bookingId) {
      await prisma.booking.update({
        where: { id: existingPayment.bookingId },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
    }

    return res.redirect(
      `${process.env.FRONTEND_URL}/payment-failed?reference=${paymentReference}`
    );
  })
);

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
router.post(
  "/verify/:reference",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const { reference } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: {
        booking: {
          include: {
            property: {
              select: {
                id: true,
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
                id: true,
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
      throw new AppError("Payment not found", 404);
    }

    // Authorization check
    if (
      payment.booking.customerId !== req.user.id &&
      req.user.role !== UserRole.ADMIN
    ) {
      throw new AppError("Not authorized to verify this payment", 403);
    }

    let verificationResult: any = {};

    try {
      // Verify with correct provider
      switch (payment.method) {
        case PaymentMethod.PAYSTACK:
          verificationResult = await paystackService.verifyPayment(reference);
          break;

        case PaymentMethod.FLUTTERWAVE:
          verificationResult =
            await flutterwaveService.verifyPayment(reference);
          break;

        case PaymentMethod.BANK_TRANSFER:
          if (req.user.role !== UserRole.ADMIN) {
            throw new AppError(
              "Bank transfer verification requires admin approval",
              403
            );
          }
          verificationResult = {
            status: "success",
            data: { status: "successful" },
          };
          break;

        default:
          throw new AppError(
            "Payment method not supported for verification",
            400
          );
      }

      const isSuccessful =
        (verificationResult.status === true ||
          verificationResult.status === "success") &&
        (verificationResult.data?.status?.toLowerCase() === "success" ||
          verificationResult.data?.status?.toLowerCase() === "successful");

      if (isSuccessful) {
        // Update payment record
        const updatedPayment = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            gatewayResponse: verificationResult,
          },
        });

        // Update booking record
        const updatedBooking = await prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paidAmount: payment.amount,
            paidAt: new Date(),
          },
        });

        // Create notifications
        await Promise.all([
          prisma.notification.create({
            data: {
              userId: payment.booking.customerId,
              type: NotificationType.PAYMENT_RECEIVED,
              title: "Payment Confirmed",
              message: `Your payment for booking ${payment.booking.bookingCode} has been confirmed.`,
              metadata: {
                bookingId: payment.bookingId,
                paymentId: payment.id,
                amount: payment.amount,
              },
            },
          }),
          prisma.notification.create({
            data: {
              userId: payment.booking.property.hostId,
              type: NotificationType.PAYMENT_RECEIVED,
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
          emailService.sendPaymentConfirmation(payment.booking.customer.email, {
            customerName: `${payment.booking.customer.firstName} ${payment.booking.customer.lastName}`,
            bookingCode: payment.booking.bookingCode,
            propertyName: payment.booking.property.name,
            amount: payment.amount,
            paymentReference: reference,
          }),
          emailService.sendPaymentNotificationToHost(
            payment.booking.property.host.email,
            {
              hostName: `${payment.booking.property.host.firstName} ${payment.booking.property.host.lastName}`,
              customerName: `${payment.booking.customer.firstName} ${payment.booking.customer.lastName}`,
              bookingCode: payment.booking.bookingCode,
              propertyName: payment.booking.property.name,
              amount: payment.amount,
            }
          ),
        ]);

        // Log success
        auditLog(
          "PAYMENT_VERIFIED",
          req.user.id,
          {
            paymentId: payment.id,
            bookingId: payment.bookingId,
            reference,
            amount: payment.amount,
            status: "successful",
          },
          req.ip
        );

        return res.json({
          success: true,
          message: "Payment verified successfully",
          data: {
            payment: {
              id: updatedPayment.id,
              reference,
              amount: updatedPayment.amount,
              status: updatedPayment.status,
              paidAt: updatedPayment.paidAt,
            },
            booking: {
              id: updatedBooking.id,
              bookingCode: updatedBooking.bookingCode,
              paymentStatus: updatedBooking.paymentStatus,
            },
          },
        });
      }

      // If failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          gatewayResponse: verificationResult,
        },
      });

      auditLog(
        "PAYMENT_FAILED",
        req.user.id,
        {
          paymentId: payment.id,
          bookingId: payment.bookingId,
          reference,
          reason: verificationResult.data?.gateway_response || "Payment failed",
        },
        req.ip
      );

      throw new AppError("Payment verification failed", 400);
    } catch (error) {
      if (error instanceof AppError) throw error;

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      throw new AppError("Payment verification failed", 500);
    }
  })
);

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
router.post(
  "/webhook/paystack",
  asyncHandler(async (req: any, res: any) => {
    const signature = req.headers["x-paystack-signature"];
    const body = JSON.stringify(req.body);

    // 🔐 Verify webhook signature
    if (!paystackService.verifyWebhookSignature(body, signature)) {
      auditLog(
        "WEBHOOK_INVALID_SIGNATURE",
        "system",
        { provider: "paystack" },
        req.ip
      );
      return res
        .status(400)
        .json({ success: false, message: "Invalid webhook signature" });
    }

    const { event, data } = req.body;

    // ✅ Handle payment success
    if (event === "charge.success" && data?.reference) {
      const payment = await prisma.payment.findUnique({
        where: { reference: data.reference },
        include: { booking: true },
      });

      if (!payment) return res.status(200).json({ success: true }); // no-op

      if (payment.status === PaymentStatus.PAID) {
        return res.json({ success: true, message: "Already processed" });
      }

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            transactionId: data.id?.toString(),
            gatewayResponse: data,
            paidAt: new Date(data.paid_at ?? new Date()),
          },
        }),
        prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            status: BookingStatus.CONFIRMED,
            paymentStatus: PaymentStatus.PAID,
          },
        }),
      ]);

      auditLog(
        "WEBHOOK_PAYMENT_SUCCESS",
        "system",
        { paymentId: payment.id, bookingId: payment.bookingId },
        req.ip
      );

      return res.json({ success: true, message: "Payment successful" });
    }

    // ✅ Handle refund success
    if (event === "refund.success" && data?.reference) {
      const payment = await prisma.payment.findUnique({
        where: { reference: data.reference },
      });
      if (!payment) return res.status(200).json({ success: true });

      const refund = await prisma.refund.findFirst({
        where: { paymentId: payment.id },
      });
      if (!refund) return res.status(200).json({ success: true });

      // Idempotency: skip if already refunded
      if (refund.status === RefundStatus.REFUNDED) {
        return res.json({ success: true, message: "Refund already processed" });
      }

      await prisma.$transaction([
        prisma.refund.update({
          where: { id: refund.id },
          data: {
            status: RefundStatus.REFUNDED,
            processedAt: new Date(),
            providerResponse: data,
          },
        }),
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            refundStatus: RefundStatus.REFUNDED,
            refundAmount: data.amount / 100,
            refundCompletedAt: new Date(),
            refundedAt: new Date(),
            status: PaymentStatus.REFUNDED,
          },
        }),
      ]);

      auditLog(
        "WEBHOOK_REFUND_SUCCESS",
        "system",
        { paymentId: payment.id, refundId: refund.id },
        req.ip
      );

      return res.json({ success: true, message: "Refund processed" });
    }

    // Always return 200 so Paystack doesn’t retry endlessly
    res.status(200).json({ success: true });
  })
);

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
router.post(
  "/webhook/flutterwave",
  asyncHandler(async (req: any, res: any) => {
    const signature = req.headers["verif-hash"];
    const secretHash = process.env.FLW_SECRET_HASH;

    // 🔐 Verify webhook signature
    if (!secretHash || signature !== secretHash) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid signature" });
    }

    const event = req.body;
    if (!event || !event.data) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payload" });
    }

    const flwTransactionId = event.data.id?.toString();
    const txRef = event.data.tx_ref;
    const status = event.data.status; // "successful", "failed", etc.

    if (!flwTransactionId || !txRef) {
      return res
        .status(400)
        .json({ success: false, message: "Missing transaction_id or tx_ref" });
    }

    // Find payment by tx_ref
    const payment = await prisma.payment.findUnique({
      where: { reference: txRef },
      include: { booking: true },
    });

    if (!payment) {
      console.warn("Webhook received for unknown payment:", txRef);
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    // ✅ Handle payment success/failure
    if (event.event === "charge.completed") {
      if (payment.status === PaymentStatus.PAID) {
        return res.json({ success: true, message: "Already processed" });
      }

      if (status === "successful") {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.PAID,
              transactionId: flwTransactionId,
              gatewayResponse: event.data,
              paidAt: new Date(event.data.created_at ?? new Date()),
            },
          }),
          prisma.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: BookingStatus.CONFIRMED,
              paymentStatus: PaymentStatus.PAID,
            },
          }),
        ]);

        auditLog(
          "PAYMENT_SUCCESS",
          payment.userId,
          {
            paymentId: payment.id,
            bookingId: payment.bookingId,
            provider: PaymentMethod.FLUTTERWAVE,
          },
          req.ip
        );

        return res.json({ success: true, message: "Payment successful" });
      } else {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            transactionId: flwTransactionId,
            gatewayResponse: event.data,
            failedAt: new Date(),
          },
        });

        if (payment.bookingId) {
          await prisma.booking.update({
            where: { id: payment.bookingId },
            data: { paymentStatus: PaymentStatus.FAILED },
          });
        }

        return res.json({ success: true, message: "Payment failed" });
      }
    }

    // ✅ Handle refund success
    if (event.event === "refund.completed" && event.data?.tx_ref) {
      const refund = await prisma.refund.findFirst({
        where: { paymentId: payment.id },
      });
      if (!refund) return res.status(200).json({ success: true });

      if (refund.status === RefundStatus.REFUNDED) {
        return res.json({ success: true, message: "Refund already processed" });
      }

      await prisma.$transaction([
        prisma.refund.update({
          where: { id: refund.id },
          data: {
            status: RefundStatus.REFUNDED,
            processedAt: new Date(),
            providerResponse: event.data,
          },
        }),
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            refundStatus: RefundStatus.REFUNDED,
            refundAmount: event.data.amount,
            refundCompletedAt: new Date(),
            refundedAt: new Date(),
            status: PaymentStatus.REFUNDED,
          },
        }),
      ]);

      auditLog(
        "WEBHOOK_REFUND_SUCCESS",
        "system",
        { paymentId: payment.id, refundId: refund.id },
        req.ip
      );

      return res.json({ success: true, message: "Refund processed" });
    }

    res.status(200).json({ success: true });
  })
);

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
 *     description: |
 *       Retrieve paginated payments. Customers only see their own payments.
 *       Admins see all payments. Supports filtering by status, payment method, or booking ID.
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
 *           enum: [PENDING, PROCESSING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED, PARTIALLY_PAID, EXPIRED]
 *         description: Filter by payment status
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [CARD, BANK_TRANSFER, CASH, STRIPE, PAYSTACK, FLUTTERWAVE]
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
 *                             example: "pay_123456"
 *                           amount:
 *                             type: number
 *                             example: 50000
 *                           status:
 *                             type: string
 *                             enum: [PENDING, PROCESSING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED, PARTIALLY_PAID, EXPIRED]
 *                             example: PAID
 *                           paymentMethod:
 *                             type: string
 *                             enum: [CARD, BANK_TRANSFER, CASH, STRIPE, PAYSTACK, FLUTTERWAVE]
 *                             example: PAYSTACK
 *                           booking:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "booking_abc123"
 *                               bookingCode:
 *                                 type: string
 *                                 example: "BK-2025-001"
 *                               property:
 *                                 type: object
 *                                 properties:
 *                                   name:
 *                                     type: string
 *                                     example: "Ocean View Apartment"
 *                                   city:
 *                                     type: string
 *                                     example: "Lagos"
 *                               customer:
 *                                 type: object
 *                                 properties:
 *                                   firstName:
 *                                     type: string
 *                                     example: "John"
 *                                   lastName:
 *                                     type: string
 *                                     example: "Doe"
 *                                   email:
 *                                     type: string
 *                                     example: "john.doe@example.com"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         total:
 *                           type: integer
 *                           example: 100
 *                         pages:
 *                           type: integer
 *                           example: 5
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - insufficient role permissions
 *       500:
 *         description: Server error
 */
router.get(
  "/",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      status,
      paymentMethod,
      bookingId,
    } = req.query;

    // Build where clause
    const where: any = {};

    // Role-based access
    if (req.user.role === UserRole.CUSTOMER) {
      where.booking = { customerId: req.user.id };
    }
    // ADMIN can see all payments, no filter needed
    // else if (req.user.role === UserRole.ADMIN) {
    //   no restrictions
    // }

    // Optional filters
    if (status) where.status = status;
    if (paymentMethod) where.method = paymentMethod;
    if (bookingId) where.bookingId = bookingId;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
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
      prisma.payment.count({ where }),
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
  })
);

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
 *     description: Retrieve detailed information about a specific payment, including related booking, property, and customer details. Access restricted to the payment’s customer, the host of the property, or an admin.
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
 *                       enum: [PENDING, PAID, FAILED, REFUNDED]
 *                       example: PAID
 *                     paymentMethod:
 *                       type: string
 *                       enum: [CARD, BANK_TRANSFER, CASH, PAYSTACK, FLUTTERWAVE, STRIPE]
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
router.get(
  "/:id",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        amount: true,
        status: true,
        method: true,
        createdAt: true,
        booking: {
          select: {
            id: true,
            bookingCode: true,
            property: {
              select: { name: true, hostId: true },
            },
            customer: {
              select: { firstName: true, lastName: true, email: true },
            },
            customerId: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    const { booking } = payment;

    // Authorization: customer, host, or admin
    const isCustomer = booking.customerId === req.user.id;
    const isHost = booking.property.hostId === req.user.id;
    const isAdmin = req.user.role === UserRole.ADMIN;

    if (!isCustomer && !isHost && !isAdmin) {
      throw new AppError("Not authorized to view this payment", 403);
    }

    res.json({
      success: true,
      data: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        paymentMethod: payment.method, // unified naming
        createdAt: payment.createdAt,
        booking: {
          id: booking.id,
          bookingCode: booking.bookingCode,
          property: booking.property,
          customer: booking.customer,
        },
      },
    });
  })
);

/**
 * @route   GET /api/v1/payment/refunds
 * @desc    List all pending refunds (Admin only)
 * @access  Protected (Admin)
 */
/**
 * @swagger
 * /payment/refunds:
 *   get:
 *     summary: List all pending refunds
 *     description: Retrieve a paginated list of refund requests. Only accessible by admin users. Supports filtering by status and paymentId.
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
 *           enum: [PENDING, PROCESSING, REFUNDED, FAILED, NONE]
 *           default: PENDING
 *         description: Filter refunds by status
 *       - in: query
 *         name: paymentId
 *         schema:
 *           type: string
 *         description: Filter refunds by payment ID
 *     responses:
 *       200:
 *         description: List of refunds with pagination
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
 *                     refunds:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "refund_123456"
 *                           status:
 *                             type: string
 *                             example: "REFUND_PENDING"
 *                           amount:
 *                             type: number
 *                             example: 5000
 *                           payment:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "pay_123456"
 *                               booking:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                     example: "booking_abc123"
 *                                   bookingCode:
 *                                     type: string
 *                                     example: "BK-2025-001"
 *                                   property:
 *                                     type: object
 *                                   customer:
 *                                     type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         total:
 *                           type: integer
 *                           example: 100
 *                         pages:
 *                           type: integer
 *                           example: 5
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - insufficient role permissions
 *       500:
 *         description: Server error
 */
router.get(
  "/refunds",
  requireAuth({ role: UserRole.ADMIN }),
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      status = RefundStatus.PENDING,
      paymentId,
    } = req.query;

    // Only pending refunds, eligible
    const where: any = {};
    if (status) where.status = status;
    if (paymentId) where.paymentId = paymentId;

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          payment: {
            include: {
              booking: { include: { property: true, customer: true } },
            },
          },
        },
      }),
      prisma.refund.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        refunds,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  })
);

/**
 * @route   POST /api/v1/payment/:id/refund
 * @desc    Create a refund request (Admin will approve/process)
 * @access  Protected (Admin only)
 */
/**
 * @swagger
 * /payment/{id}/refund:
 *   post:
 *     summary: Request a refund for a payment (no body required)
 *     description: Creates a refund request for a paid payment. Admin must approve and process the refund using the approve endpoint.
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
 *     responses:
 *       200:
 *         description: Refund request created successfully
 *       400:
 *         description: Invalid refund request (e.g. payment not paid or not eligible)
 *       403:
 *         description: Not authorized (only admins can create refund requests)
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
router.post(
  "/:id/refund",
  requireAuth({ role: UserRole.ADMIN }),
  asyncHandler(async (req: any, res: any) => {
    // Fetch payment with related booking and customer
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        booking: {
          include: {
            customer: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (!payment) throw new AppError("Payment not found", 404);
    if (payment.status !== PaymentStatus.PAID)
      throw new AppError("Only paid transactions can be refunded", 400);

    // Prevent duplicate/overlapping refund requests (include PENDING)
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
      throw new AppError(
        "Refund already requested, processing, or completed for this payment",
        400
      );
    }

    if (!isRefundAllowed(payment.booking.checkInDate)) {
      throw new AppError(
        "Refund not allowed within 24 hours of check-in.",
        400
      );
    }

    const refundAmount = payment.amount; // full refund (no request body)

    // Create refund request (ADMIN will approve/process via /:id/refund/approve)
    const refund = await prisma.refund.create({
      data: {
        paymentId: payment.id,
        amount: refundAmount,
        processedBy: req.user.id,
        status: RefundStatus.PENDING, // awaiting admin approval
      },
    });

    // Mark payment as having a pending refund request
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        refundStatus: RefundStatus.PENDING,
        refundRequestedAt: new Date(),
        refundAmount: refundAmount,
      },
    });

    // Notify admin(s) or log — keep lightweight
    auditLog(
      "REFUND_REQUESTED",
      req.user.id,
      { refundId: refund.id, paymentId: payment.id, amount: refundAmount },
      req.ip
    );

    res.json({
      success: true,
      message:
        "Refund request created. An admin must approve and process the refund.",
      data: refund,
    });
  })
);

/**
 * @route   POST /api/v1/payment/refund/{id}/approve
 * @desc    Approve and process a refund (Admin only)
 * @access  Protected (Admin)
 */
/**
 * @swagger
 * /payment/refund/{id}/approve:
 *   post:
 *     summary: Approve and process a refund
 *     description: |
 *       Admin-only endpoint to approve and process a refund request.
 *       Supports **Paystack** and **Flutterwave** refunds.
 *       - Marks refund as `PROCESSING` before calling the provider API.
 *       - Updates payment and refund status once processed.
 *
 *       ⚠️ Only refunds with status `PENDING` can be approved.
 *     tags: [Refunds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Refund ID
 *     responses:
 *       200:
 *         description: Refund approved and processed successfully
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
 *                   example: Refund approved and processed
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "refund_123"
 *                     status:
 *                       type: string
 *                       enum: [PENDING, PROCESSING, REFUNDED, FAILED]
 *                       example: REFUNDED
 *                     amount:
 *                       type: number
 *                       example: 75000
 *                     processedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-28T12:34:56.000Z"
 *       400:
 *         description: Invalid refund request (unsupported method or provider error)
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
 *                   example: Unsupported payment method or provider error
 *       404:
 *         description: Refund not found
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
 *                   example: Refund not found
 *       409:
 *         description: Refund not pending
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
 *                   example: Refund not pending
 *       500:
 *         description: Provider/system error while processing refund
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
 *                   example: Refund processing failed
 *                 error:
 *                   type: string
 *                   example: "Paystack API timeout"
 */
router.post(
  "/refund/:id/approve",
  requireAuth({ role: UserRole.ADMIN }),
  asyncHandler(async (req: any, res: any) => {
    const refundId = req.params.id;

    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: true },
    });

    if (!refund || !refund.payment) {
      return res
        .status(404)
        .json({ success: false, message: "Refund not found" });
    }

    if (refund.status === RefundStatus.REFUNDED) {
      return res.json({ success: true, message: "Refund already processed" });
    }

    if (refund.status !== RefundStatus.PENDING) {
      return res
        .status(409)
        .json({ success: false, message: "Refund not pending" });
    }

    // Mark as processing
    await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: RefundStatus.PROCESSING,
        processedBy: req.user.id,
        processedAt: new Date(),
      },
    });

    try {
      let providerResponse: any;
      let isSuccessful = false;

      if (refund.payment.method === PaymentMethod.PAYSTACK) {
        // === PAYSTACK FLOW ===
        providerResponse = await paystackService.refundPayment(
          refund.payment.reference
        );
        if (providerResponse?.status === true) {
          // Refund is initiated, not completed yet
          await prisma.refund.update({
            where: { id: refund.id },
            data: {
              status: RefundStatus.PROCESSING,
              providerResponse,
              processedBy: req.user.id,
              processedAt: new Date(),
            },
          });

          await prisma.payment.update({
            where: { id: refund.payment.id },
            data: { refundStatus: RefundStatus.PROCESSING },
          });

          return res.json({
            success: true,
            message: "Refund initiated with Paystack (pending settlement)",
            data: providerResponse,
          });
        }
      } else if (refund.payment.method === PaymentMethod.FLUTTERWAVE) {
        const flwId = refund.payment.transactionId || refund.payment.reference;
        if (!flwId)
          throw new AppError("Missing Flutterwave transaction ID", 400);

        const resp = await flutterwaveService.refundPayment(flwId);

        const provStatus = String(resp?.status || "").toLowerCase();
        const dataStatus = String(resp?.data?.status || "").toLowerCase();

        const mapped =
          provStatus === "success"
            ? RefundStatus.PROCESSING
            : RefundStatus.FAILED;

        await prisma.$transaction([
          prisma.refund.update({
            where: { id: refund.id },
            data: {
              status: mapped,
              providerResponse: resp,
              processedBy: req.user.id,
              processedAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          prisma.payment.update({
            where: { id: refund.payment.id },
            data: { refundStatus: mapped },
          }),
        ]);

        return res.status(mapped === RefundStatus.PROCESSING ? 202 : 400).json({
          success: mapped !== RefundStatus.FAILED,
          message:
            mapped === RefundStatus.PROCESSING
              ? "Refund initiated with Flutterwave (awaiting webhook confirmation)"
              : resp?.message || "Refund initiation failed",
          data: resp,
        });
      }
      return res
        .status(400)
        .json({ success: false, message: "Unsupported payment method" });
    } catch (err: any) {
      const raw = err.response?.data || err;

      await prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.FAILED,
          providerResponse: raw,
          updatedAt: new Date(),
        },
      });

      return res.status(500).json({
        success: false,
        message:
          raw?.data ||
          raw?.message ||
          (err as Error).message ||
          "Refund processing failed",
        error: raw,
      });
    }
  })
);

/**
 * @route   POST /api/v1/payment/refund/:id/reject
 * @desc    Reject a refund request (Admin only)
 * @access  Protected (Admin)
 */
/**
 * @swagger
 * /payment/refund/{id}/reject:
 *   post:
 *     summary: Reject a refund request
 *     description: |
 *       Rejects a pending or processing refund request. Only admins can reject refunds.
 *       - Only refunds with status `REFUND_PENDING` or `REFUND_PROCESSING` can be rejected.
 *     tags:
 *       - Refunds
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the refund to reject
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejecting the refund
 *                 example: "Booking not eligible for refund"
 *     responses:
 *       200:
 *         description: Refund rejected successfully
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
 *                   example: Refund rejected
 *       409:
 *         description: Refund not pending/processing
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
 *                   example: Refund not pending/processing
 *       404:
 *         description: Refund not found
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
 *                   example: Refund not found
 */
router.post(
  "/refund/:id/reject",
  requireAuth({ role: UserRole.ADMIN }),
  asyncHandler(async (req: any, res: any) => {
    const refundId = req.params.id;
    const { reason } = refundRejectSchema.parse(req.body);

    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: true },
    });
    if (!refund || !refund.payment) throw new AppError("Refund not found", 404);

    // Only pending/processing refunds
    if (
      !(
        [RefundStatus.PENDING, RefundStatus.PROCESSING] as RefundStatus[]
      ).includes(refund.status as RefundStatus)
    ) {
      return res
        .status(409)
        .json({ success: false, message: "Refund not pending/processing" });
    }

    await prisma.$transaction([
      prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.FAILED,
          providerResponse: { error: reason },
        },
      }),
      prisma.payment.update({
        where: { id: refund.payment.id },
        data: {
          refundStatus: RefundStatus.FAILED,
          refundFailedReason: reason,
        },
      }),
    ]);

    auditLog("REFUND_REJECTED", req.user.id, { refundId, reason }, req.ip);

    res.json({
      success: true,
      message: "Refund rejected",
    });
  })
);

export default router;
