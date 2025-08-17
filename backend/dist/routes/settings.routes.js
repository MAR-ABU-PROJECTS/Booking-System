"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// MAR ABU PROJECTS SERVICES LLC - System Settings Routes
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const authservice_1 = require("../services/authservice");
const error_middleware_1 = require("../middlewares/error.middleware");
const error_middleware_2 = require("../middlewares/error.middleware");
const server_1 = require("../server");
const logger_middleware_1 = require("../middlewares/logger.middleware");
const emailservice_1 = require("../services/emailservice");
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
// Helper to process value for Prisma
function toInputJsonValue(value) {
    if (typeof value === "boolean" || typeof value === "number")
        return value;
    if (!isNaN(Number(value)))
        return Number(value);
    return value;
}
// ===============================
// SYSTEM SETTINGS (ADMIN ONLY)
// ===============================
/**
 * @route   GET /settings/system
 * @desc    Get system settings
 * @access  Admin only
 */
/**
 * @swagger
 * /settings/system:
 *   get:
 *     summary: Get system settings
 *     description: Retrieve all system settings grouped by category. Only accessible to admin users.
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved system settings
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
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         key:
 *                           type: string
 *                           example: "siteName"
 *                         value:
 *                           type: string
 *                           example: "MAR ABU Projects Services"
 *                         type:
 *                           type: string
 *                           example: "string"
 *                         description:
 *                           type: string
 *                           example: "The name of the platform"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-08-15T12:34:56.000Z"
 *       401:
 *         description: Unauthorized (not logged in or not an admin)
 *       403:
 *         description: Forbidden (user does not have required role)
 *       500:
 *         description: Internal server error
 */
router.get("/system", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const settings = await server_1.prisma.systemSetting.findMany({
        orderBy: { category: "asc" },
    });
    // Group settings by category
    const groupedSettings = settings.reduce((groups, systemSetting) => {
        const category = systemSetting.category || "general";
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push({
            key: systemSetting.key,
            value: systemSetting.value,
            type: systemSetting.dataType,
            description: systemSetting.description,
            updatedAt: systemSetting.updatedAt,
        });
        return groups;
    }, {});
    res.json({
        success: true,
        data: groupedSettings,
    });
}));
/**
 * @route   PUT /settings/system
 * @desc    Update system settings
 * @access  Super Admin only
 */
/**
 * @swagger
 * /settings/system:
 *   put:
 *     summary: Update system settings (Admin only)
 *     tags:
 *       - System Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - key
 *                     - value
 *                   properties:
 *                     key:
 *                       type: string
 *                       example: "site_name"
 *                     value:
 *                       type: string
 *                       example: "My Website"
 *                     type:
 *                       type: string
 *                       enum: [string, number, boolean, json]
 *                       example: "string"
 *                     description:
 *                       type: string
 *                       example: "The name of the website"
 *                     category:
 *                       type: string
 *                       example: "General"
 *     responses:
 *       200:
 *         description: System settings updated successfully
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
 *                   example: "System settings updated successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SystemSetting'
 *       400:
 *         description: Validation or type error
 *       401:
 *         description: Unauthorized
 */
router.put("/system", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.body)("settings").isArray().withMessage("Settings array required"),
    (0, express_validator_1.body)("settings.*.key").notEmpty().withMessage("Setting key required"),
    (0, express_validator_1.body)("settings.*.value").notEmpty().withMessage("Setting value required"),
    (0, express_validator_1.body)("settings.*.type")
        .optional()
        .isIn(["string", "number", "boolean", "json"])
        .withMessage("Invalid type, must be string, number, boolean, or json"),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { settings } = req.body;
    // Process and upsert all settings in a transaction
    const updatedSettings = await server_1.prisma.$transaction(settings.map((systemSetting) => {
        const { key, value, type = "string", description, category = "general", } = systemSetting;
        // Convert value to correct type
        let processedValue = value;
        if (type === "number") {
            processedValue = parseFloat(value);
            if (isNaN(processedValue)) {
                throw new error_middleware_2.AppError(`Invalid number value for ${key}`, 400);
            }
        }
        else if (type === "boolean") {
            processedValue = value === "true" || value === true;
        }
        else if (type === "json") {
            try {
                processedValue =
                    typeof value === "string" ? JSON.parse(value) : value;
            }
            catch {
                throw new error_middleware_2.AppError(`Invalid JSON value for ${key}`, 400);
            }
        }
        return server_1.prisma.systemSetting.upsert({
            where: { key },
            update: {
                value: processedValue,
                dataType: type,
                description,
                category,
                updatedBy: req.user.id,
            },
            create: {
                key,
                value: processedValue,
                dataType: type,
                description,
                category,
                updatedBy: req.user.id,
            },
        });
    }));
    // Log audit
    (0, logger_middleware_1.auditLog)("SYSTEM_SETTINGS_UPDATED", req.user.id, {
        settingsCount: settings.length,
        settings: settings.map((s) => ({ key: s.key, value: s.value })),
    }, req.ip);
    res.json({
        success: true,
        message: "System settings updated successfully",
        data: updatedSettings,
    });
}));
/**
 * @route   GET /settings/public
 * @desc    Get public system settings
 * @access  Public
 */
