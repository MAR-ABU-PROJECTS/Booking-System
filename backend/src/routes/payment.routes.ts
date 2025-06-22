// MAR ABU PROJECTS SERVICES LLC - Payment Processing Routes
import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import { PaymentStatus, PaymentMethod, BookingStatus, UserRole } from '@prisma/client'
import { requireAuth } from '../services/authservice'
import { asyncHandler } from '../middlewares/error.middleware'
import { AppError } from '../middlewares/error.middleware'
import { prisma } from '../server'
import { auditLog } from '../middlewares/logger.middleware'
import { emailService } from '../services/emailservice'
import { paystackService } from '../services/paystackservice'
import { flutterwaveService } from '../services/flutterwaveservice'

const router = Router()

// Validation middleware
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    })
  }
  next()
}

// ===============================
// PAYMENT INITIATION
// ===============================

/**
 * @route   POST /api/v1/payments/initialize
 * @desc    Initialize payment for a booking
 * @access  Protected (booking owner)
 */
router.post(
  '/initialize',
  requireAuth(),
  [
    body('bookingId').isString().withMessage('Booking ID required'),
    body('paymentMethod').isIn(Object.values(PaymentMethod)).withMessage('Valid payment method required'),
    body('currency').optional().isIn(['NGN', 'USD', 'GBP', 'EUR']).withMessage('Valid currency required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { bookingId, paymentMethod, currency = 'NGN' } = req.body

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
    })

    if (!booking) {
      throw new AppError('Booking not found', 404)
    }

    // Check if user owns the booking
    if (booking.customerId !== req.user.id) {
      throw new AppError('Not authorized to pay for this booking', 403)
    }

    // Check if booking is approved
    if (booking.status !== BookingStatus.APPROVED) {
      throw new AppError('Booking must be approved before payment', 400)
    }

    // Check if already paid
    if (booking.paymentStatus === PaymentStatus.PAID) {
      throw new AppError('Booking is already paid', 400)
    }

    // Generate payment reference
    const paymentReference = `MAR_${bookingId}_${Date.now()}`

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount: booking.total,
        currency,
        paymentMethod,
        paymentReference,
        status: PaymentStatus.PENDING,
        metadata: {
          customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
          customerEmail: booking.customer.email,
          propertyName: booking.property.name,
          bookingNumber: booking.bookingNumber,
        },
      },
    })

    let paymentData: any = {}

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
          })
          break

        case PaymentMethod.FLUTTERWAVE:
          paymentData = await flutterwaveService.initializePayment({
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
          })
          break

        case PaymentMethod.BANK_TRANSFER:
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
          }
          break

        default:
          throw new AppError('Payment method not supported', 400)
      }

      // Update payment with provider response
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerReference: paymentData.reference || paymentReference,
          providerResponse: paymentData,
        },
      })

      auditLog('PAYMENT_INITIALIZED', req.user.id, {
        paymentId: payment.id,
        bookingId,
        amount: booking.total,
        paymentMethod,
        reference: paymentReference,
      }, req.ip)

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
      })
    } catch (error) {
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      })

      throw new AppError('Failed to initialize payment', 500)
    }
  })
)

// ===============================
// PAYMENT VERIFICATION
// ===============================

/**
 * @route   POST /api/v1/payments/verify/:reference
 * @desc    Verify payment status
 * @access  Protected
 */
