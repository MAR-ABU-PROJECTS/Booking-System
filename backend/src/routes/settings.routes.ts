// MAR ABU PROJECTS SERVICES LLC - System Settings Routes
import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import { Prisma, UserRole } from "@prisma/client";
import { requireAuth } from "../services/authservice";
import { asyncHandler } from "../middlewares/error.middleware";
import { AppError } from "../middlewares/error.middleware";
import { prisma } from "../server";
import { auditLog } from "../middlewares/logger.middleware";
import { emailService } from "../services/emailservice";

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

// Helper to process value for Prisma
function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (!isNaN(Number(value))) return Number(value);
  return value as string;
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
router.get(
  "/system",
  requireAuth({ role: UserRole.ADMIN }),
  asyncHandler(async (req: any, res: any) => {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { category: "asc" },
    });

    // Group settings by category
    const groupedSettings = settings.reduce(
      (groups, systemSetting) => {
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
      },
      {} as Record<string, any[]>
    );

    res.json({
      success: true,
      data: groupedSettings,
    });
  })
);

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
router.put(
  "/system",
  requireAuth({ role: UserRole.ADMIN }),
  [
    body("settings").isArray().withMessage("Settings array required"),
    body("settings.*.key").notEmpty().withMessage("Setting key required"),
    body("settings.*.value").notEmpty().withMessage("Setting value required"),
    body("settings.*.type")
      .optional()
      .isIn(["string", "number", "boolean", "json"])
      .withMessage("Invalid type, must be string, number, boolean, or json"),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { settings } = req.body;

    // Process and upsert all settings in a transaction
    const updatedSettings = await prisma.$transaction(
      settings.map((systemSetting: any) => {
        const {
          key,
          value,
          type = "string",
          description,
          category = "general",
        } = systemSetting;

        // Convert value to correct type
        let processedValue: Prisma.InputJsonValue = value;
        if (type === "number") {
          processedValue = parseFloat(value);
          if (isNaN(processedValue)) {
            throw new AppError(`Invalid number value for ${key}`, 400);
          }
        } else if (type === "boolean") {
          processedValue = value === "true" || value === true;
        } else if (type === "json") {
          try {
            processedValue =
              typeof value === "string" ? JSON.parse(value) : value;
          } catch {
            throw new AppError(`Invalid JSON value for ${key}`, 400);
          }
        }

        return prisma.systemSetting.upsert({
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
      })
    );

    // Log audit
    auditLog(
      "SYSTEM_SETTINGS_UPDATED",
      req.user.id,
      {
        settingsCount: settings.length,
        settings: settings.map((s: any) => ({ key: s.key, value: s.value })),
      },
      req.ip
    );

    res.json({
      success: true,
      message: "System settings updated successfully",
      data: updatedSettings,
    });
  })
);

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
router.get(
  "/public",
  asyncHandler(async (req: any, res: any) => {
    const publicSettings = await prisma.systemSetting.findMany({
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
    }, {} as Record<string, Record<string, any>>);

    res.json({
      success: true,
      data: groupedSettings,
    });
  })
);

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
router.get(
  "/booking",
  requireAuth({ role: UserRole.ADMIN }),
  asyncHandler(async (req: any, res: any) => {
    const bookingSettings = await prisma.systemSetting.findMany({
      where: { category: "booking" },
    });

    const settings = bookingSettings.reduce((acc, systemSetting) => {
      acc[systemSetting.key] = systemSetting.value;
      return acc;
    }, {} as Record<string, any>);

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
  })
);

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
router.put(
  "/booking",
  requireAuth({ role: UserRole.ADMIN }),
  [
    body("defaultServiceFeePercentage").optional().isFloat({ min: 0, max: 50 }),
    body("maxAdvanceBookingDays").optional().isInt({ min: 1, max: 730 }),
    body("minAdvanceBookingHours").optional().isInt({ min: 0, max: 168 }),
    body("cancellationGracePeriodHours").optional().isInt({ min: 0, max: 168 }),
    body("autoApprovalEnabled").optional().isBoolean(),
    body("instantBookingEnabled").optional().isBoolean(),
    body("requireHostApproval").optional().isBoolean(),
    body("maxGuestsPerBooking").optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const settingsToUpdate = req.body;

    const updatedSettings = [];
    for (const [key, value] of Object.entries(settingsToUpdate)) {
      const processedValue = toInputJsonValue(value);

      const updated = await prisma.systemSetting.upsert({
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

    auditLog(
      "BOOKING_SETTINGS_UPDATED",
      req.user.id,
      {
        settings: settingsToUpdate,
      },
      req.ip
    );

    res.json({
      success: true,
      message: "Booking settings updated successfully",
      data: updatedSettings,
    });
  })
);

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
router.get(
  "/payment",
  requireAuth({ role: UserRole.ADMIN }),
  asyncHandler(async (req: any, res: any) => {
    const paymentSettings = await prisma.systemSetting.findMany({
      where: { category: "payment" },
    });

    const settings = paymentSettings.reduce(
      (acc, systemSetting) => {
        acc[systemSetting.key] = systemSetting.value;
        return acc;
      },
      {} as Record<string, any>
    );

    res.json({
      success: true,
      data: settings,
    });
  })
);

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
router.put(
  "/payment",
  requireAuth({ role: UserRole.ADMIN }),
  [
    body("paystackEnabled").optional().isBoolean(),
    body("flutterwaveEnabled").optional().isBoolean(),
    body("bankTransferEnabled").optional().isBoolean(),
    body("paystackPublicKey").optional().isString(),
    body("flutterwavePublicKey").optional().isString(),
    body("defaultCurrency").optional().isIn(["NGN", "USD", "GBP", "EUR"]),
    body("paymentTimeoutMinutes").optional().isInt({ min: 5, max: 1440 }),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const settingsToUpdate = req.body;

    // Sensitive keys that should not be returned in response
    const sensitiveKeys = ["paystackSecretKey", "flutterwaveSecretKey"];

    const updatedSettings = [];
    for (const [key, value] of Object.entries(settingsToUpdate)) {
      const processedValue = toInputJsonValue(value);

      const updated = await prisma.systemSetting.upsert({
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

    auditLog(
      "PAYMENT_SETTINGS_UPDATED",
      req.user.id,
      {
        settingsUpdated: Object.keys(settingsToUpdate),
      },
      req.ip
    );

    res.json({
      success: true,
      message: "Payment settings updated successfully",
      data: updatedSettings,
    });
  })
);

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
router.get(
  "/email",
  requireAuth({ role: UserRole.ADMIN }),
  asyncHandler(async (req: any, res: any) => {
    const emailSettings = await prisma.systemSetting.findMany({
      where: { category: "email" },
    });

    const settings = emailSettings.reduce(
      (acc, systemSetting) => {
        acc[systemSetting.key] = systemSetting.value;
        return acc;
      },
      {} as Record<string, any>
    );

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
  })
);

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
router.put(
  "/email",
  requireAuth({ role: UserRole.ADMIN }),
  [
    body("emailEnabled").optional().isBoolean(),
    body("smtpHost").optional().isString(),
    body("smtpPort").optional().isInt({ min: 1, max: 65535 }),
    body("smtpUsername").optional().isString(),
    body("smtpPassword").optional().isString(),
    body("fromEmail").optional().isEmail(),
    body("fromName").optional().isString(),
    body("replyToEmail").optional().isEmail(),
    body("emailProvider").optional().isIn(["smtp", "sendgrid", "mailgun"]),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const settingsToUpdate = req.body;

    const updatedSettings = [];
    for (const [key, value] of Object.entries(settingsToUpdate)) {
      const processedValue = toInputJsonValue(value);

      const updated = await prisma.systemSetting.upsert({
        where: { key },
        update: {
          value: processedValue,
          category: "email",
          dataType:
            typeof value === "boolean"
              ? "boolean"
              : typeof value === "number"
                ? "number"
                : "string",
        },
        create: {
          key,
          value: processedValue,
          category: "email",
          dataType:
            typeof value === "boolean"
              ? "boolean"
              : typeof value === "number"
                ? "number"
                : "string",
        },
      });
      updatedSettings.push(updated);
    }

    auditLog(
      "EMAIL_SETTINGS_UPDATED",
      req.user.id,
      {
        settingsUpdated: Object.keys(settingsToUpdate),
      },
      req.ip
    );

    res.json({
      success: true,
      message: "Email settings updated successfully",
      data: updatedSettings,
    });
  })
);

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
router.post(
  "/email/test",
  requireAuth({ role: UserRole.ADMIN }),
  [body("email").isEmail().withMessage("Valid email address required")],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { email } = req.body;

    try {
      await emailService.sendTestEmail(email, {
        recipientName: req.user.firstName || "Administrator",
        testDate: new Date().toISOString(),
        systemName: "MAR Abu Projects Services",
      });

      auditLog(
        "TEST_EMAIL_SENT",
        req.user.id,
        {
          recipientEmail: email,
        },
        req.ip
      );

      res.json({
        success: true,
        message: "Test email sent successfully",
      });
    } catch (error) {
      throw new AppError("Failed to send test email", 500);
    }
  })
);

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
router.get(
  "/company",
  requireAuth({ role: UserRole.ADMIN }),
  asyncHandler(async (req: any, res: any) => {
    const companySettings = await prisma.systemSetting.findMany({
      where: { category: "company" },
    });

    const settings = companySettings.reduce(
      (acc, systemSetting) => {
        acc[systemSetting.key] = systemSetting.value;
        return acc;
      },
      {} as Record<string, any>
    );

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
  })
);

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
router.put(
  "/company",
  requireAuth({ role: UserRole.ADMIN }),
  [
    body("companyName").optional().isString(),
    body("companyEmail").optional().isEmail(),
    body("companyPhone").optional().isString(),
    body("companyAddress").optional().isString(),
    body("companyWebsite").optional().isURL(),
    body("supportEmail").optional().isEmail(),
    body("termsUrl").optional().isString(),
    body("privacyUrl").optional().isString(),
    body("aboutUrl").optional().isString(),
    body("companyLogo").optional().isURL(),
    body("companyDescription").optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
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

      const updated = await prisma.systemSetting.upsert({
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

    auditLog(
      "COMPANY_SETTINGS_UPDATED",
      req.user.id,
      {
        settings: settingsToUpdate,
      },
      req.ip
    );

    res.json({
      success: true,
      message: "Company settings updated successfully",
      data: updatedSettings,
    });
  })
);

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
router.post(
  "/maintenance",
  requireAuth({ role: UserRole.ADMIN }),
  [
    body("enabled").isBoolean().withMessage("Maintenance mode status required"),
    body("message").optional().isString(),
    body("estimatedEnd").optional().isISO8601(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { enabled, message, estimatedEnd } = req.body;

    // Update maintenance mode settings
    await Promise.all(
      [
        prisma.systemSetting.upsert({
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
          prisma.systemSetting.upsert({
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
          prisma.systemSetting.upsert({
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
      ].filter(Boolean)
    );

    auditLog(
      "MAINTENANCE_MODE_TOGGLED",
      req.user.id,
      {
        enabled,
        message,
        estimatedEnd,
      },
      req.ip
    );

    res.json({
      success: true,
      message: `Maintenance mode ${enabled ? "enabled" : "disabled"}`,
      data: {
        maintenanceMode: enabled,
        message,
        estimatedEnd,
      },
    });
  })
);

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
router.get(
  "/backup",
  requireAuth({ role: UserRole.ADMIN }),
  asyncHandler(async (req: any, res: any) => {
    // Get backup-related settings
    const backupSettings = await prisma.systemSetting.findMany({
      where: { category: "backup" },
    });

    const settings = backupSettings.reduce(
      (acc, systemSetting) => {
        acc[systemSetting.key] = systemSetting.value;
        return acc;
      },
      {} as Record<string, any>
    );

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
  })
);

export default router;