/**
 * @swagger
 * /settings/public:
 *   get:
 *     summary: Get public system settings (no authentication required)
 *     tags:
 *       - System Settings
 *     responses:
 *       200:
 *         description: Public system settings grouped by category
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
 *                   additionalProperties:
 *                     type: object
 *                     additionalProperties:
 *                       type: object
 */
router.get("/public", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const publicSettings = await server_1.prisma.systemSetting.findMany({
        where: {
            isPublic: true
        },
        select: {
            key: true,
            value: true,
            dataType: true,
            category: true,
        },
    });
    // Group settings by category
    const groupedSettings = publicSettings.reduce((groups, setting) => {
        const category = setting.category || "general";
        if (!groups[category]) {
            groups[category] = {};
        }
        groups[category][setting.key] = setting.value;
        return groups;
    }, {});
    res.json({
        success: true,
        data: groupedSettings,
    });
}));
// ===============================
// BOOKING SETTINGS
// ===============================
/**
 * @route   GET /settings/booking
 * @desc    Get booking-related settings
 * @access  Admin only
 */
/**
 * @swagger
 * /settings/booking:
 *   get:
 *     summary: Get booking-related system settings
 *     description: Returns booking-specific settings, with defaults applied if not set.
 *     tags:
 *       - System Settings
 *     security:
 *       - bearerAuth: []   # Admin access required
 *     responses:
 *       200:
 *         description: Booking settings retrieved successfully
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
 *                     defaultServiceFeePercentage:
 *                       type: number
 *                       example: 10
 *                     maxAdvanceBookingDays:
 *                       type: number
 *                       example: 365
 *                     minAdvanceBookingHours:
 *                       type: number
 *                       example: 24
 *                     cancellationGracePeriodHours:
 *                       type: number
 *                       example: 24
 *                     autoApprovalEnabled:
 *                       type: boolean
 *                       example: false
 *                     instantBookingEnabled:
 *                       type: boolean
 *                       example: true
 *                     requireHostApproval:
 *                       type: boolean
 *                       example: true
 *                     maxGuestsPerBooking:
 *                       type: number
 * example:
 *   success: true
 *   data:
 *     defaultServiceFeePercentage: 10
 *     maxAdvanceBookingDays: 365
 *     minAdvanceBookingHours: 24
 *     cancellationGracePeriodHours: 24
 *     autoApprovalEnabled: false
 *     instantBookingEnabled: true
 *     requireHostApproval: true
 *     maxGuestsPerBooking: 16
 */
router.get("/booking", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const bookingSettings = await server_1.prisma.systemSetting.findMany({
        where: { category: "booking" },
    });
    const settings = bookingSettings.reduce((acc, systemSetting) => {
        acc[systemSetting.key] = systemSetting.value;
        return acc;
    }, {});
    // Set defaults if not found
    const defaultSettings = {
        defaultServiceFeePercentage: 10,
        maxAdvanceBookingDays: 365,
        minAdvanceBookingHours: 24,
        cancellationGracePeriodHours: 24,
        autoApprovalEnabled: false,
        instantBookingEnabled: true,
        requireHostApproval: true,
        maxGuestsPerBooking: 16,
        ...settings,
    };
    res.json({
        success: true,
        data: defaultSettings,
    });
}));
/**
 * @route   PUT /settings/booking
 * @desc    Update booking settings
 * @access  Admin only
 */
