// MAR ABU PROJECTS SERVICES LLC - User Profile Management Routes
import { Router } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { UserRole, UserStatus } from '@prisma/client'
import { requireAuth } from '../services/authservice'
import { asyncHandler } from '../middlewares/error.middleware'
import { AppError } from '../middlewares/error.middleware'
import { prisma } from '../server'
import { auditLog } from '../middlewares/logger.middleware'
import { emailService } from '../services/emailservice'
import bcryptjs from 'bcryptjs'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { APP_CONSTANTS } from '../utils/constants'

const router = Router()

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars')
  },
  filename: (req, file, cb) => {
    const uniqueName = `avatar-${uuidv4()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: APP_CONSTANTS.UPLOAD.MAX_IMAGE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
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
// USER PROFILE ROUTES
// ===============================

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user profile
 * @access  Protected
 */
router.get(
  '/profile',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
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
            properties: true,
            reviews: true,
          },
        },
      },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    res.json({
      success: true,
      data: user,
    })
  })
)

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Protected
 */
router.put(
  '/profile',
  requireAuth(),
  [
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('phone').optional().isMobilePhone('any').withMessage('Valid phone number required'),
    body('bio').optional().isString().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth required'),
    body('address').optional().isString(),
    body('city').optional().isString(),
    body('country').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const allowedFields = ['firstName', 'lastName', 'phone', 'bio', 'dateOfBirth', 'address', 'city', 'country']
    const updateData = Object.keys(req.body)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key]
        return obj
      }, {} as any)

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        bio: true,
        dateOfBirth: true,
        address: true,
        city: true,
        country: true,
      },
    })

    auditLog('PROFILE_UPDATED', req.user.id, {
      changes: updateData,
    }, req.ip)

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    })
  })
)

/**
 * @route   POST /api/v1/users/avatar
 * @desc    Upload user avatar
 * @access  Protected
 */
router.post(
  '/avatar',
  requireAuth(),
  upload.single('avatar'),
  asyncHandler(async (req: any, res: any) => {
    if (!req.file) {
      throw new AppError('Avatar image is required', 400)
    }

    // Delete old avatar if exists
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatar: true },
    })

    if (currentUser?.avatar) {
      const fs = require('fs').promises
      const oldAvatarPath = path.join('uploads/avatars', path.basename(currentUser.avatar))
      try {
        await fs.unlink(oldAvatarPath)
      } catch (error) {
        console.error('Failed to delete old avatar:', error)
      }
    }

    // Update user with new avatar
    const avatarUrl = `/uploads/avatars/${req.file.filename}`
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    })

    auditLog('AVATAR_UPDATED', req.user.id, {
      avatarUrl,
    }, req.ip)

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      data: user,
    })
  })
)

/**
 * @route   DELETE /api/v1/users/avatar
 * @desc    Delete user avatar
 * @access  Protected
 */
router.delete(
  '/avatar',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatar: true },
    })

    if (user?.avatar) {
      // Delete file from filesystem
      const fs = require('fs').promises
      const avatarPath = path.join('uploads/avatars', path.basename(user.avatar))
      try {
        await fs.unlink(avatarPath)
      } catch (error) {
        console.error('Failed to delete avatar file:', error)
      }

      // Update user record
      await prisma.user.update({
        where: { id: req.user.id },
        data: { avatar: null },
      })

      auditLog('AVATAR_DELETED', req.user.id, {}, req.ip)
    }

    res.json({
      success: true,
      message: 'Avatar deleted successfully',
    })
  })
)

/**
 * @route   PUT /api/v1/users/password
 * @desc    Change user password
 * @access  Protected
 */
router.put(
  '/password',
  requireAuth(),
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
      select: { id: true, password: true, email: true },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Verify current password
    const isValidPassword = await bcryptjs.compare(currentPassword, user.password)
    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 400)
    }

    // Hash new password
    const hashedPassword = await bcryptjs.hash(newPassword, 12)

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    })

    // Send email notification
    await emailService.sendPasswordChangeNotification(user.email)

    auditLog('PASSWORD_CHANGED', req.user.id, {}, req.ip)

    res.json({
      success: true,
      message: 'Password changed successfully',
    })
  })
)

/**
 * @route   GET /api/v1/users/dashboard
 * @desc    Get user dashboard data
 * @access  Protected
 */
router.get(
  '/dashboard',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user.id
    const userRole = req.user.role

    if (userRole === UserRole.CUSTOMER) {
      // Customer dashboard
      const [bookings, upcomingBookings, reviews, favoriteProperties] = await Promise.all([
        prisma.booking.findMany({
          where: { customerId: userId },
          orderBy: { createdAt: 'desc' },
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
        prisma.booking.findMany({
          where: {
            customerId: userId,
            status: 'APPROVED',
            checkIn: { gte: new Date() },
          },
          orderBy: { checkIn: 'asc' },
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
        prisma.review.count({
          where: { customerId: userId },
        }),
        prisma.favorite.findMany({
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
      ])

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
      })
    } else if (userRole === UserRole.PROPERTY_HOST) {
      // Property host dashboard
      const [properties, bookings, earnings, reviews] = await Promise.all([
        prisma.property.findMany({
          where: { hostId: userId },
          include: {
            _count: {
              select: { bookings: true },
            },
          },
        }),
        prisma.booking.findMany({
          where: {
            property: { hostId: userId },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            property: {
              select: { name: true },
            },
            customer: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        prisma.booking.aggregate({
          where: {
            property: { hostId: userId },
            paymentStatus: 'PAID',
          },
          _sum: { total: true },
        }),
        prisma.review.findMany({
          where: {
            property: { hostId: userId },
            approved: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            customer: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            property: {
              select: { name: true },
            },
          },
        }),
      ])

      res.json({
        success: true,
        data: {
          properties: {
            total: properties.length,
            active: properties.filter(p => p.status === 'ACTIVE').length,
            pending: properties.filter(p => p.status === 'PENDING').length,
          },
          bookings: {
            recent: bookings,
            total: bookings.length,
            pending: bookings.filter(b => b.status === 'PENDING').length,
          },
          earnings: {
            total: earnings._sum.total || 0,
          },
          reviews: {
            recent: reviews,
            total: reviews.length,
          },
        },
      })
    }
  })
)

/**
 * @route   POST /api/v1/users/favorites/:propertyId
 * @desc    Add property to favorites
 * @access  Protected
 */
router.post(
  '/favorites/:propertyId',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const { propertyId } = req.params

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    })

    if (!property) {
      throw new AppError('Property not found', 404)
    }

    // Check if already favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_propertyId: {
          userId: req.user.id,
          propertyId,
        },
      },
    })

    if (existing) {
      throw new AppError('Property already in favorites', 400)
    }

    // Add to favorites
    await prisma.favorite.create({
      data: {
        userId: req.user.id,
        propertyId,
      },
    })

    res.json({
      success: true,
      message: 'Property added to favorites',
    })
  })
)

/**
 * @route   DELETE /api/v1/users/favorites/:propertyId
 * @desc    Remove property from favorites
 * @access  Protected
 */
router.delete(
  '/favorites/:propertyId',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const { propertyId } = req.params

    await prisma.favorite.delete({
      where: {
        userId_propertyId: {
          userId: req.user.id,
          propertyId,
        },
      },
    })

    res.json({
      success: true,
      message: 'Property removed from favorites',
    })
  })
)

/**
 * @route   GET /api/v1/users/favorites
 * @desc    Get user's favorite properties
 * @access  Protected
 */
router.get(
  '/favorites',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
    } = req.query

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          property: {
            include: {
              host: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
              reviews: {
                where: { approved: true },
                select: { rating: true },
              },
            },
          },
        },
      }),
      prisma.favorite.count({
        where: { userId: req.user.id },
      }),
    ])

    // Calculate average ratings
    const favoritesWithRatings = favorites.map(fav => {
      const ratings = fav.property.reviews.map(r => r.rating)
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0

      return {
        ...fav,
        property: {
          ...fav.property,
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount: ratings.length,
          reviews: undefined,
        },
      }
    })

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
    })
  })
)

/**
 * @route   DELETE /api/v1/users/account
 * @desc    Delete user account
 * @access  Protected
 */
router.delete(
  '/account',
  requireAuth(),
  [
    body('password').notEmpty().withMessage('Password required for account deletion'),
    body('confirmDelete').equals('DELETE').withMessage('Must confirm deletion by typing DELETE'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { password } = req.body

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { 
        id: true, 
        password: true, 
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Verify password
    const isValidPassword = await bcryptjs.compare(password, user.password)
    if (!isValidPassword) {
      throw new AppError('Invalid password', 400)
    }

    // Check for active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        customerId: req.user.id,
        status: {
          in: ['PENDING', 'APPROVED'],
        },
      },
    })

    if (activeBookings > 0) {
      throw new AppError('Cannot delete account with active bookings', 400)
    }

    // Soft delete - mark as deleted instead of actually deleting
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        status: UserStatus.DELETED,
        email: `deleted_${Date.now()}_${user.email}`,
        deletedAt: new Date(),
      },
    })

    // Send confirmation email
    await emailService.sendAccountDeletionConfirmation(
      user.email,
      `${user.firstName} ${user.lastName}`
    )

    auditLog('ACCOUNT_DELETED', req.user.id, {
      email: user.email,
    }, req.ip)

    res.json({
      success: true,
      message: 'Account deleted successfully',
    })
  })
)

export default router