router.post(
  '/verify/:reference',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const { reference } = req.params

    const payment = await prisma.payment.findUnique({
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
    })

    if (!payment) {
      throw new AppError('Payment not found', 404)
    }

    // Check if user is authorized
    if (payment.booking.customerId !== req.user.id && req.user.role !== UserRole.ADMIN) {
      throw new AppError('Not authorized to verify this payment', 403)
    }

    let verificationResult: any = {}

    try {
      // Verify payment with provider
      switch (payment.paymentMethod) {
        case PaymentMethod.PAYSTACK:
          verificationResult = await paystackService.verifyPayment(reference)
          break

        case PaymentMethod.FLUTTERWAVE:
          verificationResult = await flutterwaveService.verifyPayment(reference)
          break

        case PaymentMethod.BANK_TRANSFER:
          // Bank transfer verification is done manually by admin
          if (req.user.role !== UserRole.ADMIN) {
            throw new AppError('Bank transfer verification requires admin approval', 403)
          }
          verificationResult = { status: 'success', data: { status: 'successful' } }
          break

        default:
          throw new AppError('Payment method not supported for verification', 400)
      }

      const isSuccessful = verificationResult.status === 'success' && 
                          (verificationResult.data.status === 'successful' || 
                           verificationResult.data.status === 'success')

      if (isSuccessful) {
        // Update payment status
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            providerResponse: verificationResult,
          },
        })

        // Update booking payment status
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paidAmount: payment.amount,
            paidAt: new Date(),
          },
        })

        // Create notifications
        await Promise.all([
          // Notify customer
          prisma.notification.create({
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
          prisma.notification.create({
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
        ])

        // Send email confirmations
        await Promise.all([
          emailService.sendPaymentConfirmation(
            payment.booking.customer.email,
            {
              customerName: `${payment.booking.customer.firstName} ${payment.booking.customer.lastName}`,
              bookingNumber: payment.booking.bookingNumber,
              propertyName: payment.booking.property.name,
              amount: payment.amount,
              paymentReference: reference,
            }
          ),
          emailService.sendPaymentNotificationToHost(
            payment.booking.property.host.email,
            {
              hostName: `${payment.booking.property.host.firstName} ${payment.booking.property.host.lastName}`,
              customerName: `${payment.booking.customer.firstName} ${payment.booking.customer.lastName}`,
              bookingNumber: payment.booking.bookingNumber,
              propertyName: payment.booking.property.name,
              amount: payment.amount,
            }
          ),
        ])

        auditLog('PAYMENT_VERIFIED', req.user.id, {
          paymentId: payment.id,
          bookingId: payment.bookingId,
          amount: payment.amount,
          reference,
          status: 'successful',
        }, req.ip)

        res.json({
          success: true,
          message: 'Payment verified successfully',
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
              bookingNumber: payment.booking.bookingNumber,
              paymentStatus: PaymentStatus.PAID,
            },
          },
        })
      } else {
        // Payment failed
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            providerResponse: verificationResult,
          },
        })

        auditLog('PAYMENT_FAILED', req.user.id, {
          paymentId: payment.id,
          bookingId: payment.bookingId,
          reference,
          reason: verificationResult.data?.gateway_response || 'Payment failed',
        }, req.ip)

        throw new AppError('Payment verification failed', 400)
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      })

      throw new AppError('Payment verification failed', 500)
    }
  })
)

// ===============================
// PAYMENT WEBHOOK HANDLERS
// ===============================

/**
 * @route   POST /api/v1/payments/webhook/paystack
 * @desc    Handle Paystack webhook
 * @access  Public (webhook)
 */
router.post(
  '/webhook/paystack',
  asyncHandler(async (req: any, res: any) => {
    const signature = req.headers['x-paystack-signature']
    const body = JSON.stringify(req.body)

    // Verify webhook signature
    const isValid = paystackService.verifyWebhookSignature(body, signature)
    if (!isValid) {
      throw new AppError('Invalid webhook signature', 400)
    }

    const { event, data } = req.body

    if (event === 'charge.success') {
      const reference = data.reference
      
      const payment = await prisma.payment.findUnique({
        where: { paymentReference: reference },
        include: { booking: true },
      })

      if (payment && payment.status === PaymentStatus.PENDING) {
        // Update payment status
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            providerResponse: data,
          },
        })

        // Update booking
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paidAmount: payment.amount,
            paidAt: new Date(),
          },
        })

        auditLog('WEBHOOK_PAYMENT_SUCCESS', 'system', {
          paymentId: payment.id,
          bookingId: payment.bookingId,
          reference,
          provider: 'paystack',
        }, req.ip)
      }
    }

    res.status(200).json({ success: true })
  })
)

/**
 * @route   POST /api/v1/payments/webhook/flutterwave
 * @desc    Handle Flutterwave webhook
 * @access  Public (webhook)
 */
