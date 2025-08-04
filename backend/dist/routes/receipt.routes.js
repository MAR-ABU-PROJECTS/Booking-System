"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authservice_1 = require("../services/authservice");
const error_middleware_1 = require("../middlewares/error.middleware");
const server_1 = require("../server");
const logger_middleware_1 = require("../middlewares/logger.middleware");
const fileservice_1 = require("../services/fileservice");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
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
router.post("/", (0, authservice_1.requireAuth)(), fileservice_1.uploadMiddleware.receipt, [
    (0, express_validator_1.body)("bookingId").isString(),
    (0, express_validator_1.body)("amount").isFloat({ gt: 0 }),
    (0, express_validator_1.body)("paymentMethod").isString(),
    (0, express_validator_1.body)("bank").optional().isString(),
    (0, express_validator_1.body)("transactionRef").optional().isString(),
    (0, express_validator_1.body)("transactionDate").optional().isISO8601(),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw new error_middleware_1.AppError("Receipt file is required", 400);
    }
    const { bookingId, amount, paymentMethod, bank, transactionRef, transactionDate, } = req.body;
    const booking = await server_1.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            property: { select: { hostId: true } },
        },
    });
    if (!booking)
        throw new error_middleware_1.AppError("Booking not found", 404);
    if (booking.customerId !== req.user.id) {
        throw new error_middleware_1.AppError("Not authorized to upload receipt for this booking", 403);
    }
    const receipt = await server_1.prisma.receipt.create({
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
    (0, logger_middleware_1.auditLog)("RECEIPT_UPLOADED", req.user.id, { receiptId: receipt.id, bookingId }, req.ip);
    res.status(201).json({ success: true, data: receipt });
}));
router.get("/:id", (0, authservice_1.requireAuth)(), [(0, express_validator_1.param)("id").isString()], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const receipt = await server_1.prisma.receipt.findUnique({
        where: { id: req.params.id },
        include: {
            booking: {
                select: { customerId: true, property: { select: { hostId: true } } },
            },
        },
    });
    if (!receipt)
        throw new error_middleware_1.AppError("Receipt not found", 404);
    const userId = req.user.id;
    const role = req.user.role;
    const allowed = receipt.uploadedBy === userId ||
        receipt.booking.customerId === userId ||
        receipt.booking.property.hostId === userId ||
        role === client_1.UserRole.ADMIN;
    if (!allowed) {
        throw new error_middleware_1.AppError("Not authorized to view this receipt", 403);
    }
    res.json({ success: true, data: receipt });
}));
exports.default = router;
