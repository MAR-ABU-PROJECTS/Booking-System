"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
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
// import { paystackService } from "../services/paystackservice";
// import { flutterwaveService } from "../services/flutterwaveservice";
const helpers_1 = require("../utils/helpers");
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
// Zod schema for refund approval/rejection
const refundApproveSchema = zod_1.z.object({
    idempotencyKey: zod_1.z.string().min(8).max(64).optional(),
});
const refundRejectSchema = zod_1.z.object({
    reason: zod_1.z.string().min(2).max(255),
});
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
// Create uploads directory - use /tmp for production (Render compatible)
const uploadsDir = process.env.NODE_ENV === "production"
    ? path_1.default.join("/tmp", "receipts")
    : path_1.default.join(process.cwd(), "uploads", "receipts");
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Multer configuration for receipt uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `receipt-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Increased to 5MB for better user experience
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        console.log("DEBUG: File filter check:", {
            originalname: file.originalname,
            mimetype: file.mimetype,
            extname: extname,
            mimetypeMatch: mimetype,
            uploadsDir,
        });
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error("Only .png, .jpg, .jpeg and .pdf files are allowed!"));
        }
    },
});
// ===============================
// MANUAL BANK TRANSFER ROUTES
// ===============================
// PRODUCTION DEBUG ROUTE - Remove after confirming storage works
router.get("/debug/storage", (0, authservice_1.requireAuth)(), async (req, res) => {
    if (req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Admin only" });
    }
    try {
        const info = {
            environment: process.env.NODE_ENV,
            platform: process.platform,
            processDir: process.cwd(),
            uploadsDir,
            directories: {
                uploadsExists: fs_1.default.existsSync(uploadsDir),
                tmpExists: fs_1.default.existsSync("/tmp"),
                processUploads: fs_1.default.existsSync(path_1.default.join(process.cwd(), "uploads")),
                tmpReceipts: fs_1.default.existsSync("/tmp/receipts"),
            },
            files: {
                uploadsContent: fs_1.default.existsSync(uploadsDir)
                    ? fs_1.default.readdirSync(uploadsDir)
                    : [],
                tmpContent: fs_1.default.existsSync("/tmp")
                    ? fs_1.default.readdirSync("/tmp").slice(0, 10)
                    : [],
                tmpReceiptsContent: fs_1.default.existsSync("/tmp/receipts")
                    ? fs_1.default.readdirSync("/tmp/receipts")
                    : [],
            },
            recentPayments: await server_1.prisma.payment.findMany({
                where: {
                    receiptUploaded: true,
                    status: "PROCESSING",
                },
                select: {
                    id: true,
                    receiptUrl: true,
                    updatedAt: true,
                    gatewayResponse: true,
                },
                orderBy: { updatedAt: "desc" },
                take: 5,
            }),
        };
        res.json(info);
    }
    catch (error) {
        res.json({ error: error?.message || "Unknown error" });
    }
});
/**
 * @route   POST /api/v1/payment/:id/upload-receipt
 * @desc    Upload payment receipt for manual verification
 * @access  Protected (payment owner)
 */
/**
 * @swagger
 * /payment/{id}/upload-receipt:
 *   post:
 *     summary: Upload payment receipt for manual verification
 *     description: Upload a payment receipt (image or PDF) for manual verification by admin. The payment status will change to PROCESSING and admin will be notified via email.
 *     tags:
 *       - Manual Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Payment ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               receipt:
 *                 type: string
 *                 format: binary
 *                 description: Receipt file (JPG, PNG, PDF, max 5MB)
 *             required:
 *               - receipt
 *     responses:
 *       200:
 *         description: Receipt uploaded successfully
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
 *                   example: "Receipt uploaded successfully. Payment is now being processed."
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: string
 *                       example: "pay_1234567890"
 *                     status:
 *                       type: string
 *                       example: "PROCESSING"
 *                     receiptUrl:
 *                       type: string
 *                       example: "receipt-1663234567890-123456789.jpg"
 *       400:
 *         description: Validation error or invalid payment status
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
 *                   example: "Receipt can only be uploaded for pending payments"
 *       404:
 *         description: Payment not found or unauthorized
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
 *                   example: "Payment not found or unauthorized"
 *       413:
 *         description: File too large
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
 *                   example: "File size exceeds 5MB limit"
 *       500:
 *         description: Server error
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
 *                   example: "Failed to upload receipt"
 */
router.post("/:id/upload-receipt", (0, authservice_1.requireAuth)(), upload.single("receipt"), async (req, res) => {
    try {
        console.log("DEBUG: Upload receipt route started");
        console.log("DEBUG: Request params:", req.params);
        console.log("DEBUG: User ID:", req.user?.id);
        console.log("DEBUG: File:", req.file ? "File present" : "No file");
        const paymentId = req.params.id;
        const userId = req.user.id;
        console.log("DEBUG: About to query payment from database");
        // Check if payment exists and belongs to user
        const payment = await server_1.prisma.payment.findFirst({
            where: {
                id: paymentId,
                booking: {
                    customerId: userId,
                },
            },
            include: {
                booking: {
                    include: {
                        property: true,
                        customer: true,
                    },
                },
            },
        });
        console.log("DEBUG: Payment query completed, payment found:", !!payment);
        if (!payment) {
            console.log("DEBUG: Payment not found, returning 404");
            return res.status(404).json({
                success: false,
                message: "Payment not found or unauthorized",
            });
        }
        console.log("DEBUG: Checking payment status:", payment.status);
        // Check if payment is in correct status for receipt upload
        if (payment.status !== "PENDING") {
            console.log("DEBUG: Payment status invalid, returning 400");
            return res.status(400).json({
                success: false,
                message: "Receipt can only be uploaded for pending payments",
            });
        }
        console.log("DEBUG: Checking if file exists");
        if (!req.file) {
            console.log("DEBUG: No file found, returning 400");
            return res.status(400).json({
                success: false,
                message: "Receipt file is required",
            });
        }
        console.log("DEBUG: File uploaded successfully:", {
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype,
            uploadsDir,
        });
        // Store file data as base64 (primary storage method for cloud compatibility)
        let fileData = null;
        let fileMetadata = null;
        try {
            const fileBuffer = fs_1.default.readFileSync(req.file.path);
            fileData = fileBuffer.toString("base64");
            fileMetadata = {
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                uploadedAt: new Date().toISOString(),
                environment: process.env.NODE_ENV,
                storagePath: req.file.path,
            };
            console.log("DEBUG: File stored as base64 for database-first storage strategy");
        }
        catch (e) {
            console.error("ERROR: Could not read file data:", e);
            return res.status(500).json({
                success: false,
                message: "Failed to process uploaded file",
            });
        }
        console.log("DEBUG: About to update payment in database");
        // Update payment with receipt information and mark booking paymentStatus as PROCESSING
        const [updatedPayment] = await server_1.prisma.$transaction([
            server_1.prisma.payment.update({
                where: { id: paymentId },
                data: {
                    status: "PROCESSING",
                    receiptUrl: req.file.filename,
                    receiptUploaded: true,
                    // For BANK_TRANSFER, use paidAt to record receipt upload time
                    paidAt: new Date(),
                    updatedAt: new Date(),
                    // Store file data in database (primary storage for cloud compatibility)
                    gatewayResponse: {
                        ...(payment.gatewayResponse || {}),
                        receiptBackup: fileData, // Primary storage, not just backup
                        receiptMetadata: fileMetadata,
                        uploadMethod: "database_first",
                        databaseStored: !!fileData,
                        diskPath: req.file.path, // Secondary reference for local development
                    },
                },
            }),
            server_1.prisma.booking.update({
                where: { id: payment.bookingId },
                data: {
                    paymentStatus: "PROCESSING",
                    updatedAt: new Date(),
                },
            }),
        ]);
        console.log("DEBUG: Payment updated successfully");
        // Send notification to admin
        console.log("DEBUG: About to send admin notification email");
        try {
            await emailservice_1.emailService.sendAdminReceiptUploadNotification(process.env.ADMIN_EMAIL || "admin@marabu.com", updatedPayment, payment.booking, req.file.filename);
            console.log("DEBUG: Admin notification email sent successfully");
        }
        catch (emailError) {
            console.error("DEBUG: Failed to send admin notification:", emailError);
        }
        console.log("DEBUG: About to send response");
        res.json({
            success: true,
            message: "Receipt uploaded successfully. Payment is now being processed.",
            data: {
                paymentId: updatedPayment.id,
                status: updatedPayment.status,
                receiptUrl: updatedPayment.receiptUrl,
            },
        });
    }
    catch (error) {
        console.error("Receipt upload error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to upload receipt",
            error: error.message,
        });
    }
});
/**
 * @route   POST /api/v1/payment/:id/verify-manual
 * @desc    Admin verify manual payment
 * @access  Protected (admin only)
 */
/**
 * @swagger
 * /payment/{id}/verify-manual:
 *   post:
 *     summary: Admin verify manual payment (Approve/Reject)
 *     description: |
 *       Admin endpoint to verify or reject a manual payment receipt upload.
 *       When approved, the payment status becomes PAID and booking is CONFIRMED.
 *       When rejected, the payment status becomes FAILED and booking is CANCELLED.
 *       Customer receives email notification with verification result.
 *     tags:
 *       - Manual Payments
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Payment ID to verify
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approved:
 *                 type: boolean
 *                 description: Whether to approve (true) or reject (false) the payment
 *                 example: true
 *               adminNotes:
 *                 type: string
 *                 description: Optional admin notes about the verification decision
 *                 example: "Payment verified against bank statement. Amount matches booking total."
 *                 maxLength: 500
 *             required:
 *               - approved
 *     responses:
 *       200:
 *         description: Payment verification completed
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
 *                   example: "Payment approved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "pay_1234567890"
 *                         status:
 *                           type: string
 *                           example: "PAID"
 *                         verifiedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-09-12T14:42:03.000Z"
 *                         adminNotes:
 *                           type: string
 *                           example: "Payment verified against bank statement"
 *                     booking:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "book_1234567890"
 *                         status:
 *                           type: string
 *                           example: "CONFIRMED"
 *       400:
 *         description: Invalid payment status for verification
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
 *                   example: "Payment is not in processing status"
 *       403:
 *         description: Admin access required
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
 *                   example: "Admin access required"
 *       404:
 *         description: Payment not found
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
 *                   example: "Payment not found"
 *       500:
 *         description: Server error
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
 *                   example: "Failed to verify payment"
 */
router.post("/:id/verify-manual", (0, authservice_1.requireAuth)(), async (req, res) => {
    try {
        const paymentId = req.params.id;
        const { approved, adminNotes } = req.body;
        // Check if user is admin
        const user = await server_1.prisma.user.findUnique({
            where: { id: req.user.id },
        });
        if (!user || user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Admin access required",
            });
        }
        // Get payment with related data
        const payment = await server_1.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                booking: {
                    include: {
                        property: true,
                        customer: true,
                    },
                },
            },
        });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }
        if (payment.status !== "PROCESSING") {
            return res.status(400).json({
                success: false,
                message: "Payment is not in processing status",
            });
        }
        const newStatus = approved ? "PAID" : "FAILED";
        const bookingStatus = approved ? "CONFIRMED" : "CANCELLED";
        // Update payment and booking in a transaction
        const result = await server_1.prisma.$transaction(async (tx) => {
            // Update payment
            const updatedPayment = await tx.payment.update({
                where: { id: paymentId },
                data: {
                    status: newStatus,
                    verifiedAt: new Date(),
                    // record verifier
                    verifiedBy: user.id,
                    // mark receipt verified only when approved
                    receiptVerified: approved ? true : false,
                    // ensure paidAt is set when approved; leave as-is if already set (from upload)
                    paidAt: approved ? (payment.paidAt ?? new Date()) : payment.paidAt,
                    // set failedAt timestamp when rejected
                    failedAt: approved ? null : new Date(),
                    adminNotes: adminNotes || null,
                    updatedAt: new Date(),
                },
            });
            // Update booking status and payment status
            const updatedBooking = await tx.booking.update({
                where: { id: payment.bookingId },
                data: {
                    status: bookingStatus,
                    paymentStatus: approved ? "PAID" : "FAILED",
                    // reflect financials on booking when approved
                    paidAmount: approved ? payment.amount : undefined,
                    paidAt: approved ? (payment.paidAt ?? new Date()) : undefined,
                    updatedAt: new Date(),
                },
            });
            return { payment: updatedPayment, booking: updatedBooking };
        });
        // Send notification to customer
        try {
            if (approved) {
                // Use existing email service method for receipt verification
                await emailservice_1.emailService.sendReceiptVerifiedNotification(payment.booking.customer.email, result.booking);
            }
            else {
                // Send custom rejection email
                await emailservice_1.emailService.sendEmail({
                    to: payment.booking.customer.email,
                    subject: "Payment Verification Failed",
                    html: `
            <h2>Payment Verification Failed</h2>
            <p>Dear ${payment.booking.customer.firstName},</p>
            <p>Unfortunately, we could not verify your payment receipt. Your booking has been cancelled.</p>
            
            <h3>Details:</h3>
            <ul>
              <li><strong>Booking ID:</strong> ${payment.booking.id}</li>
              <li><strong>Property:</strong> ${payment.booking.property.name}</li>
              <li><strong>Amount:</strong> ₦${payment.amount.toLocaleString()}</li>
            </ul>
            
            ${adminNotes ? `<p><strong>Admin Notes:</strong> ${adminNotes}</p>` : ""}
            
            <p>Please contact support if you believe this is an error.</p>
          `,
                });
            }
        }
        catch (emailError) {
            console.error("Failed to send customer notification:", emailError);
        }
        res.json({
            success: true,
            message: `Payment ${approved ? "approved" : "rejected"} successfully`,
            data: {
                payment: result.payment,
                booking: result.booking,
            },
        });
    }
    catch (error) {
        console.error("Manual verification error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to verify payment",
            error: error.message,
        });
    }
});
/**
 * @route   POST /api/v1/payment/:id/reject-manual
 * @desc    Admin reject manual payment and notify customer (refund path)
 * @access  Protected (admin only)
 */
/**
 * @swagger
 * /payment/{id}/reject-manual:
 *   post:
 *     summary: Admin reject manual payment and notify customer
 *     description: |
 *       Admin endpoint to reject a manual payment when the uploaded receipt amount is incorrect or unverifiable.
 *       Sets the payment to FAILED and cancels the booking. Sends an email to the customer indicating a refund will be processed.
 *     tags:
 *       - Manual Payments
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Payment ID to reject
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection (e.g., amount mismatch)
 *                 example: "Amount sent does not match booking total"
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Payment rejected and customer notified
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
 *                   example: "Payment rejected and customer notified"
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       type: object
 *                     booking:
 *                       type: object
 *       400:
 *         description: Invalid payment status for rejection
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
 *                   example: "Payment is not in processing status"
 *       403:
 *         description: Admin access required
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
 *                   example: "Admin access required"
 *       404:
 *         description: Payment not found
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
 *                   example: "Payment not found"
 *       500:
 *         description: Server error
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
 *                   example: "Failed to reject payment"
 */
router.post("/:id/reject-manual", (0, authservice_1.requireAuth)(), async (req, res) => {
    try {
        const paymentId = req.params.id;
        const { reason } = req.body;
        // Admin check
        const user = await server_1.prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user || user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ success: false, message: "Admin access required" });
        }
        // Fetch payment
        const payment = await server_1.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                booking: {
                    include: { property: true, customer: true },
                },
            },
        });
        if (!payment) {
            return res
                .status(404)
                .json({ success: false, message: "Payment not found" });
        }
        if (payment.status !== "PROCESSING") {
            return res.status(400).json({
                success: false,
                message: "Payment is not in processing status",
            });
        }
        // Mark payment failed and cancel booking
        const result = await server_1.prisma.$transaction(async (tx) => {
            const updatedPayment = await tx.payment.update({
                where: { id: paymentId },
                data: {
                    status: "FAILED",
                    verifiedAt: new Date(),
                    verifiedBy: user.id,
                    receiptVerified: false,
                    failedAt: new Date(),
                    adminNotes: reason || null,
                    updatedAt: new Date(),
                },
            });
            const updatedBooking = await tx.booking.update({
                where: { id: payment.bookingId },
                data: {
                    status: "CANCELLED",
                    paymentStatus: "FAILED",
                    updatedAt: new Date(),
                },
            });
            return { payment: updatedPayment, booking: updatedBooking };
        });
        // Notify customer with refund intention
        try {
            await emailservice_1.emailService.sendEmail({
                to: payment.booking.customer.email,
                subject: "Payment Rejected - Refund Will Be Processed",
                html: `
            <h2>Payment Rejected</h2>
            <p>Dear ${payment.booking.customer.firstName},</p>
            <p>Your payment receipt for booking <strong>${payment.booking.bookingCode || payment.booking.id}</strong> was rejected because the amount sent did not match the expected total.</p>
            <div class="info-box">
              <p><strong>Property:</strong> ${payment.booking.property.name}</p>
              <p><strong>Expected Amount:</strong> ₦${payment.amount.toLocaleString()}</p>
            </div>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
            <p>A refund will be initiated shortly. If you believe this is an error, please contact support.</p>
          `,
            });
        }
        catch (err) {
            console.error("Failed to send rejection email:", err);
        }
        return res.json({
            success: true,
            message: "Payment rejected and customer notified",
            data: result,
        });
    }
    catch (error) {
        console.error("Manual rejection error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reject payment",
            error: error.message,
        });
    }
});
/**
 * @route   GET /api/v1/payment/pending-verification
 * @desc    Get payments pending manual verification
 * @access  Protected (admin only)
 */
/**
 * @swagger
 * /payment/pending-verification:
 *   get:
 *     summary: Get all payments pending manual verification
 *     description: |
 *       Admin endpoint to retrieve all payments that have uploaded receipts and are pending verification.
 *       Returns payment details, booking information, customer details, and property information.
 *       Only accessible by admin users.
 *     tags:
 *       - Manual Payments
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending payments retrieved successfully
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
 *                   example: "Pending payments retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "pay_1234567890"
 *                       amount:
 *                         type: number
 *                         example: 50000
 *                       currency:
 *                         type: string
 *                         example: "NGN"
 *                       status:
 *                         type: string
 *                         example: "PROCESSING"
 *                       receiptUrl:
 *                         type: string
 *                         example: "receipt-1663234567890-123456789.jpg"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-09-12T10:30:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-09-12T14:30:00.000Z"
 *                       booking:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "book_1234567890"
 *                           bookingCode:
 *                             type: string
 *                             example: "MAB-2024-001"
 *                           checkInDate:
 *                             type: string
 *                             format: date
 *                             example: "2024-12-20"
 *                           checkOutDate:
 *                             type: string
 *                             format: date
 *                             example: "2024-12-25"
 *                           nights:
 *                             type: integer
 *                             example: 5
 *                           total:
 *                             type: number
 *                             example: 50000
 *                           property:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "prop_1234567890"
 *                               name:
 *                                 type: string
 *                                 example: "Luxury Apartment in Victoria Island"
 *                               address:
 *                                 type: string
 *                                 example: "123 Ajose Adeogun Street, Victoria Island"
 *                           customer:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "user_1234567890"
 *                               firstName:
 *                                 type: string
 *                                 example: "John"
 *                               lastName:
 *                                 type: string
 *                                 example: "Doe"
 *                               email:
 *                                 type: string
 *                                 example: "john.doe@example.com"
 *                               phone:
 *                                 type: string
 *                                 example: "+234-801-234-5678"
 *                 count:
 *                   type: integer
 *                   example: 1
 *       403:
 *         description: Admin access required
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
 *                   example: "Admin access required"
 *       500:
 *         description: Server error
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
 *                   example: "Failed to retrieve pending payments"
 */
router.get("/pending-verification", (0, authservice_1.requireAuth)(), async (req, res) => {
    try {
        // Check if user is admin
        const user = await server_1.prisma.user.findUnique({
            where: { id: req.user.id },
        });
        if (!user || user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Admin access required",
            });
        }
        const pendingPayments = await server_1.prisma.payment.findMany({
            where: {
                status: "PROCESSING",
                receiptUrl: {
                    not: null,
                },
            },
            include: {
                booking: {
                    include: {
                        property: {
                            select: {
                                id: true,
                                name: true,
                                address: true,
                            },
                        },
                        customer: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
        });
        res.json({
            success: true,
            message: "Pending payments retrieved successfully",
            data: pendingPayments,
            count: pendingPayments.length,
        });
    }
    catch (error) {
        console.error("Pending verification error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve pending payments",
            error: error.message,
        });
    }
});
/**
 * @route   GET /api/v1/payment/receipt/:filename
 * @desc    Get receipt file for viewing
 * @access  Protected (payment owner or admin)
 */
/**
 * @swagger
 * /payment/receipt/{filename}:
 *   get:
 *     summary: View/Download uploaded receipt file
 *     description: |
 *       Retrieve and view an uploaded payment receipt file.
 *       Access is restricted to the payment owner (customer who uploaded) or admin users.
 *       Returns the actual file (image or PDF) for viewing or download.
 *     tags:
 *       - Manual Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         description: Receipt filename (obtained from upload response or pending verification list)
 *         schema:
 *           type: string
 *           example: "receipt-1663234567890-123456789.jpg"
 *     responses:
 *       200:
 *         description: Receipt file returned successfully
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Access denied - not payment owner or admin
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
 *                   example: "Access denied"
 *       404:
 *         description: Receipt file not found
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
 *                   example: "Receipt file not found"
 *       500:
 *         description: Server error
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
 *                   example: "Failed to retrieve receipt"
 */
router.get("/receipt/:filename", (0, authservice_1.requireAuth)(), async (req, res) => {
    try {
        const filename = req.params.filename;
        const userId = req.user.id;
        console.log("Receipt request:", {
            filename,
            userId,
            uploadsDir,
            processDir: process.cwd(),
            environment: process.env.NODE_ENV,
        });
        // Check if user is admin or owns the payment
        const user = await server_1.prisma.user.findUnique({
            where: { id: userId },
        });
        let hasAccess = false;
        let payment = null;
        if (user?.role === "ADMIN") {
            hasAccess = true;
            // Get payment for potential database fallback
            payment = await server_1.prisma.payment.findFirst({
                where: { receiptUrl: filename },
            });
        }
        else {
            // Check if user owns the payment
            payment = await server_1.prisma.payment.findFirst({
                where: {
                    receiptUrl: filename,
                    booking: {
                        customerId: userId,
                    },
                },
            });
            hasAccess = !!payment;
        }
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }
        // PRIORITY 1: Try database storage first (cloud-compatible)
        const gatewayResponse = payment?.gatewayResponse;
        if (gatewayResponse?.receiptBackup) {
            console.log("Serving from database storage (primary method)");
            try {
                const buffer = Buffer.from(gatewayResponse.receiptBackup, "base64");
                const metadata = gatewayResponse.receiptMetadata || {};
                res.set({
                    "Content-Type": metadata.mimeType || "application/octet-stream",
                    "Content-Length": buffer.length.toString(),
                    "Content-Disposition": `inline; filename="${metadata.originalName || filename}"`,
                    "Cache-Control": "private, max-age=3600", // Cache for 1 hour
                });
                return res.send(buffer);
            }
            catch (e) {
                console.error("Error serving from database storage:", e);
                // Continue to file fallback
            }
        }
        // PRIORITY 2: Try multiple possible file paths (development fallback)
        const possiblePaths = [
            path_1.default.join(uploadsDir, filename),
            path_1.default.join(process.cwd(), "uploads", "receipts", filename),
            path_1.default.join(__dirname, "..", "..", "uploads", "receipts", filename),
            path_1.default.join("/tmp", "receipts", filename),
            path_1.default.join("/tmp", "uploads", "receipts", filename),
        ];
        console.log("Database storage not available, checking file paths:", possiblePaths);
        let filePath = null;
        for (const testPath of possiblePaths) {
            if (fs_1.default.existsSync(testPath)) {
                filePath = testPath;
                console.log("Found file at:", filePath);
                break;
            }
        }
        if (!filePath) {
            console.log("Receipt not found in database or file system. Debug info:");
            try {
                if (fs_1.default.existsSync(uploadsDir)) {
                    const files = fs_1.default.readdirSync(uploadsDir);
                    console.log("Upload dir contents:", files);
                }
                else {
                    console.log("Upload directory doesn't exist");
                }
                // Check /tmp directory
                if (fs_1.default.existsSync("/tmp")) {
                    console.log("/tmp exists");
                    if (fs_1.default.existsSync("/tmp/receipts")) {
                        console.log("/tmp/receipts contents:", fs_1.default.readdirSync("/tmp/receipts"));
                    }
                }
            }
            catch (e) {
                console.log("Error checking directories:", e);
            }
            return res.status(404).json({
                success: false,
                message: "Receipt file not found",
                debug: process.env.NODE_ENV === "development"
                    ? {
                        filename,
                        checkedPaths: possiblePaths,
                        uploadsDir,
                        directoryExists: fs_1.default.existsSync(uploadsDir),
                        hasDbBackup: !!payment?.gatewayResponse?.receiptBackup,
                    }
                    : undefined,
            });
        }
        // Send the file with proper headers
        const stats = fs_1.default.statSync(filePath);
        const gatewayResponseData = payment?.gatewayResponse;
        const mimeType = gatewayResponseData?.receiptMetadata?.mimeType ||
            (filename.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
        res.set({
            "Content-Type": mimeType,
            "Content-Length": stats.size.toString(),
            "Cache-Control": "private, max-age=3600",
        });
        res.sendFile(path_1.default.resolve(filePath));
    }
    catch (error) {
        console.error("Receipt retrieval error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve receipt",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
});
/**
 * @route   POST /api/v1/payment/:id/refund/approve
 * @desc    Admin approves refund for BANK_TRANSFER (manual)
 * @access  Protected (admin only)
 */
/**
 * @swagger
 * /payment/{id}/refund/approve:
 *   post:
 *     summary: Approve a refund (BANK_TRANSFER)
 *     description: Admin-only endpoint to approve a pending refund request for a bank transfer payment. Updates refund and payment records; optionally marks booking as REFUNDED.
 *     tags:
 *       - Refunds
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Payment ID to refund
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idempotencyKey:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 64
 *     responses:
 *       200:
 *         description: Refund approved
 *       400:
 *         description: Invalid state or method
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Payment or refund not found
 */
router.post("/:id/refund/approve", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    // Admin check
    const admin = await server_1.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!admin || admin.role !== client_1.UserRole.ADMIN) {
        return res
            .status(403)
            .json({ success: false, message: "Admin access required" });
    }
    const paymentId = req.params.id;
    // Validate body (optional idempotency key)
    try {
        refundApproveSchema.parse(req.body || {});
    }
    catch (e) {
        return res.status(400).json({ success: false, message: e.message });
    }
    // Load payment and refund
    const payment = await server_1.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { booking: { include: { customer: true, property: true } } },
    });
    if (!payment)
        return res
            .status(404)
            .json({ success: false, message: "Payment not found" });
    if (payment.method !== client_1.PaymentMethod.BANK_TRANSFER) {
        return res.status(400).json({
            success: false,
            message: "Refund approval only supported for BANK_TRANSFER",
        });
    }
    // Find pending/processing refund for this payment
    const refund = await server_1.prisma.refund.findFirst({
        where: {
            paymentId: payment.id,
            status: { in: [client_1.RefundStatus.PENDING, client_1.RefundStatus.PROCESSING] },
        },
        orderBy: { createdAt: "desc" },
    });
    if (!refund) {
        return res.status(404).json({
            success: false,
            message: "No pending refund request for this payment",
        });
    }
    // Idempotency: if already refunded, return success
    if (payment.refundStatus === client_1.RefundStatus.REFUNDED ||
        refund.status === client_1.RefundStatus.REFUNDED) {
        return res.json({
            success: true,
            message: "Refund already processed",
            data: { payment, refund },
        });
    }
    const now = new Date();
    const [updatedRefund, updatedPayment, updatedBooking] = await server_1.prisma.$transaction([
        server_1.prisma.refund.update({
            where: { id: refund.id },
            data: {
                status: client_1.RefundStatus.REFUNDED,
                processedBy: admin.id,
                processedAt: now,
                providerResponse: { manual: true },
            },
        }),
        server_1.prisma.payment.update({
            where: { id: payment.id },
            data: {
                refundStatus: client_1.RefundStatus.REFUNDED,
                refundAmount: refund.amount,
                refundCompletedAt: now,
                refundedAt: now,
                status: client_1.PaymentStatus.REFUNDED,
            },
        }),
        // Optional: mark booking as REFUNDED to reflect final state
        server_1.prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: client_1.BookingStatus.REFUNDED },
        }),
    ]);
    // Notify customer (best-effort)
    try {
        await emailservice_1.emailService.sendEmail({
            to: payment.booking.customer.email,
            subject: "Refund Approved",
            html: `
          <p>Dear ${payment.booking.customer.firstName},</p>
          <p>Your refund for booking <strong>${payment.booking.bookingCode || payment.booking.id}</strong> has been approved.</p>
          <p>Amount: ₦${(updatedPayment.refundAmount || refund.amount).toLocaleString()}</p>
          <p>This was a manual refund for a bank transfer payment.</p>
        `,
        });
    }
    catch (e) {
        console.error("Refund approval email failed:", e);
    }
    return res.json({
        success: true,
        message: "Refund approved",
        data: {
            payment: updatedPayment,
            refund: updatedRefund,
            booking: updatedBooking,
        },
    });
}));
/**
 * @route   POST /api/v1/payment/:id/refund/reject
 * @desc    Admin rejects refund for BANK_TRANSFER (manual)
 * @access  Protected (admin only)
 */
/**
 * @swagger
 * /payment/{id}/refund/reject:
 *   post:
 *     summary: Reject a refund (BANK_TRANSFER)
 *     description: Admin-only endpoint to reject a pending refund request for a bank transfer payment.
 *     tags:
 *       - Refunds
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Payment ID whose refund is being rejected
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Refund rejected
 *       400:
 *         description: Invalid state or method
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Payment or refund not found
 */
router.post("/:id/refund/reject", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    // Admin check
    const admin = await server_1.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!admin || admin.role !== client_1.UserRole.ADMIN) {
        return res
            .status(403)
            .json({ success: false, message: "Admin access required" });
    }
    // Validate body
    const parsed = refundRejectSchema.safeParse(req.body || {});
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: parsed.error.errors?.[0]?.message || "Invalid input",
        });
    }
    const { reason } = parsed.data;
    const paymentId = req.params.id;
    const payment = await server_1.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { booking: { include: { customer: true, property: true } } },
    });
    if (!payment)
        return res
            .status(404)
            .json({ success: false, message: "Payment not found" });
    if (payment.method !== client_1.PaymentMethod.BANK_TRANSFER) {
        return res.status(400).json({
            success: false,
            message: "Refund rejection only supported for BANK_TRANSFER",
        });
    }
    const refund = await server_1.prisma.refund.findFirst({
        where: {
            paymentId: payment.id,
            status: { in: [client_1.RefundStatus.PENDING, client_1.RefundStatus.PROCESSING] },
        },
        orderBy: { createdAt: "desc" },
    });
    if (!refund) {
        return res.status(404).json({
            success: false,
            message: "No pending refund request for this payment",
        });
    }
    // Idempotency: if already failed, return success
    if (payment.refundStatus === client_1.RefundStatus.FAILED ||
        refund.status === client_1.RefundStatus.FAILED) {
        return res.json({
            success: true,
            message: "Refund already rejected",
            data: { payment, refund },
        });
    }
    const [updatedRefund, updatedPayment] = await server_1.prisma.$transaction([
        server_1.prisma.refund.update({
            where: { id: refund.id },
            data: {
                status: client_1.RefundStatus.FAILED,
                processedBy: admin.id,
                processedAt: new Date(),
                providerResponse: { manual: true, reason },
            },
        }),
        server_1.prisma.payment.update({
            where: { id: payment.id },
            data: {
                refundStatus: client_1.RefundStatus.FAILED,
                refundFailedReason: reason,
            },
        }),
    ]);
    // Notify customer (best-effort)
    try {
        await emailservice_1.emailService.sendEmail({
            to: payment.booking.customer.email,
            subject: "Refund Rejected",
            html: `
          <p>Dear ${payment.booking.customer.firstName},</p>
          <p>Your refund request for booking <strong>${payment.booking.bookingCode || payment.booking.id}</strong> was rejected.</p>
          <p>Reason: ${reason}</p>
        `,
        });
    }
    catch (e) {
        console.error("Refund rejection email failed:", e);
    }
    return res.json({
        success: true,
        message: "Refund rejected",
        data: { payment: updatedPayment, refund: updatedRefund },
    });
}));
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
 *                 enum: [BANK_TRANSFER]
 *                 example: "BANK_TRANSFER"
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
 *                           example: "BANK_TRANSFER"
 *                         status:
 *                           type: string
 *                           example: "PENDING"
 *                     paymentData:
 *                       type: object
 *                       description: Bank transfer details and instructions.
 *                       example:
 *                         reference: "MAR_bkg_12345_17111223344"
 *                         bank_details:
 *                           bank_name: "First Bank of Nigeria"
 *                           account_number: "1234567890"
 *                           account_name: "MAR ABU PROJECTS SERVICES LLC"
 *                           routing_number: "011151312"
 *                         instructions:
 *                           - "Transfer the exact amount to the account details above"
 *                           - "Use the payment reference as your transfer description"
 *                           - "Upload your payment receipt after transfer"
 *                           - "Payment will be verified within 24 hours"
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
        .custom((v) => v === "BANK_TRANSFER" || v === client_1.PaymentMethod.BANK_TRANSFER)
        .withMessage("Only BANK_TRANSFER is supported currently"),
    (0, express_validator_1.body)("currency")
        .optional()
        .isIn(["NGN", "USD", "GBP", "EUR"])
        .withMessage("Valid currency required"),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { bookingId, paymentMethod, currency = "NGN" } = req.body;
    // Fetch booking with relations
    const booking = await server_1.prisma.booking.findUnique({
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
        throw new error_middleware_2.AppError("Not authorized to pay for this booking", 403);
    }
    if (booking.status !== client_1.BookingStatus.APPROVED) {
        throw new error_middleware_2.AppError("Booking must be approved before payment", 400);
    }
    if (booking.paymentStatus === client_1.PaymentStatus.PAID) {
        throw new error_middleware_2.AppError("Booking is already paid", 400);
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
    let payment = await server_1.prisma.payment.findUnique({ where: { bookingId } });
    if (payment) {
        if (payment.status === client_1.PaymentStatus.PAID) {
            throw new error_middleware_2.AppError("Booking is already paid", 400);
        }
        // Update record for retry
        payment = await server_1.prisma.payment.update({
            where: { id: payment.id },
            data: {
                reference: paymentReference,
                method: paymentMethod,
                status: client_1.PaymentStatus.PENDING,
                amount: booking.total,
                currency,
                gatewayResponse: gatewayMeta,
            },
        });
    }
    else {
        // Fresh payment record
        payment = await server_1.prisma.payment.create({
            data: {
                bookingId,
                userId: booking.customerId,
                amount: booking.total,
                currency,
                method: paymentMethod,
                reference: paymentReference,
                status: client_1.PaymentStatus.PENDING,
                gatewayResponse: gatewayMeta,
            },
        });
    }
    let paymentData = {};
    try {
        switch (paymentMethod) {
            // case PaymentMethod.PAYSTACK:
            //   paymentData = await paystackService.initializePayment({
            //     reference: paymentReference,
            //     amount: booking.total, // Naira → service converts to kobo
            //     email: booking.customer.email,
            //     currency,
            //     callback_url: `${process.env.FRONTEND_URL}/api/v1/payment/callback`,
            //     metadata: { bookingId, paymentId: payment.id, ...gatewayMeta },
            //   });
            //   break;
            // case PaymentMethod.FLUTTERWAVE:
            //   paymentData = await flutterwaveService.initializePayment({
            //     // email: booking.customer.email,
            //     tx_ref: paymentReference,
            //     amount: booking.total,
            //     currency,
            //     redirect_url: `${process.env.FRONTEND_URL}/api/v1/payment/callback?reference=${paymentReference}`,
            //     customer: {
            //       email: booking.customer.email,
            //       name: gatewayMeta.customerName,
            //       // phone: booking.customer.phone, // Ensure phone is available in booking.customer
            //     },
            //     customizations: {
            //       title: "MAR Abu Projects Services",
            //       description: `Payment for booking ${booking.bookingCode}`,
            //       logo: `${process.env.FRONTEND_URL}/logo.png`,
            //     },
            //     meta: { bookingId, paymentId: payment.id },
            //   });
            //   break;
            case client_1.PaymentMethod.BANK_TRANSFER:
                paymentData = {
                    payment_url: null,
                    reference: paymentReference,
                    bank_details: {
                        bank_name: process.env.BANK_NAME,
                        account_number: process.env.ACCOUNT_NUMBER,
                        account_name: process.env.ACCOUNT_NAME,
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
                throw new error_middleware_2.AppError("Payment method not supported. Only BANK_TRANSFER is available.", 400);
        }
        // Update payment with provider response (store both references if available)
        await server_1.prisma.payment.update({
            where: { id: payment.id },
            data: {
                reference: paymentReference,
                transactionId: paymentData.reference || null,
                gatewayResponse: paymentData,
                status: client_1.PaymentStatus.PENDING,
            },
        });
        (0, logger_middleware_1.auditLog)("PAYMENT_INITIALIZED", req.user.id, {
            paymentId: payment.id,
            bookingId,
            amount: booking.total,
            paymentMethod,
            reference: paymentReference,
        }, req.ip);
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
    }
    catch (error) {
        console.error("Payment initialization failed:", error);
        await server_1.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: client_1.PaymentStatus.FAILED,
                gatewayResponse: { error: error.message },
            },
        });
        throw new error_middleware_2.AppError("Failed to initialize payment", 500);
    }
}));
// /**
//  * @route   GET /payment/callback
//  * @desc    Handle Paystack payment callback
//  * @access  Public
//  */
// /**
//  * @swagger
//  * /payment/callback:
//  *   get:
//  *     summary: Verify payment callback (Paystack or Flutterwave)
//  *     description: |
//  *       Called by Paystack or Flutterwave after checkout.
//  *       Verifies the payment using the provider API and updates booking/payment status.
//  *     tags:
//  *       - Payments
//  *     parameters:
//  *       - in: query
//  *         name: reference
//  *         schema: { type: string }
//  *         description: Paystack reference
//  *       - in: query
//  *         name: tx_ref
//  *         schema: { type: string }
//  *         description: Flutterwave reference
//  *       - in: query
//  *         name: transaction_id
//  *         schema: { type: string }
//  *         description: Flutterwave transaction ID (numeric)
//  *     responses:
//  *       200:
//  *         description: Payment verified successfully
//  */
// router.get(
//   "/callback",
//   asyncHandler(async (req: any, res: any) => {
//     const paymentReference = req.query.reference || req.query.tx_ref; // Paystack: reference, Flutterwave: tx_ref
//     const transactionId = req.query.transaction_id; // Flutterwave numeric id
//     if (!paymentReference && !transactionId) {
//       throw new AppError("Missing payment reference or transaction_id", 400);
//     }
//     // Lookup existing payment in DB
//     const existingPayment = await prisma.payment.findUnique({
//       where: { reference: paymentReference },
//       include: { booking: true },
//     });
//     if (!existingPayment) {
//       throw new AppError("Payment not found", 404);
//     }
//     // Already paid?
//     if (existingPayment.status === PaymentStatus.PAID) {
//       return res.json({
//         success: true,
//         message: "Payment already processed",
//       });
//     }
//     let verificationResult: any;
//     switch (existingPayment.method) {
//       case PaymentMethod.PAYSTACK:
//         verificationResult =
//           await paystackService.verifyPayment(paymentReference);
//         break;
//       case PaymentMethod.FLUTTERWAVE: {
//         // ✅ Always use numeric transaction_id for Flutterwave
//         const flwId = transactionId || existingPayment.transactionId;
//         if (!flwId)
//           throw new AppError("Missing Flutterwave transaction id", 400);
//         verificationResult = await flutterwaveService.verifyPayment(flwId);
//         // Store the transaction_id in DB if not already stored
//         if (!existingPayment.transactionId && verificationResult?.data?.id) {
//           await prisma.payment.update({
//             where: { id: existingPayment.id },
//             data: { transactionId: verificationResult.data.id.toString() },
//           });
//         }
//         break;
//       }
//       default:
//         throw new AppError("Unsupported payment method", 400);
//     }
//     // Check if successful
//     const isSuccessful =
//       verificationResult?.data?.status === "success" ||
//       verificationResult?.data?.status === "successful";
//     if (isSuccessful) {
//       // Update Payment record
//       const updatedPayment = await prisma.payment.update({
//         where: { reference: paymentReference },
//         data: {
//           status: PaymentStatus.PAID,
//           gatewayResponse: verificationResult.data ?? verificationResult,
//           transactionId:
//             verificationResult.data?.id?.toString() ??
//             existingPayment.transactionId,
//           paidAt: new Date(
//             verificationResult.data?.paid_at ??
//               verificationResult.data?.created_at ??
//               new Date()
//           ),
//         },
//       });
//       // Update Booking record
//       if (existingPayment.bookingId) {
//         await prisma.booking.update({
//           where: { id: existingPayment.bookingId },
//           data: {
//             status: BookingStatus.CONFIRMED,
//             paymentStatus: PaymentStatus.PAID,
//           },
//         });
//       }
//       auditLog(
//         "PAYMENT_SUCCESS",
//         existingPayment.userId,
//         {
//           paymentId: existingPayment.id,
//           bookingId: existingPayment.bookingId,
//           provider: existingPayment.method,
//         },
//         req.ip
//       );
//       return res.json({
//         success: true,
//         message: "Payment successful",
//         reference: paymentReference,
//       });
//     }
//     // Otherwise mark as failed
//     await prisma.payment.update({
//       where: { reference: paymentReference },
//       data: {
//         status: PaymentStatus.FAILED,
//         gatewayResponse: verificationResult.data ?? verificationResult,
//         failedAt: new Date(),
//       },
//     });
//     if (existingPayment.bookingId) {
//       await prisma.booking.update({
//         where: { id: existingPayment.bookingId },
//         data: { paymentStatus: PaymentStatus.FAILED },
//       });
//     }
//     return res.redirect(
//       `${process.env.FRONTEND_URL}/payment-failed?reference=${paymentReference}`
//     );
//   })
// );
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
        throw new error_middleware_2.AppError("Payment not found", 404);
    }
    // Authorization check
    if (payment.booking.customerId !== req.user.id &&
        req.user.role !== client_1.UserRole.ADMIN) {
        throw new error_middleware_2.AppError("Not authorized to verify this payment", 403);
    }
    let verificationResult = {};
    try {
        // Verify with correct provider
        switch (payment.method) {
            // case PaymentMethod.PAYSTACK:
            //   verificationResult = await paystackService.verifyPayment(reference);
            //   break;
            // case PaymentMethod.FLUTTERWAVE:
            //   verificationResult =
            //     await flutterwaveService.verifyPayment(reference);
            //   break;
            case client_1.PaymentMethod.BANK_TRANSFER:
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
        const isSuccessful = (verificationResult.status === true ||
            verificationResult.status === "success") &&
            (verificationResult.data?.status?.toLowerCase() === "success" ||
                verificationResult.data?.status?.toLowerCase() === "successful");
        if (isSuccessful) {
            // Update payment record
            const updatedPayment = await server_1.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: client_1.PaymentStatus.PAID,
                    paidAt: new Date(),
                    gatewayResponse: verificationResult,
                },
            });
            // Update booking record
            const updatedBooking = await server_1.prisma.booking.update({
                where: { id: payment.bookingId },
                data: {
                    paymentStatus: client_1.PaymentStatus.PAID,
                    paidAmount: payment.amount,
                    paidAt: new Date(),
                },
            });
            // Create notifications
            await Promise.all([
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
                server_1.prisma.notification.create({
                    data: {
                        userId: payment.booking.property.hostId,
                        type: client_1.NotificationType.PAYMENT_RECEIVED,
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
            // Log success
            (0, logger_middleware_1.auditLog)("PAYMENT_VERIFIED", req.user.id, {
                paymentId: payment.id,
                bookingId: payment.bookingId,
                reference,
                amount: payment.amount,
                status: "successful",
            }, req.ip);
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
    catch (error) {
        if (error instanceof error_middleware_2.AppError)
            throw error;
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
// /**
//  * @route   POST /api/v1/payment/webhook/paystack
//  * @desc    Handle Paystack webhook
//  * @access  Public (webhook)
//  */
// /**
//  * @swagger
//  * /webhook/paystack:
//  *   post:
//  *     summary: Paystack webhook endpoint
//  *     description: |
//  *       This endpoint is called by Paystack to notify your system about payment events.
//  *       **Note:** This is an internal webhook endpoint and should not be called directly by clients.
//  *     tags:
//  *       - Webhooks
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               event:
//  *                 type: string
//  *                 example: charge.success
//  *               data:
//  *                 type: object
//  *                 description: Paystack payment data payload
//  *                 example:
//  *                   reference: "7PVGX8MEk85tgeEpVDtD"
//  *                   amount: 500000
//  *                   status: "success"
//  *     parameters:
//  *       - in: header
//  *         name: x-paystack-signature
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Paystack webhook signature for verifying authenticity
//  *     responses:
//  *       200:
//  *         description: Webhook processed successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: true
//  */
// router.post(
//   "/webhook/paystack",
//   asyncHandler(async (req: any, res: any) => {
//     const signature = req.headers["x-paystack-signature"];
//     const body = JSON.stringify(req.body);
//     // 🔐 Verify webhook signature
//     if (!paystackService.verifyWebhookSignature(body, signature)) {
//       auditLog(
//         "WEBHOOK_INVALID_SIGNATURE",
//         "system",
//         { provider: "paystack" },
//         req.ip
//       );
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid webhook signature" });
//     }
//     const { event, data } = req.body;
//     // ✅ Handle payment success
//     if (event === "charge.success" && data?.reference) {
//       const payment = await prisma.payment.findUnique({
//         where: { reference: data.reference },
//         include: { booking: true },
//       });
//       if (!payment) return res.status(200).json({ success: true }); // no-op
//       if (payment.status === PaymentStatus.PAID) {
//         return res.json({ success: true, message: "Already processed" });
//       }
//       await prisma.$transaction([
//         prisma.payment.update({
//           where: { id: payment.id },
//           data: {
//             status: PaymentStatus.PAID,
//             transactionId: data.id?.toString(),
//             gatewayResponse: data,
//             paidAt: new Date(data.paid_at ?? new Date()),
//           },
//         }),
//         prisma.booking.update({
//           where: { id: payment.bookingId },
//           data: {
//             status: BookingStatus.CONFIRMED,
//             paymentStatus: PaymentStatus.PAID,
//           },
//         }),
//       ]);
//       auditLog(
//         "WEBHOOK_PAYMENT_SUCCESS",
//         "system",
//         { paymentId: payment.id, bookingId: payment.bookingId },
//         req.ip
//       );
//       return res.json({ success: true, message: "Payment successful" });
//     }
//     // ✅ Handle refund success
//     if (event === "refund.success" && data?.reference) {
//       const payment = await prisma.payment.findUnique({
//         where: { reference: data.reference },
//       });
//       if (!payment) return res.status(200).json({ success: true });
//       const refund = await prisma.refund.findFirst({
//         where: { paymentId: payment.id },
//       });
//       if (!refund) return res.status(200).json({ success: true });
//       // Idempotency: skip if already refunded
//       if (refund.status === RefundStatus.REFUNDED) {
//         return res.json({ success: true, message: "Refund already processed" });
//       }
//       await prisma.$transaction([
//         prisma.refund.update({
//           where: { id: refund.id },
//           data: {
//             status: RefundStatus.REFUNDED,
//             processedAt: new Date(),
//             providerResponse: data,
//           },
//         }),
//         prisma.payment.update({
//           where: { id: payment.id },
//           data: {
//             refundStatus: RefundStatus.REFUNDED,
//             refundAmount: data.amount / 100,
//             refundCompletedAt: new Date(),
//             refundedAt: new Date(),
//             status: PaymentStatus.REFUNDED,
//           },
//         }),
//       ]);
//       auditLog(
//         "WEBHOOK_REFUND_SUCCESS",
//         "system",
//         { paymentId: payment.id, refundId: refund.id },
//         req.ip
//       );
//       return res.json({ success: true, message: "Refund processed" });
//     }
//     // Always return 200 so Paystack doesn’t retry endlessly
//     res.status(200).json({ success: true });
//   })
// );
// ===============================
// REFUND MANAGEMENT (ADMIN)
// ===============================
// /**
//  * @route   POST /api/v1/payment/webhook/flutterwave
//  * @desc    Handle Flutterwave webhook
//  * @access  Public (webhook)
//  */
// /**
//  * @swagger
//  * /webhook/flutterwave:
//  *   post:
//  *     summary: Flutterwave Webhook
//  *     description: |
//  *       Endpoint to receive and process **Flutterwave webhook events**.
//  *       Currently listens for `charge.completed` events where the status is `successful`.
//  *       On success, updates the related payment and booking records.
//  *
//  *       ⚠️ This endpoint is intended **for Flutterwave servers only**.
//  *       Do not call it manually from your client.
//  *     tags:
//  *       - Webhooks
//  *     requestBody:
//  *       required: true
//  *       description: Webhook payload sent from Flutterwave.
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               event:
//  *                 type: string
//  *                 example: charge.completed
//  *               data:
//  *                 type: object
//  *                 properties:
//  *                   status:
//  *                     type: string
//  *                     example: successful
//  *                   tx_ref:
//  *                     type: string
//  *                     example: FLW-MOCK-123456
//  *                   amount:
//  *                     type: number
//  *                     example: 5000
//  *                   currency:
//  *                     type: string
//  *                     example: NGN
//  *     responses:
//  *       200:
//  *         description: Webhook processed successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: true
//  *       400:
//  *         description: Invalid webhook signature
//  *       500:
//  *         description: Server error while processing webhook
//  */
// router.post(
//   "/webhook/flutterwave",
//   asyncHandler(async (req: any, res: any) => {
//     const signature = req.headers["verif-hash"];
//     const secretHash = process.env.FLW_SECRET_HASH;
//     // 🔐 Verify webhook signature
//     if (!secretHash || signature !== secretHash) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Invalid signature" });
//     }
//     const event = req.body;
//     if (!event || !event.data) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid payload" });
//     }
//     const flwTransactionId = event.data.id?.toString();
//     const txRef = event.data.tx_ref;
//     const status = event.data.status; // "successful", "failed", etc.
//     if (!flwTransactionId || !txRef) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Missing transaction_id or tx_ref" });
//     }
//     // Find payment by tx_ref
//     const payment = await prisma.payment.findUnique({
//       where: { reference: txRef },
//       include: { booking: true },
//     });
//     if (!payment) {
//       console.warn("Webhook received for unknown payment:", txRef);
//       return res
//         .status(404)
//         .json({ success: false, message: "Payment not found" });
//     }
//     // ✅ Handle payment success/failure
//     if (event.event === "charge.completed") {
//       if (payment.status === PaymentStatus.PAID) {
//         return res.json({ success: true, message: "Already processed" });
//       }
//       if (status === "successful") {
//         await prisma.$transaction([
//           prisma.payment.update({
//             where: { id: payment.id },
//             data: {
//               status: PaymentStatus.PAID,
//               transactionId: flwTransactionId,
//               gatewayResponse: event.data,
//               paidAt: new Date(event.data.created_at ?? new Date()),
//             },
//           }),
//           prisma.booking.update({
//             where: { id: payment.bookingId },
//             data: {
//               status: BookingStatus.CONFIRMED,
//               paymentStatus: PaymentStatus.PAID,
//             },
//           }),
//         ]);
//         auditLog(
//           "PAYMENT_SUCCESS",
//           payment.userId,
//           {
//             paymentId: payment.id,
//             bookingId: payment.bookingId,
//             provider: PaymentMethod.FLUTTERWAVE,
//           },
//           req.ip
//         );
//         return res.json({ success: true, message: "Payment successful" });
//       } else {
//         await prisma.payment.update({
//           where: { id: payment.id },
//           data: {
//             status: PaymentStatus.FAILED,
//             transactionId: flwTransactionId,
//             gatewayResponse: event.data,
//             failedAt: new Date(),
//           },
//         });
//         if (payment.bookingId) {
//           await prisma.booking.update({
//             where: { id: payment.bookingId },
//             data: { paymentStatus: PaymentStatus.FAILED },
//           });
//         }
//         return res.json({ success: true, message: "Payment failed" });
//       }
//     }
//     // ✅ Handle refund success
//     if (event.event === "refund.completed" && event.data?.tx_ref) {
//       const refund = await prisma.refund.findFirst({
//         where: { paymentId: payment.id },
//       });
//       if (!refund) return res.status(200).json({ success: true });
//       if (refund.status === RefundStatus.REFUNDED) {
//         return res.json({ success: true, message: "Refund already processed" });
//       }
//       await prisma.$transaction([
//         prisma.refund.update({
//           where: { id: refund.id },
//           data: {
//             status: RefundStatus.REFUNDED,
//             processedAt: new Date(),
//             providerResponse: event.data,
//           },
//         }),
//         prisma.payment.update({
//           where: { id: payment.id },
//           data: {
//             refundStatus: RefundStatus.REFUNDED,
//             refundAmount: event.data.amount,
//             refundCompletedAt: new Date(),
//             refundedAt: new Date(),
//             status: PaymentStatus.REFUNDED,
//           },
//         }),
//       ]);
//       auditLog(
//         "WEBHOOK_REFUND_SUCCESS",
//         "system",
//         { paymentId: payment.id, refundId: refund.id },
//         req.ip
//       );
//       return res.json({ success: true, message: "Refund processed" });
//     }
//     res.status(200).json({ success: true });
//   })
// );
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
router.get("/", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20, status, paymentMethod, bookingId, } = req.query;
    // Build where clause
    const where = {};
    // Role-based access
    if (req.user.role === client_1.UserRole.CUSTOMER) {
        where.booking = { customerId: req.user.id };
    }
    // ADMIN can see all payments, no filter needed
    // else if (req.user.role === UserRole.ADMIN) {
    //   no restrictions
    // }
    // Optional filters
    if (status)
        where.status = status;
    if (paymentMethod)
        where.method = paymentMethod;
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
router.get("/:id", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const payment = await server_1.prisma.payment.findUnique({
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
        throw new error_middleware_2.AppError("Payment not found", 404);
    }
    const { booking } = payment;
    // Authorization: customer, host, or admin
    const isCustomer = booking.customerId === req.user.id;
    const isHost = booking.property.hostId === req.user.id;
    const isAdmin = req.user.role === client_1.UserRole.ADMIN;
    if (!isCustomer && !isHost && !isAdmin) {
        throw new error_middleware_2.AppError("Not authorized to view this payment", 403);
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
}));
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
router.get("/refunds", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20, status = client_1.RefundStatus.PENDING, paymentId, } = req.query;
    // Only pending refunds, eligible
    const where = {};
    if (status)
        where.status = status;
    if (paymentId)
        where.paymentId = paymentId;
    const [refunds, total] = await Promise.all([
        server_1.prisma.refund.findMany({
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
        server_1.prisma.refund.count({ where }),
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
}));
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
router.post("/:id/refund", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    // Fetch payment with related booking and customer
    const payment = await server_1.prisma.payment.findUnique({
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
    if (!payment)
        throw new error_middleware_2.AppError("Payment not found", 404);
    if (payment.status !== client_1.PaymentStatus.PAID)
        throw new error_middleware_2.AppError("Only paid transactions can be refunded", 400);
    // Prevent duplicate/overlapping refund requests (include PENDING)
    const existingRefund = await server_1.prisma.refund.findFirst({
        where: {
            paymentId: payment.id,
            status: {
                in: [
                    client_1.RefundStatus.PENDING,
                    client_1.RefundStatus.PROCESSING,
                    client_1.RefundStatus.REFUNDED,
                ],
            },
        },
    });
    if (existingRefund) {
        throw new error_middleware_2.AppError("Refund already requested, processing, or completed for this payment", 400);
    }
    if (!(0, helpers_1.isRefundAllowed)(payment.booking.checkInDate)) {
        throw new error_middleware_2.AppError("Refund not allowed within 24 hours of check-in.", 400);
    }
    const refundAmount = payment.amount; // full refund (no request body)
    // Create refund request (ADMIN will approve/process via /:id/refund/approve)
    const refund = await server_1.prisma.refund.create({
        data: {
            paymentId: payment.id,
            amount: refundAmount,
            processedBy: req.user.id,
            status: client_1.RefundStatus.PENDING, // awaiting admin approval
        },
    });
    // Mark payment as having a pending refund request
    await server_1.prisma.payment.update({
        where: { id: payment.id },
        data: {
            refundStatus: client_1.RefundStatus.PENDING,
            refundRequestedAt: new Date(),
            refundAmount: refundAmount,
        },
    });
    // Notify admin(s) or log — keep lightweight
    (0, logger_middleware_1.auditLog)("REFUND_REQUESTED", req.user.id, { refundId: refund.id, paymentId: payment.id, amount: refundAmount }, req.ip);
    res.json({
        success: true,
        message: "Refund request created. An admin must approve and process the refund.",
        data: refund,
    });
}));
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
router.post("/refund/:id/approve", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const refundId = req.params.id;
    const refund = await server_1.prisma.refund.findUnique({
        where: { id: refundId },
        include: { payment: true },
    });
    if (!refund || !refund.payment) {
        return res
            .status(404)
            .json({ success: false, message: "Refund not found" });
    }
    if (refund.status === client_1.RefundStatus.REFUNDED) {
        return res.json({ success: true, message: "Refund already processed" });
    }
    if (refund.status !== client_1.RefundStatus.PENDING) {
        return res
            .status(409)
            .json({ success: false, message: "Refund not pending" });
    }
    // Mark as processing
    await server_1.prisma.refund.update({
        where: { id: refund.id },
        data: {
            status: client_1.RefundStatus.PROCESSING,
            processedBy: req.user.id,
            processedAt: new Date(),
        },
    });
    // try {
    //   let providerResponse: any;
    //   let isSuccessful = false;
    //   if (refund.payment.method === PaymentMethod.PAYSTACK) {
    //     // === PAYSTACK FLOW ===
    //     providerResponse = await paystackService.refundPayment(
    //       refund.payment.reference
    //     );
    //     if (providerResponse?.status === true) {
    //       // Refund is initiated, not completed yet
    //       await prisma.refund.update({
    //         where: { id: refund.id },
    //         data: {
    //           status: RefundStatus.PROCESSING,
    //           providerResponse,
    //           processedBy: req.user.id,
    //           processedAt: new Date(),
    //         },
    //       });
    //       await prisma.payment.update({
    //         where: { id: refund.payment.id },
    //         data: { refundStatus: RefundStatus.PROCESSING },
    //       });
    //       return res.json({
    //         success: true,
    //         message: "Refund initiated with Paystack (pending settlement)",
    //         data: providerResponse,
    //       });
    //     }
    //   } else if (refund.payment.method === PaymentMethod.FLUTTERWAVE) {
    //     const flwId = refund.payment.transactionId || refund.payment.reference;
    //     if (!flwId)
    //       throw new AppError("Missing Flutterwave transaction ID", 400);
    //     const resp = await flutterwaveService.refundPayment(flwId);
    //     const provStatus = String(resp?.status || "").toLowerCase();
    //     const dataStatus = String(resp?.data?.status || "").toLowerCase();
    //     const mapped =
    //       provStatus === "success"
    //         ? RefundStatus.PROCESSING
    //         : RefundStatus.FAILED;
    //     await prisma.$transaction([
    //       prisma.refund.update({
    //         where: { id: refund.id },
    //         data: {
    //           status: mapped,
    //           providerResponse: resp,
    //           processedBy: req.user.id,
    //           processedAt: new Date(),
    //           updatedAt: new Date(),
    //         },
    //       }),
    //       prisma.payment.update({
    //         where: { id: refund.payment.id },
    //         data: { refundStatus: mapped },
    //       }),
    //     ]);
    //     return res.status(mapped === RefundStatus.PROCESSING ? 202 : 400).json({
    //       success: mapped !== RefundStatus.FAILED,
    //       message:
    //         mapped === RefundStatus.PROCESSING
    //           ? "Refund initiated with Flutterwave (awaiting webhook confirmation)"
    //           : resp?.message || "Refund initiation failed",
    //       data: resp,
    //     });
    //   }
    //   return res
    //     .status(400)
    //     .json({ success: false, message: "Unsupported payment method" });
    // } catch (err: any) {
    //   const raw = err.response?.data || err;
    //   await prisma.refund.update({
    //     where: { id: refund.id },
    //     data: {
    //       status: RefundStatus.FAILED,
    //       providerResponse: raw,
    //       updatedAt: new Date(),
    //     },
    //   });
    //   return res.status(500).json({
    //     success: false,
    //     message:
    //       raw?.data ||
    //       raw?.message ||
    //       (err as Error).message ||
    //       "Refund processing failed",
    //     error: raw,
    //   });
    // }
}));
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
router.post("/refund/:id/reject", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const refundId = req.params.id;
    const { reason } = refundRejectSchema.parse(req.body);
    const refund = await server_1.prisma.refund.findUnique({
        where: { id: refundId },
        include: { payment: true },
    });
    if (!refund || !refund.payment)
        throw new error_middleware_2.AppError("Refund not found", 404);
    // Only pending/processing refunds
    if (![client_1.RefundStatus.PENDING, client_1.RefundStatus.PROCESSING].includes(refund.status)) {
        return res
            .status(409)
            .json({ success: false, message: "Refund not pending/processing" });
    }
    await server_1.prisma.$transaction([
        server_1.prisma.refund.update({
            where: { id: refund.id },
            data: {
                status: client_1.RefundStatus.FAILED,
                providerResponse: { error: reason },
            },
        }),
        server_1.prisma.payment.update({
            where: { id: refund.payment.id },
            data: {
                refundStatus: client_1.RefundStatus.FAILED,
                refundFailedReason: reason,
            },
        }),
    ]);
    (0, logger_middleware_1.auditLog)("REFUND_REJECTED", req.user.id, { refundId, reason }, req.ip);
    res.json({
        success: true,
        message: "Refund rejected",
    });
}));
exports.default = router;