/**
 * @swagger
 * /settings/booking:
 *   put:
 *     summary: Update booking-related system settings
 *     description: Admin-only route to update booking settings.
 *     tags:
 *       - System Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               defaultServiceFeePercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 50
 *               maxAdvanceBookingDays:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 730
 *               minAdvanceBookingHours:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 168
 *               cancellationGracePeriodHours:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 168
 *               autoApprovalEnabled:
 *                 type: boolean
 *               instantBookingEnabled:
 *                 type: boolean
 *               requireHostApproval:
 *                 type: boolean
 *               maxGuestsPerBooking:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *     responses:
 *       200:
 *         description: Booking settings updated successfully
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
 *                   example: Booking settings updated successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SystemSetting'
 */
router.put("/booking", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.body)("defaultServiceFeePercentage").optional().isFloat({ min: 0, max: 50 }),
    (0, express_validator_1.body)("maxAdvanceBookingDays").optional().isInt({ min: 1, max: 730 }),
    (0, express_validator_1.body)("minAdvanceBookingHours").optional().isInt({ min: 0, max: 168 }),
    (0, express_validator_1.body)("cancellationGracePeriodHours").optional().isInt({ min: 0, max: 168 }),
    (0, express_validator_1.body)("autoApprovalEnabled").optional().isBoolean(),
    (0, express_validator_1.body)("instantBookingEnabled").optional().isBoolean(),
    (0, express_validator_1.body)("requireHostApproval").optional().isBoolean(),
    (0, express_validator_1.body)("maxGuestsPerBooking").optional().isInt({ min: 1, max: 50 }),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const settingsToUpdate = req.body;
    const updatedSettings = [];
    for (const [key, value] of Object.entries(settingsToUpdate)) {
        const processedValue = toInputJsonValue(value);
        const updated = await server_1.prisma.systemSetting.upsert({
            where: { key },
            update: {
                value: processedValue,
                category: "booking",
                dataType: typeof value === "boolean" ? "boolean" : "number",
            },
            create: {
                key,
                value: processedValue,
                category: "booking",
                dataType: typeof value === "boolean" ? "boolean" : "number",
            },
        });
        updatedSettings.push(updated);
    }
    (0, logger_middleware_1.auditLog)("BOOKING_SETTINGS_UPDATED", req.user.id, {
        settings: settingsToUpdate,
    }, req.ip);
    res.json({
        success: true,
        message: "Booking settings updated successfully",
        data: updatedSettings,
    });
}));
/**
 * @route   GET /settings/payment
 * @desc    Get payment settings
 * @access  Admin only
 */
/**
 * @swagger
 * /settings/payment:
 *   get:
 *     summary: Get payment-related system settings
 *     description: Admin-only route to retrieve all payment-related settings from the system.
 *     tags:
 *       - System Settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment settings retrieved successfully
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
 *                   additionalProperties: true
 *                   example:
 *                     defaultPaymentGateway: "stripe"
 *                     maxTransactionAmount: 100000
 *                     allowPartialPayments: true
 */
router.get("/payment", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const paymentSettings = await server_1.prisma.systemSetting.findMany({
        where: { category: "payment" },
    });
    const settings = paymentSettings.reduce((acc, systemSetting) => {
        acc[systemSetting.key] = systemSetting.value;
        return acc;
    }, {});
    res.json({
        success: true,
        data: settings,
    });
}));
/**
 * @route   PUT /settings/payment
 * @desc    Update payment settings
 * @access  Super Admin only
 */
/**
 * @swagger
 * /settings/payment:
 *   put:
 *     summary: Update payment-related system settings
 *     description: Admin-only route to update payment configuration settings. Sensitive keys are not returned in the response.
 *     tags:
 *       - System Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Payment settings to update
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paystackEnabled:
 *                 type: boolean
 *                 example: true
 *               flutterwaveEnabled:
 *                 type: boolean
 *                 example: false
 *               bankTransferEnabled:
 *                 type: boolean
 *                 example: true
 *               paystackPublicKey:
 *                 type: string
 *                 example: "pk_test_xxxxx"
 *               flutterwavePublicKey:
 *                 type: string
 *                 example: "FLWPUBK_TEST-xxxx"
 *               defaultCurrency:
 *                 type: string
 *                 enum: [NGN, USD, GBP, EUR]
 *                 example: "NGN"
 *               paymentTimeoutMinutes:
 *                 type: integer
 *                 minimum: 5
 *                 maximum: 1440
 *                 example: 15
 *     responses:
 *       200:
 *         description: Payment settings updated successfully
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
 *                   example: "Payment settings updated successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                         example: "paystackEnabled"
 *                       value:
 *                         type: boolean
 *                         example: true
 *                       dataType:
 *                         type: string
 *                         example: "boolean"
 *                       category:
 *                         type: string
 *                         example: "payment"
 *                       updatedBy:
 *                         type: string
 *                         example: "adminUserId"
 */