router.post(
  '/webhook/flutterwave',
  asyncHandler(async (req: any, res: any) => {
    const signature = req.headers['verif-hash']
    
    // Verify webhook signature
    const isValid = flutterwaveService.verifyWebhookSignature(req.body, signature)
    if (!isValid) {
      throw new AppError('Invalid webhook signature', 400)
    }

    const { event, data } = req.body

    if (event === 'charge.completed' && data.status === 'successful') {
      const reference = data.tx_ref
      
      const payment = await prisma.payment.findUnique({
        where: { paymentReference: reference },
        include: { booking: true },
      })

      if (payment && payment.status === PaymentStatus.PENDING) {
        // Update payment status
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            providerResponse: data,
          },
        })

        // Update booking
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paidAmount: payment.amount,
            paidAt: new Date(),
          },
        })

        auditLog('WEBHOOK_PAYMENT_SUCCESS', 'system', {
          paymentId: payment.id,
          bookingId: payment.bookingId,
          reference,
          provider: 'flutterwave',
        }, req.ip)
      }
    }

    res.status(200).json({ success: true })
  })
)

// ===============================
// PAYMENT MANAGEMENT
// ===============================

/**
 * @route   GET /api/v1/payments
 * @desc    Get payment history
 * @access  Protected
 */
router.get(
  '/',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      status,
      paymentMethod,
      bookingId,
    } = req.query

    // Build where clause
    const where: any = {}

    // Regular users can only see their own payments
    if (req.user.role === UserRole.CUSTOMER) {
      where.booking = { customerId: req.user.id }
    } else if (req.user.role === UserRole.PROPERTY_HOST) {
      where.booking = { property: { hostId: req.user.id } }
    }

    if (status) where.status = status
    if (paymentMethod) where.paymentMethod = paymentMethod
    if (bookingId) where.bookingId = bookingId

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
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
      prisma.payment.count({ where }),
    ])

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
    })
  })
)

/**
 * @route   GET /api/v1/payments/:id
 * @desc    Get payment details
 * @access  Protected (authorized users only)
 */
router.get(
  '/:id',
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
    })

    if (!payment) {
      throw new AppError('Payment not found', 404)
    }

    // Check authorization
    const isCustomer = payment.booking.customerId === req.user.id
    const isHost = payment.booking.property.hostId === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN

    if (!isCustomer && !isHost && !isAdmin) {
      throw new AppError('Not authorized to view this payment', 403)
    }

    res.json({
      success: true,
      data: payment,
    })
  })
)

/**
 * @route   POST /api/v1/payments/:id/refund
 * @desc    Process refund
 * @access  Admin only
 */
router.post(
  '/:id/refund',
  requireAuth(UserRole.ADMIN),
  [
    body('amount').optional().isFloat({ min: 0 }).withMessage('Valid refund amount required'),
    body('reason').isString().withMessage('Refund reason required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { amount, reason } = req.body

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
    })

    if (!payment) {
      throw new AppError('Payment not found', 404)
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new AppError('Can only refund successful payments', 400)
    }

    const refundAmount = amount || payment.amount

    if (refundAmount > payment.amount) {
      throw new AppError('Refund amount cannot exceed payment amount', 400)
    }

    // Create refund record
    const refund = await prisma.refund.create({
      data: {
        paymentId: payment.id,
        amount: refundAmount,
        reason,
        processedBy: req.user.id,
        status: 'PROCESSING',
      },
    })

    // Process refund with payment provider
    let refundResult: any = {}
    try {
      switch (payment.paymentMethod) {
        case PaymentMethod.PAYSTACK:
          refundResult = await paystackService.refundPayment(
            payment.providerReference!,
            refundAmount * 100
          )
          break

        case PaymentMethod.FLUTTERWAVE:
          refundResult = await flutterwaveService.refundPayment(
            payment.providerReference!,
            refundAmount
          )
          break

        default:
          // For bank transfers, mark as manual refund
          refundResult = { status: 'success', message: 'Manual refund required' }
      }

      // Update refund status
      await prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          providerResponse: refundResult,
        },
      })

      // Notify customer
      await prisma.notification.create({
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
      })

      // Send email notification
      await emailService.sendRefundNotification(
        payment.booking.customer.email,
        {
          customerName: `${payment.booking.customer.firstName} ${payment.booking.customer.lastName}`,
          refundAmount,
          bookingNumber: payment.booking.bookingNumber,
          reason,
        }
      )

      auditLog('REFUND_PROCESSED', req.user.id, {
        refundId: refund.id,
        paymentId: payment.id,
        amount: refundAmount,
        reason,
      }, req.ip)

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: refund,
      })
    } catch (error) {
      // Update refund status to failed
      await prisma.refund.update({
        where: { id: refund.id },
        data: { status: 'FAILED' },
      })

      throw new AppError('Failed to process refund', 500)
    }
  })
)

export default router