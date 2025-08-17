// MAR ABU PROJECTS SERVICES LLC - Payment Processing Routes
import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import {
  PaymentStatus,
  PaymentMethod,
  BookingStatus,
  UserRole,
  NotificationType,
} from "@prisma/client";
import { requireAuth } from "../services/authservice";
import { asyncHandler } from "../middlewares/error.middleware";
import { AppError } from "../middlewares/error.middleware";
import { prisma } from "../server";
import { auditLog } from "../middlewares/logger.middleware";
import { emailService } from "../services/emailservice";
import { paystackService } from "../services/paystackservice";
import { flutterwaveService } from "../services/flutterwaveservice";

const router = Router();

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
 * @route   POST /api/v1/payments/initialize
 * @desc    Initialize payment for a booking
 * @access  Protected (booking owner)
 */
/**
 * @swagger
 * /notifications/broadcast:
 *   post:
 *     summary: Broadcast a notification to all users (optionally filtered by role)
 *     description: Admins can send a broadcast notification to all users, or limit the broadcast to a specific user role.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *                 example: "System Maintenance"
 *               message:
 *                 type: string
 *                 example: "The system will be down for maintenance at midnight."
 *               type:
 *                 type: string
 *                 enum: [INFO, ALERT, REMINDER, WARNING]
 *                 example: "ALERT"
 *               userRole:
 *                 type: string
 *                 enum: [ADMIN, USER, MANAGER]
 *                 description: Optional - Target only users with this role
 *               urgent:
 *                 type: boolean
 *                 default: false
 *                 example: true
 *     responses:
 *       201:
 *         description: Broadcast notification sent successfully
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
 *                   example: "Broadcast notification sent to 25 users"
 *                 data:
 *                   type: object
 *                   properties:
 *                     recipientCount:
 *                       type: integer
 *                       example: 25
 *                     title:
 *                       type: string
 *                       example: "System Maintenance"
 *                     message:
 *                       type: string
 *                       example: "The system will be down for maintenance at midnight."
 *                     type:
 *                       type: string
 *                       example: "ALERT"
 *       400:
 *         description: Validation error (missing fields or invalid type)
 *       401:
 *         description: Unauthorized (not logged in or not admin)
 *       403:
 *         description: Forbidden (insufficient role permissions)
 *       500:
 *         description: Server error
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

    // Get booking details
    const booking = await prisma.booking.findUnique({
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
      throw new AppError("Booking not found", 404);
    }

    // Check if user owns the booking
    if (booking.customerId !== req.user.id) {
      throw new AppError("Not authorized to pay for this booking", 403);
    }

    // Check if booking is approved
    if (booking.status !== BookingStatus.APPROVED) {
      throw new AppError("Booking must be approved before payment", 400);
    }

    // Check if already paid
    if (booking.paymentStatus === PaymentStatus.PAID) {
      throw new AppError("Booking is already paid", 400);
    }

    // Generate payment reference
    const paymentReference = `MAR_${bookingId}_${Date.now()}`;

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        userId: booking.customerId,
        amount: booking.total,
        currency,
        method: paymentMethod,
        reference: paymentReference,
        status: PaymentStatus.PENDING,
        gatewayResponse: {
          customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
          customerEmail: booking.customer.email,
          propertyName: booking.property.name,
          bookingCode: booking.bookingCode,
        },
      },
    });

    let paymentData: any = {};

    try {
      // Initialize payment with selected provider
      switch (paymentMethod) {
        case PaymentMethod.PAYSTACK:
          paymentData = await paystackService.initializePayment({
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

        case PaymentMethod.FLUTTERWAVE:
          paymentData = await flutterwaveService.initializePayment({
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

      // Update payment with provider response
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          reference: paymentData.reference || paymentReference,
          gatewayResponse: paymentData,
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
    } catch (error) {
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      throw new AppError("Failed to initialize payment", 500);
    }
  })
);

// ===============================
// PAYMENT VERIFICATION
// ===============================

/**
 * @route   POST /api/v1/payments/verify/:reference
 * @desc    Verify payment status
 * @access  Protected
 */
