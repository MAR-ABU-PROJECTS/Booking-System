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

    // Build order by clause
    const orderBy: any = {}
    orderBy[sortBy] = order

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy,
        skip: (validPage - 1) * validLimit,
        take: validLimit,
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          address: true,
          city: true,
          state: true,
          bedrooms: true,
          bathrooms: true,
          maxGuests: true,
          baseRate: true,
          cleaningFee: true,
          images: true,
          amenities: true,
          averageRating: true,
          totalReviews: true,
          createdAt: true,
          host: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.property.count({ where }),
    ])

    const pagination = calculatePagination(validPage, validLimit, total)

    res.json({
      success: true,
      data: {
        properties,
        pagination,
      },
    })
  })
)

/**
 * @route   GET /api/v1/properties/search
 * @desc    Search properties
 * @access  Public
 */
router.get(
  '/search',
  asyncHandler(async (req: any, res: any) => {
    const { q, city, checkIn, checkOut, guests } = req.query

    if (!q) {
      throw new AppError('Search query is required', 400)
    }

    const where: any = {
      status: PropertyStatus.ACTIVE,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
      ],
    }

    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (guests) where.maxGuests = { gte: parseInt(guests) }

    const properties = await prisma.property.findMany({
      where,
      take: 20,
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        baseRate: true,
        images: true,
        averageRating: true,
        totalReviews: true,
      },
    })

    res.json({
      success: true,
      data: properties,
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
    const { id } = req.params

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            emailVerified: true,
            phoneVerified: true,
            createdAt: true,
          },
        },
        reviews: {
          where: { approved: true },
          take: 10,
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
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
    })

    if (!property) {
      throw new AppError('Property not found', 404)
    }

    // Check if property is visible to user
    if (property.status !== PropertyStatus.ACTIVE) {
      const isOwner = req.user?.id === property.hostId
      const isAdmin = req.user?.role === UserRole.ADMIN
      
      if (!isOwner && !isAdmin) {
        throw new AppError('Property not found', 404)
      }
    }

    res.json({
      success: true,
      data: property,
    })
  })
)

/**
 * @route   GET /api/v1/properties/:id/availability
 * @desc    Check property availability
 * @access  Public
 */
router.get(
  '/:id/availability',
  [
    param('id').isString(),
    query('checkIn').isISO8601().withMessage('Valid check-in date required'),
    query('checkOut').isISO8601().withMessage('Valid check-out date required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params
    const { checkIn, checkOut } = req.query

    const property = await prisma.property.findUnique({
      where: { id },
      select: { id: true, status: true },
    })

    if (!property || property.status !== PropertyStatus.ACTIVE) {
      throw new AppError('Property not found', 404)
    }

    // Check for conflicting bookings
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        propertyId: id,
        status: { in: ['APPROVED', 'PENDING'] },
        OR: [
          {
            checkIn: { lte: new Date(checkOut) },
            checkOut: { gte: new Date(checkIn) },
          },
        ],
      },
    })

    const isAvailable = conflictingBookings.length === 0

    res.json({
      success: true,
      data: {
        available: isAvailable,
        conflictingBookings: conflictingBookings.length,
      },
    })
  })
)

// ===============================
// PROTECTED PROPERTY ROUTES
// ===============================

/**
 * @route   POST /api/v1/properties
 * @desc    Create new property
 * @access  Property Host, Admin
 */
router.post(
  '/',
  requireAuth(UserRole.PROPERTY_HOST),
  [
    body('name').trim().notEmpty().withMessage('Property name is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('type').isIn(Object.values(PropertyType)).withMessage('Valid property type required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('bedrooms').isInt({ min: 1 }).withMessage('Valid number of bedrooms required'),
    body('bathrooms').isInt({ min: 1 }).withMessage('Valid number of bathrooms required'),
    body('maxGuests').isInt({ min: 1 }).withMessage('Valid maximum guests required'),
    body('baseRate').isFloat({ min: 1000 }).withMessage('Base rate must be at least ₦1,000'),
    body('amenities').optional().isArray(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const propertyData = {
      ...req.body,
      hostId: req.user.id,
      status: PropertyStatus.ACTIVE,
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

    auditLog('PROPERTY_CREATED', req.user.id, {
      propertyId: property.id,
      propertyName: property.name,
    }, req.ip)

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property,
    })
  })
)

/**
 * @route   PUT /api/v1/properties/:id
 * @desc    Update property
 * @access  Property Owner, Admin
 */
router.put(
  '/:id',
  requireAuth(),
  [
    param('id').isString(),
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
    body('baseRate').optional().isFloat({ min: 1000 }),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params

    const property = await prisma.property.findUnique({
      where: { id },
      select: { hostId: true, name: true },
    })

    if (!property) {
      throw new AppError('Property not found', 404)
    }

    // Check authorization
    const isOwner = property.hostId === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to update this property', 403)
    }

    const updated = await prisma.property.update({
      where: { id },
      data: req.body,
    })

    auditLog('PROPERTY_UPDATED', req.user.id, {
      propertyId: id,
      propertyName: property.name,
      changes: req.body,
    }, req.ip)

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: updated,
    })
  })
)

/**
 * @route   DELETE /api/v1/properties/:id
 * @desc    Delete property
 * @access  Property Owner, Admin
 */
router.delete(
  '/:id',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params

    const property = await prisma.property.findUnique({
      where: { id },
      select: { hostId: true, name: true },
    })

    if (!property) {
      throw new AppError('Property not found', 404)
    }

    // Check authorization
    const isOwner = property.hostId === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to delete this property', 403)
    }

    // Check for active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        propertyId: id,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    })

    if (activeBookings > 0) {
      throw new AppError('Cannot delete property with active bookings', 400)
    }

    await prisma.property.delete({
      where: { id },
    })

    auditLog('PROPERTY_DELETED', req.user.id, {
      propertyId: id,
      propertyName: property.name,
    }, req.ip)

    res.json({
      success: true,
      message: 'Property deleted successfully',
    })
  })
)

export default router