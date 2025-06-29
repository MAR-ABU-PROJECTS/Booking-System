import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import { requireAuth } from '../services/authservice'
import { asyncHandler, AppError } from '../middlewares/error.middleware'
import { prisma } from '../server'
import { auditLog } from '../middlewares/logger.middleware'
import { uploadMiddleware } from '../services/fileservice'
import { UserRole } from '@prisma/client'

const router = Router()

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

router.post(
  '/',
  requireAuth(),
  uploadMiddleware.receipt,
  [
    body('bookingId').isString(),
    body('amount').isFloat({ gt: 0 }),
    body('paymentMethod').isString(),
    body('bank').optional().isString(),
    body('transactionRef').optional().isString(),
    body('transactionDate').optional().isISO8601(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    if (!req.file) {
      throw new AppError('Receipt file is required', 400)
    }

    const {
      bookingId,
      amount,
      paymentMethod,
      bank,
      transactionRef,
      transactionDate,
    } = req.body

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: { select: { hostId: true } },
      },
    })

    if (!booking) throw new AppError('Booking not found', 404)

    if (booking.customerId !== req.user.id) {
      throw new AppError('Not authorized to upload receipt for this booking', 403)
    }

    const receipt = await prisma.receipt.create({
      data: {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileUrl: `/uploads/receipts/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        amount: parseFloat(amount),
        paymentMethod,
        bank,
        transactionRef,
        transactionDate: transactionDate ? new Date(transactionDate) : undefined,
        bookingId,
        uploadedBy: req.user.id,
      },
    })

    auditLog(
      'RECEIPT_UPLOADED',
      req.user.id,
      { receiptId: receipt.id, bookingId },
      req.ip,
    )

    res.status(201).json({ success: true, data: receipt })
  }),
)

router.get(
  '/:id',
  requireAuth(),
  [param('id').isString()],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id },
      include: {
        booking: {
          select: { customerId: true, property: { select: { hostId: true } } },
        },
      },
    })

    if (!receipt) throw new AppError('Receipt not found', 404)

    const userId = req.user.id as string
    const role = req.user.role as UserRole

    const allowed =
      receipt.uploadedBy === userId ||
      receipt.booking.customerId === userId ||
      receipt.booking.property.hostId === userId ||
      role === UserRole.ADMIN ||
      role === UserRole.SUPER_ADMIN

    if (!allowed) {
      throw new AppError('Not authorized to view this receipt', 403)
    }

    res.json({ success: true, data: receipt })
  }),
)

export default router
