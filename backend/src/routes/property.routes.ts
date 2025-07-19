// MAR ABU PROJECTS SERVICES LLC - Property Routes
import { Router } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { PropertyType, PropertyStatus, UserRole } from '@prisma/client'
import { requireAuth, optionalAuth } from '../services/authservice'
import { asyncHandler } from '../middlewares/error.middleware'
import { AppError } from '../middlewares/error.middleware'
import { prisma } from '../server'
import { auditLog } from '../middlewares/logger.middleware'
import { validatePagination, calculatePagination } from '../utils/helpers'

const router = Router()

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
// PUBLIC PROPERTY ROUTES
// ===============================

/**
 * @route   GET /api/v1/properties
 * @desc    Get all properties (public)
 * @access  Public
 */
router.get(
  '/',
  optionalAuth(),
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      city,
      type,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      maxGuests,
      amenities,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query

    const { page: validPage, limit: validLimit } = validatePagination(page, limit)

    // Build where clause
    const where: any = {
      status: PropertyStatus.ACTIVE,
    }

    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (type) where.type = type
    if (bedrooms) where.bedrooms = { gte: parseInt(bedrooms) }
    if (bathrooms) where.bathrooms = { gte: parseInt(bathrooms) }
    if (maxGuests) where.maxGuests = { gte: parseInt(maxGuests) }
    if (minPrice || maxPrice) {
      where.baseRate = {}
      if (minPrice) where.baseRate.gte = parseFloat(minPrice)
      if (maxPrice) where.baseRate.lte = parseFloat(maxPrice)
    }

    // Handle amenities filter
    if (amenities) {
      const amenityList = Array.isArray(amenities) ? amenities : [amenities]
      where.amenities = {
        hasEvery: amenityList,
      }
    }

    // Build order by clause
    const orderBy: any = {}
    orderBy[sortBy] = order

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy,
        skip: (validPage - 1) * validLimit,
        take: validLimit,
        include: {
          host: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          reviews: {
            where: { approved: true },
            select: {
              rating: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              bookings: true,
            },
          },
        },
      }),
      prisma.property.count({ where }),
    ])

    // Calculate average ratings
    const propertiesWithRatings = properties.map(property => {
      const ratings = property.reviews.map(r => r.rating)
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0

      return {
        ...property,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount: property._count.reviews,
        bookingCount: property._count.bookings,
        reviews: undefined, // Remove reviews array from response
      }
    })

    const pagination = calculatePagination(validPage, validLimit, total)

    res.json({
      success: true,
      data: {
        properties: propertiesWithRatings,
        pagination,
      },
    })
  })
)

/**
 * @route   GET /api/v1/properties/:id
 * @desc    Get property details
 * @access  Public
 */
router.get(
  '/:id',
  optionalAuth(),
  asyncHandler(async (req: any, res: any) => {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        host: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            createdAt: true,
            _count: {
              select: {
                hostedProperties: true,
              },
            },
          },
        },
        reviews: {
          where: { approved: true },
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        bookings: {
          where: {
            status: {
              in: ['APPROVED', 'PENDING'],
            },
          },
          select: {
            checkInDate: true,
            checkOutDate: true,
          },
        },
      },
    })

    if (!property) {
      throw new AppError('Property not found', 404)
    }

    // Calculate average rating
    const ratings = property.reviews.map(r => r.rating)
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : 0

    // Get unavailable dates
    const unavailableDates = property.bookings.map(booking => ({
      checkIn: booking.checkInDate,
      checkOut: booking.checkOutDate,
    }))

    const responseData = {
      ...property,
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount: property.reviews.length,
      unavailableDates,
      hostPropertyCount: property.host._count.hostedProperties,
    }

    res.json({
      success: true,
      data: responseData,
    })
  })
)

/**
 * @route   GET /api/v1/properties/:id/availability
 * @desc    Check property availability for dates
 * @access  Public
 */
router.get(
  '/:id/availability',
  [
    param('id').isString(),
    query('checkIn').isISO8601(),
    query('checkOut').isISO8601(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { checkIn, checkOut } = req.query

    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
    })

    if (!property) {
      throw new AppError('Property not found', 404)
    }

    // Check for overlapping bookings
    const overlappingBookings = await prisma.booking.count({
      where: {
        propertyId: req.params.id,
        status: {
          in: ['PENDING', 'APPROVED'],
        },
        OR: [
          {
            checkInDate: {
              lte: new Date(checkOut),
            },
            checkOutDate: {
              gte: new Date(checkIn),
            },
          },
        ],
      },
    })

    const isAvailable = overlappingBookings === 0

    res.json({
      success: true,
      data: {
        available: isAvailable,
        checkIn,
        checkOut,
        propertyId: req.params.id,
      },
    })
  })
)

// ===============================
// PROPERTY HOST ROUTES
// ===============================

/**
 * @route   GET /api/v1/properties/my-properties
 * @desc    Get properties owned by current user
 * @access  Property Host
 */
router.get(
  '/my-properties',
  requireAuth(UserRole.PROPERTY_HOST),
  asyncHandler(async (req: any, res: any) => {
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query

    const { page: validPage, limit: validLimit } = validatePagination(page, limit)

    const where: any = { hostId: req.user.id }
    if (status) where.status = status

    const orderBy: any = {}
    orderBy[sortBy] = order

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy,
        skip: (validPage - 1) * validLimit,
        take: validLimit,
        include: {
          _count: {
            select: {
              bookings: true,
              reviews: true,
            },
          },
          reviews: {
            where: { approved: true },
            select: { rating: true },
          },
        },
      }),
      prisma.property.count({ where }),
    ])

    // Calculate average ratings and stats
    const propertiesWithStats = properties.map(property => {
      const ratings = property.reviews.map(r => r.rating)
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0

      return {
        ...property,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount: property._count.reviews,
        bookingCount: property._count.bookings,
        reviews: undefined,
      }
    })

    const pagination = calculatePagination(validPage, validLimit, total)

    res.json({
      success: true,
      data: {
        properties: propertiesWithStats,
        pagination,
      },
    })
  })
)

