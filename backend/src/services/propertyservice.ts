// MAR ABU PROJECTS SERVICES LLC - Property Management Service
import { PrismaClient, PropertyType, PropertyStatus, UserRole } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// ===============================
// VALIDATION SCHEMAS
// ===============================
export const createPropertySchema = z.object({
  name: z.string().min(3, 'Property name must be at least 3 characters'),
  description: z.string().optional(),
  type: z.nativeEnum(PropertyType),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  country: z.string().default('Nigeria'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  bedrooms: z.number().int().min(1, 'Must have at least 1 bedroom'),
  bathrooms: z.number().int().min(1, 'Must have at least 1 bathroom'),
  maxGuests: z.number().int().min(1, 'Must accommodate at least 1 guest'),
  size: z.number().positive().optional(),
  floor: z.number().int().optional(),
  buildingName: z.string().optional(),
  baseRate: z.number().positive('Base rate must be positive'),
  weekendPremium: z.number().min(0).max(100).default(0),
  monthlyDiscount: z.number().min(0).max(50).default(0),
  cleaningFee: z.number().min(0).default(0),
  securityDeposit: z.number().min(0).default(0),
  serviceFee: z.number().min(0).max(1).default(0.05),
  minStay: z.number().int().min(1).default(1),
  maxStay: z.number().int().max(365).default(90),
  checkInTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('15:00'),
  checkOutTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('11:00'),
  cancellationPolicy: z.string().optional(),
  houseRules: z.string().optional(),
  amenities: z.array(z.object({
    name: z.string().min(1),
    category: z.string().default('Basic'),
    icon: z.string().optional(),
    description: z.string().optional(),
  })).default([]),
})

export const updatePropertySchema = createPropertySchema.partial()

export const searchPropertiesSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  type: z.nativeEnum(PropertyType).optional(),
  status: z.nativeEnum(PropertyStatus).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  minBedrooms: z.number().int().optional(),
  maxGuests: z.number().int().optional(),
  amenities: z.array(z.string()).optional(),
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['price', 'rating', 'created', 'name']).default('created'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const availabilitySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  available: z.boolean().default(true),
  price: z.number().positive().optional(),
  minStay: z.number().int().min(1).optional(),
  notes: z.string().optional(),
})

