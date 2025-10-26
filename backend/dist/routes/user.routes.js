"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// MAR ABU PROJECTS SERVICES LLC - User Profile Management Routes
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const authservice_1 = require("../services/authservice");
const error_middleware_1 = require("../middlewares/error.middleware");
const error_middleware_2 = require("../middlewares/error.middleware");
const server_1 = require("../server");
const logger_middleware_1 = require("../middlewares/logger.middleware");
const emailservice_1 = require("../services/emailservice");
const multer = require("multer");
const path = require("path");
const uuid_1 = require("uuid");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
// Configure multer for avatar uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/avatars");
    },
    filename: (req, file, cb) => {
        const uniqueName = `avatar-${(0, uuid_1.v4)()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});
const upload = multer({
    storage,
    limits: {
        fileSize: constants_1.APP_CONSTANTS.UPLOAD.MAX_IMAGE_SIZE,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        }
        else {
            cb(new Error("Only image files are allowed"));
        }
    },
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
// ===============================
// USER PROFILE ROUTES
// ===============================
/**
 * @route   GET /users/profile
 * @desc    Get current user profile
 * @access  Protected
 */
/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get authenticated user profile
 *     description: Retrieve the profile information of the currently authenticated user, including basic details, avatar, role, status, email verification, notification preferences, and counts of related entities.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                       example: "userId123"
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     firstName:
 *                       type: string
 *                       example: "John"
 *                     lastName:
 *                       type: string
 *                       example: "Doe"
 *                     phone:
 *                       type: string
 *                       example: "+234-801-234-5678"
 *                     avatar:
 *                       type: string
 *                       nullable: true
 *                       example: "/uploads/avatars/avatar123.jpg"
 *                     role:
 *                       type: string
 *                       example: "CUSTOMER"
 *                     status:
 *                       type: string
 *                       example: "ACTIVE"
 *                     emailVerified:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-17T23:59:59.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-18T10:30:00.000Z"
 *                     notificationPreferences:
 *                       type: object
 *                       additionalProperties: true
 *                       example: { email: true, sms: false }
 *                     _count:
 *                       type: object
 *                       properties:
 *                         bookings:
 *                           type: integer
 *                           example: 5
 *                         hostedProperties:
 *                           type: integer
 *                           example: 2
 *                         reviews:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get("/profile", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const user = await server_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            email: true,
            phone: true,
            avatar: true,
            role: true,
            status: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            notificationPreferences: true,
            _count: {
                select: {
                    bookings: true,
                    hostedProperties: true,
                    reviews: true,
                },
            },
        },
    });
    if (!user) {
        throw new error_middleware_2.AppError("User not found", 404);
    }
    res.json({
        success: true,
        data: user,
    });
}));
/**
 * @route   PUT /users/profile
 * @desc    Update user profile
 * @access  Protected
 */
/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update authenticated user profile
 *     description: Update the profile information of the currently authenticated user, including personal details such as name, phone, bio, date of birth, and address information.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               phone:
 *                 type: string
 *                 example: "+2348012345678"
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Passionate web developer."
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1990-05-20"
 *               address:
 *                 type: string
 *                 example: "123 Main Street"
 *               city:
 *                 type: string
 *                 example: "Lagos"
 *               country:
 *                 type: string
 *                 example: "Nigeria"
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: "Profile updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "userId123"
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     firstName:
 *                       type: string
 *                       example: "John"
 *                     lastName:
 *                       type: string
 *                       example: "Doe"
 *                     phone:
 *                       type: string
 *                       example: "+2348012345678"
 *                     avatar:
 *                       type: string
 *                       nullable: true
 *                       example: "/uploads/avatars/avatar123.jpg"
 *                     bio:
 *                       type: string
 *                       example: "Passionate web developer."
 *                     dateOfBirth:
 *                       type: string
 *                       format: date
 *                       example: "1990-05-20"
 *                     address:
 *                       type: string
 *                       example: "123 Main Street"
 *                     city:
 *                       type: string
 *                       example: "Lagos"
 *                     country:
 *                       type: string
 *                       example: "Nigeria"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put("/profile", (0, authservice_1.requireAuth)(), [
    (0, express_validator_1.body)("firstName")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("First name cannot be empty"),
    (0, express_validator_1.body)("lastName")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Last name cannot be empty"),
    (0, express_validator_1.body)("phone")
        .optional()
        .isMobilePhone("any")
        .withMessage("Valid phone number required"),
    (0, express_validator_1.body)("bio")
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage("Bio must be less than 500 characters"),
    (0, express_validator_1.body)("dateOfBirth")
        .optional()
        .isISO8601()
        .withMessage("Valid date of birth required"),
    (0, express_validator_1.body)("address").optional().isString(),
    (0, express_validator_1.body)("city").optional().isString(),
    (0, express_validator_1.body)("country").optional().isString(),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const allowedFields = [
        "firstName",
        "lastName",
        "phone",
        "bio",
        "dateOfBirth",
        "address",
        "city",
        "country",
    ];
    const updateData = Object.keys(req.body)
        .filter((key) => allowedFields.includes(key))
        .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
    }, {});
    const user = await server_1.prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
        select: {
            id: true,
            email: true,
            phone: true,
            avatar: true,
            bio: true,
            dateOfBirth: true,
            address: true,
            city: true,
            country: true,
        },
    });
    (0, logger_middleware_1.auditLog)("PROFILE_UPDATED", req.user.id, {
        changes: updateData,
    }, req.ip);
    res.json({
        success: true,
        message: "Profile updated successfully",
        data: user,
    });
}));
/**
 * @route   POST /users/avatar
 * @desc    Upload user avatar
 * @access  Protected
 */
/**
 * @swagger
 * /users/avatar:
 *   post:
 *     summary: Upload or update user avatar
 *     description: Uploads a new avatar image for the currently authenticated user. If an existing avatar exists, it will be deleted.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: "Avatar image file to upload"
 *     responses:
 *       200:
 *         description: Avatar updated successfully
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
 *                   example: "Avatar updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "userId123"
 *                     firstName:
 *                       type: string
 *                       example: "John"
 *                     lastName:
 *                       type: string
 *                       example: "Doe"
 *                     avatar:
 *                       type: string
 *                       example: "/uploads/avatars/avatar123.jpg"
 *       400:
 *         description: Avatar image is required or validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/avatar", (0, authservice_1.requireAuth)(), upload.single("avatar"), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw new error_middleware_2.AppError("Avatar image is required", 400);
    }
    // Delete old avatar if exists
    const currentUser = await server_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { avatar: true },
    });
    if (currentUser?.avatar) {
        const fs = require("fs").promises;
        const oldAvatarPath = path.join("uploads/avatars", path.basename(currentUser.avatar));
        try {
            await fs.unlink(oldAvatarPath);
        }
        catch (error) {
            console.error("Failed to delete old avatar:", error);
        }
    }
    // Update user with new avatar
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await server_1.prisma.user.update({
        where: { id: req.user.id },
        data: { avatar: avatarUrl },
        select: {
            id: true,
            avatar: true,
        },
    });
    (0, logger_middleware_1.auditLog)("AVATAR_UPDATED", req.user.id, {
        avatarUrl,
    }, req.ip);
    res.json({
        success: true,
        message: "Avatar updated successfully",
        data: user,
    });
}));
/**
 * @route   DELETE /users/avatar
 * @desc    Delete user avatar
 * @access  Protected
 */
/**
 * @swagger
 * /users/avatar:
 *   delete:
 *     summary: Delete user avatar
 *     description: Deletes the currently authenticated user's avatar image from the filesystem and updates their profile record.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Avatar deleted successfully
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
 *                   example: "Avatar deleted successfully"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete("/avatar", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const user = await server_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { avatar: true },
    });
    if (user?.avatar) {
        // Delete file from filesystem
        const fs = require("fs").promises;
        const avatarPath = path.join("uploads/avatars", path.basename(user.avatar));
        try {
            await fs.unlink(avatarPath);
        }
        catch (error) {
            console.error("Failed to delete avatar file:", error);
        }
        // Update user record
        await server_1.prisma.user.update({
            where: { id: req.user.id },
            data: { avatar: null },
        });
        (0, logger_middleware_1.auditLog)("AVATAR_DELETED", req.user.id, {}, req.ip);
    }
    res.json({
        success: true,
        message: "Avatar deleted successfully",
    });
}));
/**
 * @route   PUT /users/password
 * @desc    Change user password
 * @access  Protected
 */
/**
 * @swagger
 * /users/requireAuth(),
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match')
      }
      return true
    }),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { currentPassword, newPassword } = req.body

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true,email: true },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Password functionality removed in passwordless authentication
    res.status(400).json({
      success: false,
      message: 'Password functionality is not available in passwordless authentication',
    });
  })
);

/**
 * @route   GET /users/dashboard
 * @desc    Get user dashboard data
 * @access  Protected
 */
/**
 * @swagger
 * /users/dashboard:
 *   get:
 *     summary: Retrieve dashboard data
 *     description: Returns dashboard information based on the authenticated user's role (Customer or Admin/Host).
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
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
 *                   oneOf:
 *                     - description: Customer dashboard
 *                       properties:
 *                         bookings:
 *                           type: object
 *                           properties:
 *                             recent:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   id: { type: string }
 *                                   checkInDate: { type: string, format: date }
 *                                   checkOutDate: { type: string, format: date }
 *                                   status: { type: string }
 *                                   property:
 *                                     type: object
 *                                     properties:
 *                                       id: { type: string }
 *                                       name: { type: string }
 *                                       type: { type: string }
 *                                       city: { type: string }
 *                                       images: { type: array, items: { type: string } }
 *                             upcoming:
 *                               type: array
 *                               items:
 *                                 $ref: '#/components/schemas/Booking'
 *                             total: { type: integer }
 *                         reviews:
 *                           type: object
 *                           properties:
 *                             total: { type: integer }
 *                         favorites:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: string }
 *                               property:
 *                                 type: object
 *                                 properties:
 *                                   id: { type: string }
 *                                   name: { type: string }
 *                                   type: { type: string }
 *                                   city: { type: string }
 *                                   baseRate: { type: number }
 *                                   images: { type: array, items: { type: string } }
 *                     - description: Admin/Host dashboard
 *                       properties:
 *                         properties:
 *                           type: object
 *                           properties:
 *                             total: { type: integer }
 *                             active: { type: integer }
 *                             pending: { type: integer }
 *                         bookings:
 *                           type: object
 *                           properties:
 *                             recent:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   id: { type: string }
 *                                   status: { type: string }
 *                                   property: { type: object, properties: { name: { type: string } } }
 *                                   customer: { type: object, properties: { firstName: { type: string }, lastName: { type: string }, email: { type: string } } }
 *                             total: { type: integer }
 *                             pending: { type: integer }
 *                         earnings:
 *                           type: object
 *                           properties:
 *                             total: { type: number }
 *                         reviews:
 *                           type: object
 *                           properties:
 *                             recent:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   id: { type: string }
 *                                   rating: { type: integer }
 *                                   comment: { type: string }
 *                                   customer: { type: object, properties: { firstName: { type: string }, lastName: { type: string } } }
 *                                   property: { type: object, properties: { name: { type: string } } }
 *                             total: { type: integer }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/dashboard", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    if (userRole === client_1.UserRole.CUSTOMER) {
        // Customer dashboard
        const [bookings, upcomingBookings, reviews, favoriteProperties] = await Promise.all([
            server_1.prisma.booking.findMany({
                where: { customerId: userId },
                orderBy: { createdAt: "desc" },
                take: 5,
                include: {
                    property: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            city: true,
                            images: true,
                        },
                    },
                },
            }),
            server_1.prisma.booking.findMany({
                where: {
                    customerId: userId,
                    status: "APPROVED",
                    checkInDate: { gte: new Date() },
                },
                orderBy: { checkInDate: "asc" },
                take: 3,
                include: {
                    property: {
                        select: {
                            id: true,
                            name: true,
                            city: true,
                            images: true,
                        },
                    },
                },
            }),
            server_1.prisma.review.count({
                where: { customerId: userId },
            }),
            server_1.prisma.favorite.findMany({
                where: { userId },
                take: 5,
                include: {
                    property: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            city: true,
                            baseRate: true,
                            images: true,
                        },
                    },
                },
            }),
        ]);
        res.json({
            success: true,
            data: {
                bookings: {
                    recent: bookings,
                    upcoming: upcomingBookings,
                    total: bookings.length,
                },
                reviews: {
                    total: reviews,
                },
                favorites: favoriteProperties,
            },
        });
    }
    else if (userRole === client_1.UserRole.ADMIN) {
        // Property host dashboard
        const [properties, bookings, earnings, reviews] = await Promise.all([
            server_1.prisma.property.findMany({
                where: { hostId: userId },
                include: {
                    _count: {
                        select: { bookings: true },
                    },
                },
            }),
            server_1.prisma.booking.findMany({
                where: {
                    property: { hostId: userId },
                },
                orderBy: { createdAt: "desc" },
                take: 10,
                include: {
                    property: {
                        select: { name: true },
                    },
                    customer: {
                        select: { email: true },
                    },
                },
            }),
            server_1.prisma.booking.aggregate({
                where: {
                    property: { hostId: userId },
                    paymentStatus: "PAID",
                },
                _sum: { total: true },
            }),
            server_1.prisma.review.findMany({
                where: {
                    property: { hostId: userId },
                    approved: true,
                },
                orderBy: { createdAt: "desc" },
                take: 5,
                include: {
                    customer: {
                        select: {},
                    },
                    property: {
                        select: { name: true },
                    },
                },
            }),
        ]);
        res.json({
            success: true,
            data: {
                properties: {
                    total: properties.length,
                    active: properties.filter((p) => p.status === "ACTIVE").length,
                    pending: properties.filter((p) => p.status === "PENDING").length,
                },
                bookings: {
                    recent: bookings,
                    total: bookings.length,
                    pending: bookings.filter((b) => b.status === "PENDING").length,
                },
                earnings: {
                    total: earnings._sum.total || 0,
                },
                reviews: {
                    recent: reviews,
                    total: reviews.length,
                },
            },
        });
    }
}));
/**
 * @route   POST /users/favorites/:propertyId
 * @desc    Add property to favorites
 * @access  Protected
 */
/**
 * @swagger
 * /users/favorites/{propertyId}:
 *   post:
 *     summary: Add a property to user's favorites
 *     description: Allows an authenticated user to mark a property as a favorite.
 *                  Cannot favorite the same property more than once.
 *     tags:
 *       - Favorites
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the property to add to favorites
 *     responses:
 *       200:
 *         description: Property added to favorites successfully
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
 *                   example: Property added to favorites
 *       400:
 *         description: Property is already in favorites
 *       404:
 *         description: Property not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/favorites/:propertyId", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { propertyId } = req.params;
    // Check if property exists
    const property = await server_1.prisma.property.findUnique({
        where: { id: propertyId },
    });
    if (!property) {
        throw new error_middleware_2.AppError("Property not found", 404);
    }
    // Check if already favorited
    const existing = await server_1.prisma.favorite.findUnique({
        where: {
            userId_propertyId: {
                userId: req.user.id,
                propertyId,
            },
        },
    });
    if (existing) {
        throw new error_middleware_2.AppError("Property already in favorites", 400);
    }
    // Add to favorites
    await server_1.prisma.favorite.create({
        data: {
            userId: req.user.id,
            propertyId,
        },
    });
    res.json({
        success: true,
        message: "Property added to favorites",
    });
}));
/**
 * @route   DELETE /users/favorites/:propertyId
 * @desc    Remove property from favorites
 * @access  Protected
 */
/**
 * @swagger
 * /users/favorites/{propertyId}:
 *   delete:
 *     summary: Remove a property from user's favorites
 *     description: Allows an authenticated user to remove a property from their favorites list.
 *     tags:
 *       - Favorites
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the property to remove from favorites
 *     responses:
 *       200:
 *         description: Property removed from favorites successfully
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
 *                   example: Property removed from favorites
 *       404:
 *         description: Favorite entry not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete("/favorites/:propertyId", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { propertyId } = req.params;
    await server_1.prisma.favorite.delete({
        where: {
            userId_propertyId: {
                userId: req.user.id,
                propertyId,
            },
        },
    });
    res.json({
        success: true,
        message: "Property removed from favorites",
    });
}));
/**
 * @route   GET /users/favorites
 * @desc    Get user's favorite properties
 * @access  Protected
 */
/**
 * @swagger
 * /users/favorites:
 *   get:
 *     summary: Get list of user's favorite properties
 *     description: Retrieve a paginated list of properties the authenticated user has favorited, including average ratings and review counts.
 *     tags:
 *       - Favorites
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
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of favorite properties with pagination
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
 *                     favorites:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           property:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               averageRating:
 *                                 type: number
 *                               reviewCount:
 *                                 type: integer
 *                               host:
 *                                 type: object
 *                                 properties:
 *                                   firstName:
 *                                     type: string
 *                                   lastName:
 *                                     type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/favorites", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const [favorites, total] = await Promise.all([
        server_1.prisma.favorite.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: "desc" },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
            include: {
                property: {
                    include: {
                        host: {
                            select: {},
                        },
                        reviews: {
                            where: { approved: true },
                            select: { rating: true },
                        },
                    },
                },
            },
        }),
        server_1.prisma.favorite.count({
            where: { userId: req.user.id },
        }),
    ]);
    // Calculate average ratings
    const favoritesWithRatings = favorites.map((fav) => {
        const ratings = fav.property.reviews.map((r) => r.rating);
        const averageRating = ratings.length > 0
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
            : 0;
        return {
            ...fav,
            property: {
                ...fav.property,
                averageRating: Math.round(averageRating * 10) / 10,
                reviewCount: ratings.length,
                reviews: undefined,
            },
        };
    });
    res.json({
        success: true,
        data: {
            favorites: favoritesWithRatings,
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
 * @route   DELETE /users/account
 * @desc    Delete user account
 * @access  Protected
 */
/**
 * @swagger
 * /users/account:
 *   delete:
 *     summary: Delete user account
 *     description: Deletes the authenticated user's account after password verification and confirmation. Active bookings must be completed or cancelled before deletion.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - confirmDelete
 *             properties:
 *               password:
 *                 type: string
 *               confirmDelete:
 *                 type: string
 *                 enum: [DELETE]
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: Invalid password or active bookings exist
 *       404:
 *         description: User not found
 */
router.delete("/account", (0, authservice_1.requireAuth)(), [
    (0, express_validator_1.body)("password")
        .notEmpty()
        .withMessage("Password required for account deletion"),
    (0, express_validator_1.body)("confirmDelete")
        .equals("DELETE")
        .withMessage("Must confirm deletion by typing DELETE"),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { password } = req.body;
    // Get user with password
    const user = await server_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            email: true,
        },
    });
    if (!user) {
        throw new error_middleware_2.AppError("User not found", 404);
    }
    // Verify password
    const isValidPassword = false; /* password check removed */
    if (!isValidPassword) {
        throw new error_middleware_2.AppError("Invalid password", 400);
    }
    // Check for active bookings
    const activeBookings = await server_1.prisma.booking.count({
        where: {
            customerId: req.user.id,
            status: {
                in: ["PENDING", "APPROVED"],
            },
        },
    });
    if (activeBookings > 0) {
        throw new error_middleware_2.AppError("Cannot delete account with active bookings", 400);
    }
    // Soft delete - mark as deleted instead of actually deleting
    await server_1.prisma.user.update({
        where: { id: req.user.id },
        data: {
            status: client_1.UserStatus.DELETED,
            email: `deleted_${Date.now()}_${user.email}`,
            deletedAt: new Date(),
        },
    });
    // Send confirmation email
    await emailservice_1.emailService.sendAccountDeletionConfirmation(user.email, user.email);
    (0, logger_middleware_1.auditLog)("ACCOUNT_DELETED", req.user.id, {
        email: user.email,
    }, req.ip);
    res.json({
        success: true,
        message: "Account deleted successfully",
    });
}));
exports.default = router;