router.put("/payment", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.body)("paystackEnabled").optional().isBoolean(),
    (0, express_validator_1.body)("flutterwaveEnabled").optional().isBoolean(),
    (0, express_validator_1.body)("bankTransferEnabled").optional().isBoolean(),
    (0, express_validator_1.body)("paystackPublicKey").optional().isString(),
    (0, express_validator_1.body)("flutterwavePublicKey").optional().isString(),
    (0, express_validator_1.body)("defaultCurrency").optional().isIn(["NGN", "USD", "GBP", "EUR"]),
    (0, express_validator_1.body)("paymentTimeoutMinutes").optional().isInt({ min: 5, max: 1440 }),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const settingsToUpdate = req.body;
    // Sensitive keys that should not be returned in response
    const sensitiveKeys = ["paystackSecretKey", "flutterwaveSecretKey"];
    const updatedSettings = [];
    for (const [key, value] of Object.entries(settingsToUpdate)) {
        const processedValue = toInputJsonValue(value);
        const updated = await server_1.prisma.systemSetting.upsert({
            where: { key },
            update: {
                value: processedValue,
                category: "payment",
                dataType: typeof value === "boolean" ? "boolean" : "string",
            },
            create: {
                key,
                value: processedValue,
                category: "payment",
                dataType: typeof value === "boolean" ? "boolean" : "string",
            },
        });
        // Don't return sensitive keys in response
        if (!sensitiveKeys.includes(key)) {
            updatedSettings.push(updated);
        }
    }
    (0, logger_middleware_1.auditLog)("PAYMENT_SETTINGS_UPDATED", req.user.id, {
        settingsUpdated: Object.keys(settingsToUpdate),
    }, req.ip);
    res.json({
        success: true,
        message: "Payment settings updated successfully",
        data: updatedSettings,
    });
}));
// ===============================
// EMAIL SETTINGS
// ===============================
/**
 * @route   GET /settings/email
 * @desc    Get email settings
 * @access  Admin only
 */
/**
 * @swagger
 * /settings/email:
 *   get:
 *     summary: Get email-related system settings
 *     description: Admin-only route to retrieve email configuration settings. Sensitive credentials are hidden in the response.
 *     tags:
 *       - System Settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email settings retrieved successfully
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
 *                   description: Key-value pairs of email settings. Sensitive keys are masked.
 *                   example:
 *                     smtpHost: "smtp.mailtrap.io"
 *                     smtpPort: 587
 *                     smtpUser: "user@example.com"
 *                     smtpPassword: "***HIDDEN***"
 *                     emailApiKey: "***HIDDEN***"
 */
router.get("/email", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const emailSettings = await server_1.prisma.systemSetting.findMany({
        where: { category: "email" },
    });
    const settings = emailSettings.reduce((acc, systemSetting) => {
        acc[systemSetting.key] = systemSetting.value;
        return acc;
    }, {});
    // Don't return sensitive SMTP credentials
    const sensitiveKeys = ["smtpPassword", "emailApiKey"];
    sensitiveKeys.forEach((key) => {
        if (settings[key]) {
            settings[key] = "***HIDDEN***";
        }
    });
    res.json({
        success: true,
        data: settings,
    });
}));
/**
 * @route   PUT /settings/email
 * @desc    Update email settings
 * @access  Super Admin only
 */
/**
 * @swagger
 * /settings/email:
 *   put:
 *     summary: Update email-related system settings
 *     description: Admin-only route to update email configuration settings such as SMTP or email provider options.
 *     tags:
 *       - System Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailEnabled:
 *                 type: boolean
 *                 example: true
 *               smtpHost:
 *                 type: string
 *                 example: "smtp.mailtrap.io"
 *               smtpPort:
 *                 type: integer
 *                 example: 587
 *               smtpUsername:
 *                 type: string
 *                 example: "user@example.com"
 *               smtpPassword:
 *                 type: string
 *                 example: "supersecret"
 *               fromEmail:
 *                 type: string
 *                 format: email
 *                 example: "no-reply@example.com"
 *               fromName:
 *                 type: string
 *                 example: "Support Team"
 *               replyToEmail:
 *                 type: string
 *                 format: email
 *                 example: "support@example.com"
 *               emailProvider:
 *                 type: string
 *                 enum: ["smtp", "sendgrid", "mailgun"]
 *                 example: "smtp"
 *     responses:
 *       200:
 *         description: Email settings updated successfully
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
 *                   example: "Email settings updated successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                       value:
 *                         type: string
 *                       dataType:
 *                         type: string
 *                       category:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 */
