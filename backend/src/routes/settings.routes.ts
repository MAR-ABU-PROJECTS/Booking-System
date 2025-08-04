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
 * @route   GET /api/v1/settings/system
 * @desc    Get system settings
 * @access  Admin only
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
 * @route   PUT /api/v1/settings/system
 * @desc    Update system settings
 * @access  Super Admin only
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
      .isIn(["string", "number", "boolean", "json"]),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { settings } = req.body;

    // Validate and update each systemSetting
    const updatedSettings = [];
    for (const systemSetting of settings) {
      const {
        key,
        value,
        type = "string",
        description,
        category = "general",
        isPublic = false,
      } = systemSetting;

      // Validate value based on type
      let processedValue: Prisma.InputJsonValue = value;
      if (type === "number") {
        processedValue = parseFloat(value);
        if (isNaN(processedValue)) {
          throw new AppError(
            `Invalid number value for systemSetting ${key}`,
            400
          );
        }
      } else if (type === "boolean") {
        processedValue = value === "true" || value === true;
      } else if (type === "json") {
        try {
          processedValue =
            typeof value === "string" ? JSON.parse(value) : value;
        } catch (error) {
          throw new AppError(
            `Invalid JSON value for systemSetting ${key}`,
            400
          );
        }
        processedValue = processedValue as Prisma.InputJsonValue;
      }

      // Update or create systemSetting
      const updated = await prisma.systemSetting.upsert({
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
 * @route   GET /api/v1/settings/public
 * @desc    Get public system settings
 * @access  Public
 */
router.get(
  "/public",
  asyncHandler(async (req: any, res: any) => {
    const publicSettings = await prisma.systemSetting.findMany({
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
    const groupedSettings = publicSettings.reduce(
      (groups, systemSetting) => {
        const category = systemSetting.category || "general";
        if (!groups[category]) {
          groups[category] = {};
        }
        groups[category][systemSetting.key] = systemSetting.value;
        return groups;
      },
      {} as Record<string, any>
    );

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
 * @route   GET /api/v1/settings/booking
 * @desc    Get booking-related settings
 * @access  Admin only
 */
router.get(
  "/booking",
  requireAuth({ role: UserRole.ADMIN }),
  asyncHandler(async (req: any, res: any) => {
    const bookingSettings = await prisma.systemSetting.findMany({
      where: { category: "booking" },
    });

    const settings = bookingSettings.reduce(
      (acc, systemSetting) => {
        acc[systemSetting.key] = systemSetting.value;
        return acc;
      },
      {} as Record<string, any>
    );

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
 * @route   PUT /api/v1/settings/booking
 * @desc    Update booking settings
 * @access  Admin only
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
 * @route   GET /api/v1/settings/payment
 * @desc    Get payment settings
 * @access  Admin only
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
 * @route   PUT /api/v1/settings/payment
 * @desc    Update payment settings
 * @access  Super Admin only
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
 * @route   GET /api/v1/settings/email
 * @desc    Get email settings
 * @access  Admin only
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
 * @route   PUT /api/v1/settings/email
 * @desc    Update email settings
 * @access  Super Admin only
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
 * @route   POST /api/v1/settings/email/test
 * @desc    Send test email
 * @access  Admin only
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
 * @route   GET /api/v1/settings/company
 * @desc    Get company information settings
 * @access  Admin only
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
 * @route   PUT /api/v1/settings/company
 * @desc    Update company settings
 * @access  Admin only
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
 * @route   POST /api/v1/settings/maintenance
 * @desc    Enable/disable maintenance mode
 * @access  Super Admin only
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
 * @route   GET /api/v1/settings/backup
 * @desc    Get system backup settings
 * @access  Super Admin only
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