// ===============================
// TYPES
// ===============================
export interface PropertySearchResult {
  properties: PropertyWithDetails[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PropertyWithDetails {
  id: string
  name: string
  description: string | null
  type: PropertyType
  status: PropertyStatus
  address: string
  city: string
  state: string
  country: string
  latitude: number | null
  longitude: number | null
  bedrooms: number
  bathrooms: number
  maxGuests: number
  size: number | null
  baseRate: number
  weekendPremium: number | null
  cleaningFee: number | null
  securityDeposit: number | null
  minStay: number
  maxStay: number
  checkInTime: string
  checkOutTime: string
  createdAt: Date
  updatedAt: Date
  host: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  images: Array<{
    id: string
    url: string
    title: string | null
    isMain: boolean
    order: number
  }>
  amenities: Array<{
    id: string
    name: string
    category: string
    icon: string | null
  }>
  averageRating?: number
  reviewCount?: number
  isAvailable?: boolean
}

// ===============================
// PROPERTY SERVICE CLASS
// ===============================
export class PropertyService {
  /**
   * Create a new property
   */
  async createProperty(
    hostId: string,
    propertyData: z.infer<typeof createPropertySchema>
  ): Promise<PropertyWithDetails> {
    try {
      // Validate input
      const validatedData = createPropertySchema.parse(propertyData)

      // Create property with amenities
      const { amenities, ...propertyFields } = validatedData

      const property = await prisma.property.create({
        data: {
          ...propertyFields,
          hostId,
          amenities: {
            create: amenities,
          },
        },
        include: {
          host: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          images: {
            orderBy: { order: 'asc' },
          },
          amenities: true,
        },
      })

      // Log audit
      await this.logAudit(hostId, 'CREATE', 'Property', property.id, { 
        propertyName: property.name 
      })

      return property as PropertyWithDetails
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
  }

  /**
   * Get property by ID
   */
  async getPropertyById(propertyId: string, includeUnavailable = false): Promise<PropertyWithDetails | null> {
    const whereClause: any = { id: propertyId }
    
    if (!includeUnavailable) {
      whereClause.status = { not: PropertyStatus.INACTIVE }
    }

    const property = await prisma.property.findFirst({
      where: whereClause,
      include: {
        host: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        amenities: true,
        reviews: {
          where: { approved: true },
          select: { rating: true },
        },
      },
    })

    if (!property) return null

    // Calculate average rating
    const averageRating = property.reviews.length > 0
      ? property.reviews.reduce((sum, review) => sum + review.rating, 0) / property.reviews.length
      : 0

    const { reviews, ...propertyWithoutReviews } = property

    return {
      ...propertyWithoutReviews,
      averageRating: Number(averageRating.toFixed(1)),
      reviewCount: reviews.length,
    } as PropertyWithDetails
  }

  /**
   * Update property
   */
  async updateProperty(
    propertyId: string,
    hostId: string,
    updateData: z.infer<typeof updatePropertySchema>,
    userRole: UserRole
  ): Promise<PropertyWithDetails> {
    try {
      // Validate input
      const validatedData = updatePropertySchema.parse(updateData)

      // Check ownership or admin permissions
      const existingProperty = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { hostId: true },
      })

      if (!existingProperty) {
        throw new Error('Property not found')
      }

      if (existingProperty.hostId !== hostId && 
          userRole !== UserRole.ADMIN && 
          userRole !== UserRole.SUPER_ADMIN) {
        throw new Error('Unauthorized to update this property')
      }

      // Separate amenities from other fields
      const { amenities, ...propertyFields } = validatedData

      // Update property
      const updatedProperty = await prisma.property.update({
        where: { id: propertyId },
        data: {
          ...propertyFields,
          ...(amenities && {
            amenities: {
              deleteMany: {},
              create: amenities,
            },
          }),
        },
        include: {
          host: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          images: {
            orderBy: { order: 'asc' },
          },
          amenities: true,
        },
      })

      // Log audit
      await this.logAudit(hostId, 'UPDATE', 'Property', propertyId, validatedData)

      return updatedProperty as PropertyWithDetails
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
  }

  /**
   * Delete property
   */
  async deleteProperty(propertyId: string, hostId: string, userRole: UserRole): Promise<void> {
    // Check ownership or admin permissions
    const existingProperty = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { hostId: true, name: true },
    })

    if (!existingProperty) {
      throw new Error('Property not found')
    }

    if (existingProperty.hostId !== hostId && 
        userRole !== UserRole.ADMIN && 
        userRole !== UserRole.SUPER_ADMIN) {
      throw new Error('Unauthorized to delete this property')
    }

    // Check for active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        propertyId,
        status: {
          in: ['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED', 'CHECKED_IN'],
        },
      },
    })

    if (activeBookings > 0) {
      throw new Error('Cannot delete property with active bookings')
    }

    // Soft delete by setting status to INACTIVE
    await prisma.property.update({
      where: { id: propertyId },
      data: { status: PropertyStatus.INACTIVE },
    })

    // Log audit
    await this.logAudit(hostId, 'DELETE', 'Property', propertyId, { 
      propertyName: existingProperty.name 
    })
  }

  /**
   * Search and filter properties
   */
  async searchProperties(
    searchParams: z.infer<typeof searchPropertiesSchema>
  ): Promise<PropertySearchResult> {
    try {
      // Validate input
      const validatedParams = searchPropertiesSchema.parse(searchParams)

      const {
        city, state, type, status, minPrice, maxPrice,
        minBedrooms, maxGuests, amenities, checkIn, checkOut,
        page, limit, sortBy, sortOrder
      } = validatedParams

      // Build where clause
      const whereClause: any = {
        status: status || { not: PropertyStatus.INACTIVE },
      }

      if (city) whereClause.city = { contains: city, mode: 'insensitive' }
      if (state) whereClause.state = { contains: state, mode: 'insensitive' }
      if (type) whereClause.type = type
      if (minPrice || maxPrice) {
        whereClause.baseRate = {}
        if (minPrice) whereClause.baseRate.gte = minPrice
        if (maxPrice) whereClause.baseRate.lte = maxPrice
      }
      if (minBedrooms) whereClause.bedrooms = { gte: minBedrooms }
      if (maxGuests) whereClause.maxGuests = { gte: maxGuests }

      // Filter by amenities
      if (amenities && amenities.length > 0) {
        whereClause.amenities = {
          some: {
            name: { in: amenities }
          }
        }
      }

      // Check availability if dates provided
      if (checkIn && checkOut) {
        const checkInDate = new Date(checkIn)
        const checkOutDate = new Date(checkOut)

        whereClause.AND = [
          {
            NOT: {
              bookings: {
                some: {
                  AND: [
                    { checkIn: { lt: checkOutDate } },
                    { checkOut: { gt: checkInDate } },
                    { 
                      status: { 
                        in: ['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED', 'CHECKED_IN'] 
                      }
                    }
                  ]
                }
              }
            }
          },
          {
            NOT: {
              availability: {
                some: {
                  AND: [
                    { date: { gte: checkInDate } },
                    { date: { lt: checkOutDate } },
                    { available: false }
                  ]
                }
              }
            }
          }
        ]
      }

      // Build order by
      const orderBy: any = {}
      switch (sortBy) {
        case 'price':
          orderBy.baseRate = sortOrder
          break
        case 'name':
          orderBy.name = sortOrder
          break
        case 'created':
        default:
          orderBy.createdAt = sortOrder
          break
      }

      // Execute queries
      const [properties, total] = await Promise.all([
        prisma.property.findMany({
          where: whereClause,
          include: {
            host: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            images: {
              where: { isMain: true },
              take: 1,
            },
            amenities: true,
            reviews: {
              where: { approved: true },
              select: { rating: true },
            },
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.property.count({ where: whereClause }),
      ])

      // Process results
      const processedProperties = properties.map(property => {
        const { reviews, ...propertyData } = property
        const averageRating = reviews.length > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
          : 0

        return {
          ...propertyData,
          averageRating: Number(averageRating.toFixed(1)),
          reviewCount: reviews.length,
        }
      })

      return {
        properties: processedProperties as PropertyWithDetails[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
  }

  /**
   * Get properties by host
   */
  async getPropertiesByHost(hostId: string, includeInactive = false): Promise<PropertyWithDetails[]> {
    const whereClause: any = { hostId }
    
    if (!includeInactive) {
      whereClause.status = { not: PropertyStatus.INACTIVE }
    }

    const properties = await prisma.property.findMany({
      where: whereClause,
      include: {
        host: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        amenities: true,
        reviews: {
          where: { approved: true },
          select: { rating: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return properties.map(property => {
      const { reviews, ...propertyData } = property
      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0

      return {
        ...propertyData,
        averageRating: Number(averageRating.toFixed(1)),
        reviewCount: reviews.length,
      } as PropertyWithDetails
    })
  }

  /**
   * Update property availability
   */
  async updateAvailability(
    propertyId: string,
    hostId: string,
    availabilityData: z.infer<typeof availabilitySchema>,
    userRole: UserRole
  ): Promise<void> {
    try {
      // Validate input
      const validatedData = availabilitySchema.parse(availabilityData)

      // Check ownership
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { hostId: true },
      })

      if (!property) {
        throw new Error('Property not found')
      }

      if (property.hostId !== hostId && 
          userRole !== UserRole.ADMIN && 
          userRole !== UserRole.SUPER_ADMIN) {
        throw new Error('Unauthorized to update availability')
      }

      const startDate = new Date(validatedData.startDate)
      const endDate = new Date(validatedData.endDate)

      // Generate dates between start and end
      const dates = []
      for (let date = new Date(startDate); date < endDate; date.setDate(date.getDate() + 1)) {
        dates.push(new Date(date))
      }

      // Batch update availability
      await prisma.$transaction(
        dates.map(date => 
          prisma.propertyAvailability.upsert({
            where: {
              propertyId_date: {
                propertyId,
                date,
              },
            },
            update: {
              available: validatedData.available,
              price: validatedData.price,
              minStay: validatedData.minStay,
              notes: validatedData.notes,
            },
            create: {
              propertyId,
              date,
              available: validatedData.available,
              price: validatedData.price,
              minStay: validatedData.minStay,
              notes: validatedData.notes,
            },
          })
        )
      )

      // Log audit
      await this.logAudit(hostId, 'UPDATE', 'PropertyAvailability', propertyId, {
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        available: validatedData.available,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
  }

  /**
   * Check property availability
   */
  async checkAvailability(
    propertyId: string,
    checkIn: string,
    checkOut: string
  ): Promise<{ available: boolean; blockedDates?: string[]; price?: number }> {
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)

    // Check for existing bookings
    const existingBookings = await prisma.booking.findMany({
      where: {
        propertyId,
        AND: [
          { checkIn: { lt: checkOutDate } },
          { checkOut: { gt: checkInDate } },
          { 
            status: { 
              in: ['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED', 'CHECKED_IN'] 
            }
          }
        ]
      },
      select: { checkIn: true, checkOut: true },
    })

    if (existingBookings.length > 0) {
      return { available: false }
    }

    // Check availability overrides
    const unavailableDates = await prisma.propertyAvailability.findMany({
      where: {
        propertyId,
        date: { gte: checkInDate, lt: checkOutDate },
        available: false,
      },
      select: { date: true },
    })

    if (unavailableDates.length > 0) {
      return { 
        available: false, 
        blockedDates: unavailableDates.map(d => d.date.toISOString()) 
      }
    }

    // Calculate price (including any date-specific pricing)
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { baseRate: true },
    })

    if (!property) {
      throw new Error('Property not found')
    }

    const specialPricing = await prisma.propertyAvailability.findMany({
      where: {
        propertyId,
        date: { gte: checkInDate, lt: checkOutDate },
        price: { not: null },
      },
      select: { date: true, price: true },
    })

    // Calculate total price
    let totalPrice = 0
    const dates = []
    for (let date = new Date(checkInDate); date < checkOutDate; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date))
    }

    for (const date of dates) {
      const specialPrice = specialPricing.find(sp => 
        sp.date.toDateString() === date.toDateString()
      )
      totalPrice += specialPrice?.price || property.baseRate
    }

    return { 
      available: true, 
      price: totalPrice 
    }
  }

  /**
   * Get property analytics
   */
  async getPropertyAnalytics(
    propertyId: string,
    hostId: string,
    userRole: UserRole,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    // Check ownership
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { hostId: true },
    })

    if (!property) {
      throw new Error('Property not found')
    }

    if (property.hostId !== hostId && 
        userRole !== UserRole.ADMIN && 
        userRole !== UserRole.SUPER_ADMIN) {
      throw new Error('Unauthorized to view analytics')
    }

    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    const [bookingStats, revenueStats, reviewStats] = await Promise.all([
      // Booking statistics
      prisma.booking.aggregate({
        where: {
          propertyId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        _count: { id: true },
        _sum: { totalAmount: true, nights: true },
        _avg: { totalAmount: true },
      }),

      // Revenue by month
      prisma.booking.groupBy({
        by: ['createdAt'],
        where: {
          propertyId,
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'] },
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),

      // Review statistics
      prisma.review.aggregate({
        where: {
          propertyId,
          approved: true,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        _count: { id: true },
        _avg: { rating: true },
      }),
    ])

    return {
      bookings: {
        total: bookingStats._count.id || 0,
        totalRevenue: bookingStats._sum.totalAmount || 0,
        averageBookingValue: bookingStats._avg.totalAmount || 0,
        totalNights: bookingStats._sum.nights || 0,
      },
      reviews: {
        total: reviewStats._count.id || 0,
        averageRating: reviewStats._avg.rating || 0,
      },
      revenueByMonth: revenueStats,
    }
  }

  /**
   * Log audit trail
   */
  private async logAudit(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    entity: string,
    entityId: string,
    changes?: any
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          changes: changes || {},
        }
      })
    } catch (error) {
      console.error('Failed to log audit:', error)
    }
  }
}

export const propertyService = new PropertyService()