router.put("/email", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.body)("emailEnabled").optional().isBoolean(),
    (0, express_validator_1.body)("smtpHost").optional().isString(),
    (0, express_validator_1.body)("smtpPort").optional().isInt({ min: 1, max: 65535 }),
    (0, express_validator_1.body)("smtpUsername").optional().isString(),
    (0, express_validator_1.body)("smtpPassword").optional().isString(),
    (0, express_validator_1.body)("fromEmail").optional().isEmail(),
    (0, express_validator_1.body)("fromName").optional().isString(),
    (0, express_validator_1.body)("replyToEmail").optional().isEmail(),
    (0, express_validator_1.body)("emailProvider").optional().isIn(["smtp", "sendgrid", "mailgun"]),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const settingsToUpdate = req.body;
    const updatedSettings = [];
    for (const [key, value] of Object.entries(settingsToUpdate)) {
        const processedValue = toInputJsonValue(value);
        const updated = await server_1.prisma.systemSetting.upsert({
            where: { key },
            update: {
                value: processedValue,
                category: "email",
                dataType: typeof value === "boolean"
                    ? "boolean"
                    : typeof value === "number"
                        ? "number"
                        : "string",
            },
            create: {
                key,
                value: processedValue,
                category: "email",
                dataType: typeof value === "boolean"
                    ? "boolean"
                    : typeof value === "number"
                        ? "number"
                        : "string",
            },
        });
        updatedSettings.push(updated);
    }
    (0, logger_middleware_1.auditLog)("EMAIL_SETTINGS_UPDATED", req.user.id, {
        settingsUpdated: Object.keys(settingsToUpdate),
    }, req.ip);
    res.json({
        success: true,
        message: "Email settings updated successfully",
        data: updatedSettings,
    });
}));
/**
 * @route   POST /settings/email/test
 * @desc    Send test email
 * @access  Admin only
 */
/**
 * @swagger
 * /settings/email/test:
 *   post:
 *     summary: Send a test email
 *     description: Admin-only route to send a test email to verify email configuration.
 *     tags:
 *       - System Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@example.com"
 *     responses:
 *       200:
 *         description: Test email sent successfully
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
 *                   example: "Test email sent successfully"
 *       500:
 *         description: Failed to send test email
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
 *                   example: "Failed to send test email"
 */
router.post("/email/test", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [(0, express_validator_1.body)("email").isEmail().withMessage("Valid email address required")], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    try {
        await emailservice_1.emailService.sendTestEmail(email, {
            recipientName: req.user.firstName || "Administrator",
            testDate: new Date().toISOString(),
            systemName: "MAR Abu Projects Services",
        });
        (0, logger_middleware_1.auditLog)("TEST_EMAIL_SENT", req.user.id, {
            recipientEmail: email,
        }, req.ip);
        res.json({
            success: true,
            message: "Test email sent successfully",
        });
    }
    catch (error) {
        throw new error_middleware_2.AppError("Failed to send test email", 500);
    }
}));
/**
 * @route   GET /settings/company
 * @desc    Get company information settings
 * @access  Admin only
 */
/**
 * @swagger
 * /settings/company:
 *   get:
 *     summary: Get company settings
 *     description: Admin-only route to fetch all company-related settings, with default values if not set.
 *     tags:
 *       - System Settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company settings retrieved successfully
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
 *                     companyName:
 *                       type: string
 *                       example: "MAR Abu Projects Services LLC"
 *                     companyEmail:
 *                       type: string
 *                       example: "info@marabuprojects.com"
 *                     companyPhone:
 *                       type: string
 *                       example: "+234-XXX-XXX-XXXX"
 *                     companyAddress:
 *                       type: string
 *                       example: "Nigeria"
 *                     companyWebsite:
 *                       type: string
 *                       example: "https://marabuprojects.com"
 *                     supportEmail:
 *                       type: string
 *                       example: "support@marabuprojects.com"
 *                     termsUrl:
 *                       type: string
 *                       example: "/terms"
 *                     privacyUrl:
 *                       type: string
 *                       example: "/privacy"
 *                     aboutUrl:
 *                       type: string
 *                       example: "/about"
 */