/**
 * @swagger
 * /payments/verify/{reference}:
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
      throw new AppError("Payment not found", 404);
    }

    // Check if user is authorized
    if (
      payment.booking.customerId !== req.user.id &&
      req.user.role !== UserRole.ADMIN
    ) {
      throw new AppError("Not authorized to verify this payment", 403);
    }

    let verificationResult: any = {};

    try {
      // Verify payment with provider
      switch (payment.method) {
        case PaymentMethod.PAYSTACK:
          verificationResult = await paystackService.verifyPayment(reference);
          break;

        case PaymentMethod.FLUTTERWAVE:
          verificationResult =
            await flutterwaveService.verifyPayment(reference);
          break;

        case PaymentMethod.BANK_TRANSFER:
          // Bank transfer verification is done manually by admin
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
        verificationResult.status === "success" &&
        (verificationResult.data.status === "successful" ||
          verificationResult.data.status === "success");

      if (isSuccessful) {
        // Update payment status
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            gatewayResponse: verificationResult,
          },
        });

        // Update booking payment status
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paidAmount: payment.amount,
            paidAt: new Date(),
          },
        });

        // Create notifications
        await Promise.all([
          // Notify customer
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
          // Notify host
          prisma.notification.create({
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

        auditLog(
          "PAYMENT_VERIFIED",
          req.user.id,
          {
            paymentId: payment.id,
            bookingId: payment.bookingId,
            amount: payment.amount,
            reference,
            status: "successful",
          },
          req.ip
        );

        res.json({
          success: true,
          message: "Payment verified successfully",
          data: {
            payment: {
              id: payment.id,
              reference,
              amount: payment.amount,
              status: PaymentStatus.PAID,
              paidAt: new Date(),
            },
            booking: {
              id: payment.booking.id,
              bookingCode: payment.booking.bookingCode,
              paymentStatus: PaymentStatus.PAID,
            },
          },
        });
      } else {
        // Payment failed
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
            reason:
              verificationResult.data?.gateway_response || "Payment failed",
          },
          req.ip
        );

        throw new AppError("Payment verification failed", 400);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

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
 * @route   POST /api/v1/payments/webhook/paystack
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

    // Verify webhook signature
    const isValid = paystackService.verifyWebhookSignature(body, signature);
    if (!isValid) {
      throw new AppError("Invalid webhook signature", 400);
    }

    const { event, data } = req.body;

    if (event === "charge.success") {
      const reference = data.reference;

      const payment = await prisma.payment.findUnique({
        where: { reference: reference },
        include: { booking: true },
      });

      if (payment && payment.status === PaymentStatus.PENDING) {
        // Update payment status
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            gatewayResponse: data,
          },
        });

        // Update booking
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paidAmount: payment.amount,
            paidAt: new Date(),
          },
        });

        auditLog(
          "WEBHOOK_PAYMENT_SUCCESS",
          "system",
          {
            paymentId: payment.id,
            bookingId: payment.bookingId,
            reference,
            provider: "paystack",
          },
          req.ip
        );
      }
    }

    res.status(200).json({ success: true });
  })
);

/**
 * @route   POST /api/v1/payments/webhook/flutterwave
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

    // Verify webhook signature (prefer using raw body if required)
    const isValid = flutterwaveService.verifyWebhookSignature(
      req.body,
      signature
    );
    if (!isValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid webhook signature" });
    }

    try {
      const { event, data } = req.body;

      if (event === "charge.completed" && data.status === "successful") {
        const reference = data.tx_ref;

        const payment = await prisma.payment.findUnique({
          where: { reference },
          include: { booking: true },
        });

        if (payment && payment.status === PaymentStatus.PENDING) {
          await prisma.$transaction([
            prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.PAID,
                paidAt: new Date(),
                gatewayResponse: data,
              },
            }),
            prisma.booking.update({
              where: { id: payment.bookingId },
              data: {
                paymentStatus: PaymentStatus.PAID,
                paidAmount: payment.amount,
                paidAt: new Date(),
              },
            }),
          ]);

          auditLog(
            "WEBHOOK_PAYMENT_SUCCESS",
            "system",
            {
              paymentId: payment.id,
              bookingId: payment.bookingId,
              reference,
              provider: "flutterwave",
              amount: payment.amount,
              currency: data.currency,
            },
            req.ip
          );
        }
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      // Log but still acknowledge receipt to avoid retries
      console.error("Flutterwave webhook error:", error);
      return res.status(200).json({ success: true });
    }
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
 * /payments:
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

    // Regular users can only see their own payments
    if (req.user.role === UserRole.CUSTOMER) {
      where.booking = { customerId: req.user.id };
    } else if (req.user.role === UserRole.ADMIN) {
      where.booking = { property: { hostId: req.user.id } };
    }

    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;
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
 * @route   GET /api/v1/payments/:id
 * @desc    Get payment details
 * @access  Protected (authorized users only)
 */
/**
 * @swagger
 * /payments/{id}:
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
router.get(
  "/:id",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const payment = await prisma.payment.findUnique({
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
      throw new AppError("Payment not found", 404);
    }

    // Check authorization
    const isCustomer = payment.booking.customerId === req.user.id;
    const isHost = payment.booking.property.hostId === req.user.id;
    const isAdmin = req.user.role === UserRole.ADMIN;

    if (!isCustomer && !isHost && !isAdmin) {
      throw new AppError("Not authorized to view this payment", 403);
    }

    res.json({
      success: true,
      data: payment,
    });
  })
);

/**
 * @route   POST /api/v1/payments/:id/refund
 * @desc    Process refund
 * @access  Admin only
 */
/**
 * @swagger
 * /payments/{id}/refund:
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
router.post(
  "/:id/refund",
  requireAuth({ role: UserRole.ADMIN }),
  [
    body("amount")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Valid refund amount required"),
    body("reason").isString().withMessage("Refund reason required"),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { amount, reason } = req.body;

    const payment = await prisma.payment.findUnique({
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
      throw new AppError("Payment not found", 404);
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new AppError("Can only refund successful payments", 400);
    }

    const refundAmount = amount || payment.amount;

    if (refundAmount > payment.amount) {
      throw new AppError("Refund amount cannot exceed payment amount", 400);
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
  })
);

export default router;
