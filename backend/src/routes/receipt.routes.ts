import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import { requireAuth } from "../services/authservice";
import { asyncHandler, AppError } from "../middlewares/error.middleware";
import { prisma } from "../server";
import { auditLog } from "../middlewares/logger.middleware";
import { uploadMiddleware } from "../services/fileservice";
import { UserRole } from "@prisma/client";

const router = Router();

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

/**
 * @swagger
 * /receipts:
 *   post:
 *     summary: Upload a payment receipt
 *     description: Allows a customer to upload a receipt for their booking. Only the customer who made the booking can upload the receipt.
 *     tags:
 *       - Receipts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - amount
 *               - paymentMethod
 *               - file
 *             properties:
 *               bookingId:
 *                 type: string
 *                 example: "b1234abcd5678efgh"
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 250.50
 *               paymentMethod:
 *                 type: string
 *                 example: "bank_transfer"
 *               bank:
 *                 type: string
 *                 example: "First Bank Nigeria"
 *               transactionRef:
 *                 type: string
 *                 example: "TXN123456789"
 *               transactionDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-08-16T10:30:00Z"
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The receipt file (image or PDF)
 *     responses:
 *       201:
 *         description: Receipt uploaded successfully
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
 *                       example: "r9876abcd1234efgh"
 *                     fileName:
 *                       type: string
 *                       example: "receipt-12345.png"
 *                     originalName:
 *                       type: string
 *                       example: "receipt.png"
 *                     fileUrl:
 *                       type: string
 *                       example: "/uploads/receipts/receipt-12345.png"
 *                     fileSize:
 *                       type: number
 *                       example: 204800
 *                     mimeType:
 *                       type: string
 *                       example: "image/png"
 *                     amount:
 *                       type: number
 *                       example: 250.50
 *                     paymentMethod:
 *                       type: string
 *                       example: "bank_transfer"
 *                     bank:
 *                       type: string
 *                       example: "First Bank Nigeria"
 *                     transactionRef:
 *                       type: string
 *                       example: "TXN123456789"
 *                     transactionDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-16T10:30:00Z"
 *                     bookingId:
 *                       type: string
 *                       example: "b1234abcd5678efgh"
 *                     uploadedBy:
 *                       type: string
 *                       example: "u1234abcd5678efgh"
 *       400:
 *         description: Missing receipt file or invalid request
 *       403:
 *         description: Not authorized to upload receipt for this booking
 *       404:
 *         description: Booking not found
 */
router.post(
  "/",
  requireAuth(),
  uploadMiddleware.receipt,
  [
    body("bookingId").isString(),
    body("amount").isFloat({ gt: 0 }),
    body("paymentMethod").isString(),
    body("bank").optional().isString(),
    body("transactionRef").optional().isString(),
    body("transactionDate").optional().isISO8601(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    if (!req.file) {
      throw new AppError("Receipt file is required", 400);
    }

    const {
      bookingId,
      amount,
      paymentMethod,
      bank,
      transactionRef,
      transactionDate,
    } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: { select: { hostId: true } },
      },
    });

    if (!booking) throw new AppError("Booking not found", 404);

    if (booking.customerId !== req.user.id) {
      throw new AppError(
        "Not authorized to upload receipt for this booking",
        403
      );
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
        transactionDate: transactionDate
          ? new Date(transactionDate)
          : undefined,
        bookingId,
        uploadedBy: req.user.id,
      },
    });

    auditLog(
      "RECEIPT_UPLOADED",
      req.user.id,
      { receiptId: receipt.id, bookingId },
      req.ip
    );

    res.status(201).json({ success: true, data: receipt });
  })
);

/**
 * @swagger
 * /receipts/{id}:
 *   get:
 *     summary: Get receipt by ID
 *     description: Retrieve a specific receipt by its ID. Access restricted to the uploader, the booking customer, the property host, or an admin.
 *     tags:
 *       - Receipts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Receipt ID
 *     responses:
 *       200:
 *         description: Receipt retrieved successfully
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
 *                       example: "rec_12345"
 *                     fileName:
 *                       type: string
 *                       example: "receipt-123.pdf"
 *                     originalName:
 *                       type: string
 *                       example: "upload.pdf"
 *                     fileUrl:
 *                       type: string
 *                       example: "/uploads/receipts/receipt-123.pdf"
 *                     fileSize:
 *                       type: integer
 *                       example: 204800
 *                     mimeType:
 *                       type: string
 *                       example: "application/pdf"
 *                     amount:
 *                       type: number
 *                       example: 500.00
 *                     paymentMethod:
 *                       type: string
 *                       example: "Bank Transfer"
 *                     bank:
 *                       type: string
 *                       example: "GTBank"
 *                     transactionRef:
 *                       type: string
 *                       example: "TXN123456789"
 *                     transactionDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-15T12:30:00Z"
 *                     bookingId:
 *                       type: string
 *                       example: "book_67890"
 *                     uploadedBy:
 *                       type: string
 *                       example: "user_12345"
 *       403:
 *         description: Not authorized to view this receipt
 *       404:
 *         description: Receipt not found
 */
router.get(
  "/:id",
  requireAuth(),
  [param("id").isString()],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id },
      include: {
        booking: {
          select: { customerId: true, property: { select: { hostId: true } } },
        },
      },
    });

    if (!receipt) throw new AppError("Receipt not found", 404);

    const userId = req.user.id as string;
    const role = req.user.role as UserRole;

    const allowed =
      receipt.uploadedBy === userId ||
      receipt.booking.customerId === userId ||
      receipt.booking.property.hostId === userId ||
      role === UserRole.ADMIN;

    if (!allowed) {
      throw new AppError("Not authorized to view this receipt", 403);
    }

    res.json({ success: true, data: receipt });
  })
);

export default router;