router.get("/company", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const companySettings = await server_1.prisma.systemSetting.findMany({
        where: { category: "company" },
    });
    const settings = companySettings.reduce((acc, systemSetting) => {
        acc[systemSetting.key] = systemSetting.value;
        return acc;
    }, {});
    // Set defaults
    const defaultSettings = {
        companyName: "MAR Abu Projects Services LLC",
        companyEmail: "info@marabuprojects.com",
        companyPhone: "+234-XXX-XXX-XXXX",
        companyAddress: "Nigeria",
        companyWebsite: "https://marabuprojects.com",
        supportEmail: "support@marabuprojects.com",
        termsUrl: "/terms",
        privacyUrl: "/privacy",
        aboutUrl: "/about",
        ...settings,
    };
    res.json({
        success: true,
        data: defaultSettings,
    });
}));
/**
 * @route   PUT /settings/company
 * @desc    Update company settings
 * @access  Admin only
 */
/**
 * @swagger
 * /settings/company:
 *   put:
 *     summary: Update company settings
 *     description: Admin-only route to update company-related settings.
 *     tags:
 *       - System Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Company settings to update
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *                 example: "MAR Abu Projects Services LLC"
 *               companyEmail:
 *                 type: string
 *                 format: email
 *                 example: "info@marabuprojects.com"
 *               companyPhone:
 *                 type: string
 *                 example: "+234-XXX-XXX-XXXX"
 *               companyAddress:
 *                 type: string
 *                 example: "Nigeria"
 *               companyWebsite:
 *                 type: string
 *                 format: uri
 *                 example: "https://marabuprojects.com"
 *               supportEmail:
 *                 type: string
 *                 format: email
 *                 example: "support@marabuprojects.com"
 *               termsUrl:
 *                 type: string
 *                 example: "/terms"
 *               privacyUrl:
 *                 type: string
 *                 example: "/privacy"
 *               aboutUrl:
 *                 type: string
 *                 example: "/about"
 *               companyLogo:
 *                 type: string
 *                 format: uri
 *                 example: "https://marabuprojects.com/logo.png"
 *               companyDescription:
 *                 type: string
 *                 example: "Leading property management service in Nigeria."
 *     responses:
 *       200:
 *         description: Company settings updated successfully
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
 *                   example: "Company settings updated successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                       value:
 *                         type: string
 *                       category:
 *                         type: string
 *                       dataType:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 */
router.put("/company", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.body)("companyName").optional().isString(),
    (0, express_validator_1.body)("companyEmail").optional().isEmail(),
    (0, express_validator_1.body)("companyPhone").optional().isString(),
    (0, express_validator_1.body)("companyAddress").optional().isString(),
    (0, express_validator_1.body)("companyWebsite").optional().isURL(),
    (0, express_validator_1.body)("supportEmail").optional().isEmail(),
    (0, express_validator_1.body)("termsUrl").optional().isString(),
    (0, express_validator_1.body)("privacyUrl").optional().isString(),
    (0, express_validator_1.body)("aboutUrl").optional().isString(),
    (0, express_validator_1.body)("companyLogo").optional().isURL(),
    (0, express_validator_1.body)("companyDescription").optional().isString(),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const settingsToUpdate = req.body;
    const updatedSettings = [];
    for (const [key, value] of Object.entries(settingsToUpdate)) {
        const isPublic = [
            "companyName",
            "companyWebsite",
            "supportEmail",
            "termsUrl",
            "privacyUrl",
            "aboutUrl",
            "companyLogo",
        ].includes(key);
        const processedValue = toInputJsonValue(value);
        const updated = await server_1.prisma.systemSetting.upsert({
            where: { key },
            update: {
                value: processedValue,
                category: "company",
                dataType: "string",
                // isPublic,
            },
            create: {
                key,
                value: processedValue,
                category: "company",
                dataType: "string",
                // isPublic,
            },
        });
        updatedSettings.push(updated);
    }
    (0, logger_middleware_1.auditLog)("COMPANY_SETTINGS_UPDATED", req.user.id, {
        settings: settingsToUpdate,
    }, req.ip);
    res.json({
        success: true,
        message: "Company settings updated successfully",
        data: updatedSettings,
    });
}));
// ===============================
// MAINTENANCE MODE
// ===============================
/**
 * @route   POST /settings/maintenance
 * @desc    Enable/disable maintenance mode
 * @access  Super Admin only
 */
