// MAR ABU PROJECTS SERVICES LLC - Receipt Management Routes
import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import { ReceiptStatus, PaymentStatus, UserRole } from '@prisma/client'
import { requireAuth } from '../services/authservice'
import { asyncHandler } from '../middleware/error.middleware'
import { AppError } from '../middleware/error.middleware'
import { prisma } from '../server'
import { auditLog } from '../middleware/logger.middleware'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'crypto'
import { emailService } from '../services/emailservice'
import { APP_CONSTANTS } from '../utils/constants'

const router = Router()

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/receipts')
  },
  filename: (req, file, cb) => {
    const uniqueName = `receipt-${uuidv4()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: APP_CONSTANTS.UPLOAD.MAX_DOCUMENT_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (APP_CONSTANTS.UPLOAD.ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only PDF and images are allowed.'))
    }
  },
})

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
// RECEIPT ROUTES
// ===============================

/**
 * @route   GET /api/v1/receipts
 * @desc    Get receipts (admin only)
 * @access  Admin
 */
router.get(
  '/',
  requireAuth(UserRole.ADMIN),
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      status,
      bookingId,
      customerId,
    } = req.query

    const where: any = {}
    if (status) where.status = status
    if (bookingId) where.bookingId = bookingId
    if (customerId) where.booking = { customerId }

    const [receipts, total] = await Promise.all([
      prisma.receipt.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              total: true,
              property: {
                select: {
                  name: true,
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
      prisma.receipt.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        receipts,
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
 * @route   GET /api/v1/receipts/booking/:bookingId
 * @desc    Get receipts for a booking
 * @access  Protected (owner, property host, admin)
 */
router.get(
  '/booking/:bookingId',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const { bookingId } = req.params

    // Check booking access
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: {
          select: { hostId: true },
        },
      },
    })

    if (!booking) {
      throw new AppError('Booking not found', 404)
    }

    // Check authorization
    const isOwner = booking.customerId === req.user.id
    const isHost = booking.property.hostId === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN

    if (!isOwner && !isHost && !isAdmin) {
      throw new AppError('Not authorized to view these receipts', 403)
    }

    const receipts = await prisma.receipt.findMany({
      where: { bookingId },
      orderBy: { uploadedAt: 'desc' },
    })

    res.json({
      success: true,
      data: receipts,
    })
  })
)

/**
 * @route   POST /api/v1/receipts/booking/:bookingId
 * @desc    Upload receipt for booking
 * @access  Protected (booking owner)
 */
router.post(
  '/booking/:bookingId',
  requireAuth(),
  upload.single('receipt'),
  [
    param('bookingId').isString(),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
    body('transactionReference').optional().isString(),
    body('paymentDate').optional().isISO8601(),
    body('notes').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { bookingId } = req.params
    const { amount, transactionReference, paymentDate, notes } = req.body

    if (!req.file) {
      throw new AppError('Receipt file is required', 400)
    }

    // Check booking ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: {
          select: {
            name: true,
            hostId: true,
          },
        },
      },
    })

    if (!booking) {
      throw new AppError('Booking not found', 404)
    }

    if (booking.customerId !== req.user.id) {
      throw new AppError('Not authorized to upload receipt for this booking', 403)
    }

    // Check booking status
    if (booking.status !== 'APPROVED') {
      throw new AppError('Booking must be approved before uploading receipts', 400)
    }

    // Create receipt record
    const receipt = await prisma.receipt.create({
      data: {
        bookingId,
        fileUrl: `/uploads/receipts/${req.file.filename}`,
        originalFilename: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        amount: parseFloat(amount),
        transactionReference,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        notes,
        status: ReceiptStatus.PENDING,
      },
    })

    // Create notification for property host
    await prisma.notification.create({
      data: {
        userId: booking.property.hostId,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Receipt Uploaded',
        message: `A payment receipt has been uploaded for booking ${booking.bookingNumber}`,
        data: {
          bookingId: booking.id,
          receiptId: receipt.id,
          amount: receipt.amount,
        },
      },
    })

    auditLog('RECEIPT_UPLOADED', req.user.id, {
      bookingId: booking.id,
      receiptId: receipt.id,
      amount: receipt.amount,
    }, req.ip)

    res.status(201).json({
      success: true,
      message: 'Receipt uploaded successfully. Awaiting verification.',
      data: receipt,
    })
  })
)

/**
 * @route   PATCH /api/v1/receipts/:id/verify
 * @desc    Verify receipt (admin, property host)
 * @access  Admin, Property Host
 */
router.patch(
  '/:id/verify',
  requireAuth(UserRole.PROPERTY_HOST),
  [
    param('id').isString(),
    body('status').isIn([ReceiptStatus.VERIFIED, ReceiptStatus.REJECTED]),
    body('verificationNotes').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params
    const { status, verificationNotes } = req.body

    // Get receipt with booking
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            property: {
              select: { hostId: true },
            },
            customer: {
              select: {
                email: true,
                firstName: true,
              },
            },
          },
        },
      },
    })

    if (!receipt) {
      throw new AppError('Receipt not found', 404)
    }

    // Check authorization
    const isHost = receipt.booking.property.hostId === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN

    if (!isHost && !isAdmin) {
      throw new AppError('Not authorized to verify this receipt', 403)
    }

    // Update receipt
    const updated = await prisma.receipt.update({
      where: { id },
      data: {
        status,
        verificationNotes,
        verifiedAt: new Date(),
        verifiedBy: req.user.id,
      },
    })

    // Update booking payment status if verified
    if (status === ReceiptStatus.VERIFIED) {
      await prisma.booking.update({
        where: { id: receipt.bookingId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          paidAmount: receipt.amount,
          paidAt: new Date(),
        },
      })

      // Send confirmation email
      await emailService.sendReceiptVerified({
        guestEmail: receipt.booking.customer.email,
        guestName: receipt.booking.customer.firstName,
        bookingNumber: receipt.booking.bookingNumber,
      })
    }

    // Create notification for customer
    await prisma.notification.create({
      data: {
        userId: receipt.booking.customerId,
        type: 'RECEIPT_VERIFIED',
        title: status === ReceiptStatus.VERIFIED ? 'Payment Verified' : 'Payment Verification Failed',
        message: status === ReceiptStatus.VERIFIED 
          ? `Your payment for booking ${receipt.booking.bookingNumber} has been verified.`
          : `Your payment receipt was rejected. ${verificationNotes || 'Please upload a valid receipt.'}`,
        data: {
          bookingId: receipt.bookingId,
          receiptId: receipt.id,
          status,
        },
      },
    })

    auditLog('RECEIPT_VERIFIED', req.user.id, {
      receiptId: receipt.id,
      bookingId: receipt.bookingId,
      status,
      amount: receipt.amount,
    }, req.ip)

    res.json({
      success: true,
      message: `Receipt ${status.toLowerCase()} successfully`,
      data: updated,
    })
  })
)

/**
 * @route   DELETE /api/v1/receipts/:id
 * @desc    Delete receipt
 * @access  Protected (owner before verification, admin)
 */
router.delete(
  '/:id',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            customerId: true,
          },
        },
      },
    })

    if (!receipt) {
      throw new AppError('Receipt not found', 404)
    }

    // Check authorization
    const isOwner = receipt.booking.customerId === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to delete this receipt', 403)
    }

    // Owners can only delete pending receipts
    if (isOwner && receipt.status !== ReceiptStatus.PENDING) {
      throw new AppError('Cannot delete verified or rejected receipts', 400)
    }

    // Delete receipt
    await prisma.receipt.delete({
      where: { id },
    })

    auditLog('RECEIPT_DELETED', req.user.id, {
      receiptId: id,
      bookingId: receipt.bookingId,
    }, req.ip)

    res.json({
      success: true,
      message: 'Receipt deleted successfully',
    })
  })
)

export default router