/**
 * @route   POST /api/v1/properties
 * @desc    Create new property
 * @access  Property Host
 */
router.post(
  '/',
  requireAuth(UserRole.PROPERTY_HOST),
  [
    body('name').trim().notEmpty().withMessage('Property name required'),
    body('description').trim().notEmpty().withMessage('Description required'),
    body('type').isIn(Object.values(PropertyType)).withMessage('Invalid property type'),
    body('address').trim().notEmpty().withMessage('Address required'),
    body('city').trim().notEmpty().withMessage('City required'),
    body('state').trim().notEmpty().withMessage('State required'),
    body('zipCode').trim().notEmpty().withMessage('Zip code required'),
    body('country').trim().notEmpty().withMessage('Country required'),
    body('latitude').isFloat().withMessage('Valid latitude required'),
    body('longitude').isFloat().withMessage('Valid longitude required'),
    body('bedrooms').isInt({ min: 0 }).withMessage('Valid bedroom count required'),
    body('bathrooms').isInt({ min: 0 }).withMessage('Valid bathroom count required'),
    body('maxGuests').isInt({ min: 1 }).withMessage('Valid guest count required'),
    body('baseRate').isFloat({ min: 0 }).withMessage('Valid base rate required'),
    body('cleaningFee').optional().isFloat({ min: 0 }),
    body('amenities').isArray().withMessage('Amenities must be an array'),
    body('houseRules').optional().isArray(),
    body('images').isArray().withMessage('Images must be an array'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const propertyData = {
      ...req.body,
      hostId: req.user.id,
      status: PropertyStatus.PENDING, // Requires admin approval
    }

    const property = await prisma.property.create({
      data: propertyData,
      include: {
        host: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // Create notification for admin
    await prisma.notification.create({
      data: {
        userId: req.user.id, // This would be admin ID in real implementation
        type: 'PROPERTY_SUBMITTED',
        title: 'New Property Submitted',
        message: `${property.host.firstName} ${property.host.lastName} submitted a new property: ${property.name}`,
        metadata: {
          propertyId: property.id,
        },
      },
    })

    auditLog('PROPERTY_CREATED', req.user.id, {
      propertyId: property.id,
      propertyName: property.name,
    }, req.ip)

    res.status(201).json({
      success: true,
      message: 'Property created successfully. It will be reviewed by our team.',
      data: property,
    })
  })
)

/**
 * @route   PUT /api/v1/properties/:id
 * @desc    Update property
 * @access  Property Host (owner), Admin
 */
router.put(
  '/:id',
  requireAuth(UserRole.PROPERTY_HOST),
  [
    param('id').isString(),
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
    body('type').optional().isIn(Object.values(PropertyType)),
    body('baseRate').optional().isFloat({ min: 0 }),
    body('cleaningFee').optional().isFloat({ min: 0 }),
    body('amenities').optional().isArray(),
    body('houseRules').optional().isArray(),
    body('images').optional().isArray(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
    })

    if (!property) {
      throw new AppError('Property not found', 404)
    }

    // Check ownership or admin role
    const isOwner = property.hostId === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to update this property', 403)
    }

    const updatedProperty = await prisma.property.update({
      where: { id: req.params.id },
      data: req.body,
    })

    auditLog('PROPERTY_UPDATED', req.user.id, {
      propertyId: req.params.id,
      changes: req.body,
    }, req.ip)

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: updatedProperty,
    })
  })
)

/**
 * @route   DELETE /api/v1/properties/:id
 * @desc    Delete property
 * @access  Property Host (owner), Admin
 */
router.delete(
  '/:id',
  requireAuth(UserRole.PROPERTY_HOST),
  asyncHandler(async (req: any, res: any) => {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        bookings: {
          where: {
            status: {
              in: ['PENDING', 'APPROVED'],
            },
          },
        },
      },
    })

    if (!property) {
      throw new AppError('Property not found', 404)
    }

    // Check ownership or admin role
    const isOwner = property.hostId === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to delete this property', 403)
    }

    // Check for active bookings
    if (property.bookings.length > 0) {
      throw new AppError('Cannot delete property with active bookings', 400)
    }

    await prisma.property.delete({
      where: { id: req.params.id },
    })

    auditLog('PROPERTY_DELETED', req.user.id, {
      propertyId: req.params.id,
      propertyName: property.name,
    }, req.ip)

    res.json({
      success: true,
      message: 'Property deleted successfully',
    })
  })
)

/**
 * @route   GET /api/v1/properties/:id/bookings
 * @desc    Get property bookings
 * @access  Property Host (owner), Admin
 */
router.get(
  '/:id/bookings',
  requireAuth(UserRole.PROPERTY_HOST),
  asyncHandler(async (req: any, res: any) => {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
    })

    if (!property) {
      throw new AppError('Property not found', 404)
    }

    // Check ownership or admin role
    const isOwner = property.hostId === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to view these bookings', 403)
    }

    const {
      page = 1,
      limit = 20,
      status,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query

    const { page: validPage, limit: validLimit } = validatePagination(page, limit)

    const where: any = { propertyId: req.params.id }
    if (status) where.status = status

    const orderBy: any = {}
    orderBy[sortBy] = order

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy,
        skip: (validPage - 1) * validLimit,
        take: validLimit,
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ])

    const pagination = calculatePagination(validPage, validLimit, total)

    res.json({
      success: true,
      data: {
        bookings,
        pagination,
      },
    })
  })
)

export default router