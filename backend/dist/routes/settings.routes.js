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
 * @route   GET /api/v1/settings/system
 * @desc    Get system settings
 * @access  Admin only
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
 * @route   PUT /api/v1/settings/system
 * @desc    Update system settings
 * @access  Super Admin only
 */
router.put("/system", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.body)("settings").isArray().withMessage("Settings array required"),
    (0, express_validator_1.body)("settings.*.key").notEmpty().withMessage("Setting key required"),
    (0, express_validator_1.body)("settings.*.value").notEmpty().withMessage("Setting value required"),
    (0, express_validator_1.body)("settings.*.type")
        .optional()
        .isIn(["string", "number", "boolean", "json"]),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { settings } = req.body;
    // Validate and update each systemSetting
    const updatedSettings = [];
    for (const systemSetting of settings) {
        const { key, value, type = "string", description, category = "general", isPublic = false, } = systemSetting;
        // Validate value based on type
        let processedValue = value;
        if (type === "number") {
            processedValue = parseFloat(value);
            if (isNaN(processedValue)) {
                throw new error_middleware_2.AppError(`Invalid number value for systemSetting ${key}`, 400);
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
            catch (error) {
                throw new error_middleware_2.AppError(`Invalid JSON value for systemSetting ${key}`, 400);
            }
            processedValue = processedValue;
        }
        // Update or create systemSetting
        const updated = await server_1.prisma.systemSetting.upsert({
            where: { key },
            update: {
                value: processedValue,
                dataType: type,
                description,
                category,
            },
            create: {
                key,
                value: processedValue,
                dataType: type,
                description,
                category,
            },
        });
        updatedSettings.push(updated);
    }
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
 * @route   GET /api/v1/settings/public
 * @desc    Get public system settings
 * @access  Public
 */
router.get("/public", (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const publicSettings = await server_1.prisma.systemSetting.findMany({
        where: {
        // Add filter for isPublic if your schema supports it
        },
        select: {
            key: true,
            value: true,
            dataType: true,
            category: true,
        },
    });
    // Group by category
    const groupedSettings = publicSettings.reduce((groups, systemSetting) => {
        const category = systemSetting.category || "general";
        if (!groups[category]) {
            groups[category] = {};
        }
        groups[category][systemSetting.key] = systemSetting.value;
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
 * @route   GET /api/v1/settings/booking
 * @desc    Get booking-related settings
 * @access  Admin only
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
 * @route   PUT /api/v1/settings/booking
 * @desc    Update booking settings
 * @access  Admin only
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
 * @route   GET /api/v1/settings/payment
 * @desc    Get payment settings
 * @access  Admin only
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
 * @route   PUT /api/v1/settings/payment
 * @desc    Update payment settings
 * @access  Super Admin only
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
 * @route   GET /api/v1/settings/email
 * @desc    Get email settings
 * @access  Admin only
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
 * @route   PUT /api/v1/settings/email
 * @desc    Update email settings
 * @access  Super Admin only
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
 * @route   POST /api/v1/settings/email/test
 * @desc    Send test email
 * @access  Admin only
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
 * @route   GET /api/v1/settings/company
 * @desc    Get company information settings
 * @access  Admin only
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
 * @route   PUT /api/v1/settings/company
 * @desc    Update company settings
 * @access  Admin only
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
 * @route   POST /api/v1/settings/maintenance
 * @desc    Enable/disable maintenance mode
 * @access  Super Admin only
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
 * @route   GET /api/v1/settings/backup
 * @desc    Get system backup settings
 * @access  Super Admin only
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