/**
 * @swagger
 * /settings/maintenance:
 *   post:
 *     summary: Enable or disable maintenance mode
 *     description: Admin-only route to toggle system maintenance mode and optionally provide a message and estimated end time.
 *     tags:
 *       - System Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Maintenance mode settings
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 example: true
 *               message:
 *                 type: string
 *                 example: "The system will be down for maintenance."
 *               estimatedEnd:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-08-20T18:30:00Z"
 *     responses:
 *       200:
 *         description: Maintenance mode updated successfully
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
 *                   example: "Maintenance mode enabled"
 *                 data:
 *                   type: object
 *                   properties:
 *                     maintenanceMode:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "The system will be down for maintenance."
 *                     estimatedEnd:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-20T18:30:00Z"
 */
router.post("/maintenance", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.body)("enabled").isBoolean().withMessage("Maintenance mode status required"),
    (0, express_validator_1.body)("message").optional().isString(),
    (0, express_validator_1.body)("estimatedEnd").optional().isISO8601(),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { enabled, message, estimatedEnd } = req.body;
    // Update maintenance mode settings
    await Promise.all([
        server_1.prisma.systemSetting.upsert({
            where: { key: "maintenanceMode" },
            update: { value: enabled, category: "system", dataType: "boolean" },
            create: {
                key: "maintenanceMode",
                value: enabled,
                category: "system",
                dataType: "boolean",
            },
        }),
        message &&
            server_1.prisma.systemSetting.upsert({
                where: { key: "maintenanceMessage" },
                update: { value: message, category: "system", dataType: "string" },
                create: {
                    key: "maintenanceMessage",
                    value: message,
                    category: "system",
                    dataType: "string",
                },
            }),
        estimatedEnd &&
            server_1.prisma.systemSetting.upsert({
                where: { key: "maintenanceEstimatedEnd" },
                update: {
                    value: estimatedEnd,
                    category: "system",
                    dataType: "string",
                },
                create: {
                    key: "maintenanceEstimatedEnd",
                    value: estimatedEnd,
                    category: "system",
                    dataType: "string",
                },
            }),
    ].filter(Boolean));
    (0, logger_middleware_1.auditLog)("MAINTENANCE_MODE_TOGGLED", req.user.id, {
        enabled,
        message,
        estimatedEnd,
    }, req.ip);
    res.json({
        success: true,
        message: `Maintenance mode ${enabled ? "enabled" : "disabled"}`,
        data: {
            maintenanceMode: enabled,
            message,
            estimatedEnd,
        },
    });
}));
/**
 * @route   GET /settings/backup
 * @desc    Get system backup settings
 * @access  Super Admin only
 */
/**
 * @swagger
 * /settings/backup:
 *   get:
 *     summary: Get backup system settings and status
 *     description: Admin-only route to retrieve backup-related settings and the current backup status.
 *     tags:
 *       - System Settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup settings and status retrieved successfully
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
 *                     lastBackup:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *                     nextScheduled:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-16T10:30:00Z"
 *                     status:
 *                       type: string
 *                       example: "healthy"
 *                     size:
 *                       type: string
 *                       example: "2.4GB"
 *                     location:
 *                       type: string
 *                       example: "AWS S3"
 */
router.get("/backup", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    // Get backup-related settings
    const backupSettings = await server_1.prisma.systemSetting.findMany({
        where: { category: "backup" },
    });
    const settings = backupSettings.reduce((acc, systemSetting) => {
        acc[systemSetting.key] = systemSetting.value;
        return acc;
    }, {});
    // Mock backup status (in a real system, this would check actual backup status)
    const backupStatus = {
        lastBackup: "2024-01-15T10:30:00Z",
        nextScheduled: "2024-01-16T10:30:00Z",
        status: "healthy",
        size: "2.4GB",
        location: "AWS S3",
        ...settings,
    };
    res.json({
        success: true,
        data: backupStatus,
    });
}));
exports.default = router;
