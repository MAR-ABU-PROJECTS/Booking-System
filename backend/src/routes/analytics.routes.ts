// MAR ABU PROJECTS SERVICES LLC - Analytics and Reporting Routes
import { Router } from 'express'
import { query, validationResult } from 'express-validator'
import { UserRole, BookingStatus, PropertyStatus } from '@prisma/client'
import { requireAuth } from '../services/authservice'
import { asyncHandler } from '../middlewares/error.middleware'
import { AppError } from '../middlewares/error.middleware'
import { prisma } from '../server'
import { auditLog } from '../middlewares/logger.middleware'

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

// Helper function to get date range
const getDateRange = (period: string) => {
  const now = new Date()
  let startDate: Date
  
  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'quarter':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
  
  return { startDate, endDate: now }
}

// ===============================
// OVERVIEW ANALYTICS
// ===============================

/**
 * @route   GET /api/v1/analytics/overview
 * @desc    Get overview analytics
 * @access  Admin, Property Host
 */
router.get(
  '/overview',
  requireAuth(UserRole.PROPERTY_HOST),
  [
    query('period').optional().isIn(['today', 'week', 'month', 'quarter', 'year']),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { period = 'month' } = req.query
    const { startDate, endDate } = getDateRange(period)

    // Build base where clause for user role
    const baseWhere: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    // Property hosts can only see their own data
    if (req.user.role === UserRole.PROPERTY_HOST) {
      baseWhere.property = { hostId: req.user.id }
    }

    const [
      totalBookings,
      completedBookings,
      pendingBookings,
      totalRevenue,
      avgBookingValue,
      topProperties,
      bookingTrends,
      revenueByMonth,
    ] = await Promise.all([
      // Total bookings
      prisma.booking.count({
        where: baseWhere,
      }),

      // Completed bookings
      prisma.booking.count({
        where: {
          ...baseWhere,
          status: BookingStatus.COMPLETED,
        },
      }),

      // Pending bookings
      prisma.booking.count({
        where: {
          ...baseWhere,
          status: BookingStatus.PENDING,
        },
      }),

      // Total revenue
      prisma.booking.aggregate({
        where: {
          ...baseWhere,
          paymentStatus: 'PAID',
        },
        _sum: { total: true },
      }),

      // Average booking value
      prisma.booking.aggregate({
        where: {
          ...baseWhere,
          paymentStatus: 'PAID',
        },
        _avg: { total: true },
      }),

      // Top performing properties
      prisma.booking.groupBy({
        by: ['propertyId'],
        where: {
          ...baseWhere,
          paymentStatus: 'PAID',
        },
        _sum: { total: true },
        _count: { propertyId: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),

      // Booking trends (daily for last 30 days)
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as bookings,
          SUM(CASE WHEN payment_status = 'PAID' THEN total ELSE 0 END) as revenue
        FROM booking 
        WHERE created_at >= ${startDate} 
        AND created_at <= ${endDate}
        ${req.user.role === UserRole.PROPERTY_HOST ? 
          `AND property_id IN (SELECT id FROM property WHERE host_id = '${req.user.id}')` : 
          ''
        }
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,

      // Revenue by month (last 12 months)
      prisma.$queryRaw`
        SELECT 
          EXTRACT(YEAR FROM created_at) as year,
          EXTRACT(MONTH FROM created_at) as month,
          SUM(CASE WHEN payment_status = 'PAID' THEN total ELSE 0 END) as revenue,
          COUNT(*) as bookings
        FROM booking 
        WHERE created_at >= ${new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
        ${req.user.role === UserRole.PROPERTY_HOST ? 
          `AND property_id IN (SELECT id FROM property WHERE host_id = '${req.user.id}')` : 
          ''
        }
        GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
        ORDER BY year ASC, month ASC
      `,
    ])

    // Get property details for top properties
    const propertyIds = topProperties.map(p => p.propertyId)
    const propertyDetails = await prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: {
        id: true,
        name: true,
        type: true,
        city: true,
        images: true,
      },
    })

    const topPropertiesWithDetails = topProperties.map(prop => {
      const details = propertyDetails.find(p => p.id === prop.propertyId)
      return {
        property: details,
        revenue: prop._sum.total,
        bookings: prop._count.propertyId,
      }
    })

    // Calculate growth rates
    const previousPeriodEnd = startDate
    const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()))

    const previousPeriodData = await prisma.booking.aggregate({
      where: {
        createdAt: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd,
        },
        ...(req.user.role === UserRole.PROPERTY_HOST && {
          property: { hostId: req.user.id },
        }),
      },
      _count: true,
      _sum: { total: true },
    })

    const bookingGrowth = previousPeriodData._count > 0 
      ? ((totalBookings - previousPeriodData._count) / previousPeriodData._count * 100).toFixed(1)
      : '0'

    const revenueGrowth = (previousPeriodData._sum.total || 0) > 0 
      ? (((totalRevenue._sum.total || 0) - (previousPeriodData._sum.total || 0)) / (previousPeriodData._sum.total || 0) * 100).toFixed(1)
      : '0'

    res.json({
      success: true,
      data: {
        summary: {
          totalBookings,
          completedBookings,
          pendingBookings,
          totalRevenue: totalRevenue._sum.total || 0,
          avgBookingValue: avgBookingValue._avg.total || 0,
          bookingGrowth: `${bookingGrowth}%`,
          revenueGrowth: `${revenueGrowth}%`,
        },
        topProperties: topPropertiesWithDetails,
        trends: {
          daily: bookingTrends,
          monthly: revenueByMonth,
        },
        period,
      },
    })
  })
)

// ===============================
// BOOKING ANALYTICS
// ===============================

/**
 * @route   GET /api/v1/analytics/bookings
 * @desc    Get detailed booking analytics
 * @access  Admin, Property Host
 */
router.get(
  '/bookings',
  requireAuth(UserRole.PROPERTY_HOST),
  [
    query('period').optional().isIn(['today', 'week', 'month', 'quarter', 'year']),
    query('propertyId').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { period = 'month', propertyId } = req.query
    const { startDate, endDate } = getDateRange(period)

    // Build where clause
    const baseWhere: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (req.user.role === UserRole.PROPERTY_HOST) {
      baseWhere.property = { hostId: req.user.id }
    }

    if (propertyId) {
      baseWhere.propertyId = propertyId
    }

    const [
      bookingsByStatus,
      bookingsByProperty,
      bookingsByType,
      avgStayDuration,
      occupancyRate,
      cancellationRate,
      bookingsBySource,
      peakTimes,
    ] = await Promise.all([
      // Bookings by status
      prisma.booking.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { status: true },
      }),

      // Bookings by property
      prisma.booking.groupBy({
        by: ['propertyId'],
        where: baseWhere,
        _count: { propertyId: true },
        _sum: { total: true },
        orderBy: { _count: { propertyId: 'desc' } },
        take: 10,
      }),

      // Bookings by property type
      prisma.booking.groupBy({
        by: ['property', 'type'],
        where: baseWhere,
        _count: { property: true },
      }),

      // Average stay duration
      prisma.booking.aggregate({
        where: baseWhere,
        _avg: { nights: true },
      }),

      // Occupancy rate calculation
      prisma.$queryRaw`
        SELECT 
          COUNT(DISTINCT property_id) as total_properties,
          COUNT(DISTINCT CASE WHEN status IN ('APPROVED', 'COMPLETED') THEN property_id END) as occupied_properties
        FROM booking 
        WHERE created_at >= ${startDate} 
        AND created_at <= ${endDate}
        ${req.user.role === UserRole.PROPERTY_HOST ? 
          `AND property_id IN (SELECT id FROM property WHERE host_id = '${req.user.id}')` : 
          ''
        }
      `,

      // Cancellation rate
      prisma.booking.aggregate({
        where: {
          ...baseWhere,
          status: BookingStatus.CANCELLED,
        },
        _count: true,
      }),

      // Bookings by source (would need to add source field to booking model)
      prisma.booking.groupBy({
        by: ['source'],
        where: baseWhere,
        _count: { source: true },
      }),

      // Peak booking times
      prisma.$queryRaw`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as bookings
        FROM booking 
        WHERE created_at >= ${startDate} 
        AND created_at <= ${endDate}
        ${req.user.role === UserRole.PROPERTY_HOST ? 
          `AND property_id IN (SELECT id FROM property WHERE host_id = '${req.user.id}')` : 
          ''
        }
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY bookings DESC
        LIMIT 5
      `,
    ])

    // Get property details
    const propertyIds = bookingsByProperty.map(b => b.propertyId)
    const properties = await prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: {
        id: true,
        name: true,
        type: true,
        city: true,
      },
    })

    const bookingsByPropertyWithDetails = bookingsByProperty.map(booking => {
      const property = properties.find(p => p.id === booking.propertyId)
      return {
        property,
        bookings: booking._count.propertyId,
        revenue: booking._sum.total || 0,
      }
    })

    // Calculate rates
    const totalBookingsForRate = bookingsByStatus.reduce((sum, status) => sum + status._count.status, 0)
    const cancelledBookings = bookingsByStatus.find(s => s.status === BookingStatus.CANCELLED)?._count.status || 0
    const cancellationRatePercent = totalBookingsForRate > 0 ? (cancelledBookings / totalBookingsForRate * 100).toFixed(1) : '0'

    res.json({
      success: true,
      data: {
        summary: {
          avgStayDuration: avgStayDuration._avg.nights || 0,
          cancellationRate: `${cancellationRatePercent}%`,
          totalBookings: totalBookingsForRate,
        },
        distributions: {
          byStatus: bookingsByStatus,
          byProperty: bookingsByPropertyWithDetails,
          byType: bookingsByType,
          bySource: bookingsBySource,
        },
        patterns: {
          peakHours: peakTimes,
        },
        period,
      },
    })
  })
)

// ===============================
// REVENUE ANALYTICS
// ===============================

/**
 * @route   GET /api/v1/analytics/revenue
 * @desc    Get revenue analytics
 * @access  Admin, Property Host
 */
router.get(
  '/revenue',
  requireAuth(UserRole.PROPERTY_HOST),
  [
    query('period').optional().isIn(['today', 'week', 'month', 'quarter', 'year']),
    query('propertyId').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { period = 'month', propertyId } = req.query
    const { startDate, endDate } = getDateRange(period)

    const baseWhere: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      paymentStatus: 'PAID',
    }

    if (req.user.role === UserRole.PROPERTY_HOST) {
      baseWhere.property = { hostId: req.user.id }
    }

    if (propertyId) {
      baseWhere.propertyId = propertyId
    }

    const [
      totalRevenue,
      revenueBreakdown,
      revenueByProperty,
      revenueByMonth,
      averageBookingValue,
      conversionRate,
    ] = await Promise.all([
      // Total revenue
      prisma.booking.aggregate({
        where: baseWhere,
        _sum: {
          total: true,
          subtotal: true,
          cleaningFee: true,
          serviceFee: true,
        },
        _count: true,
      }),

      // Revenue breakdown by components
      prisma.booking.aggregate({
        where: baseWhere,
        _sum: {
          subtotal: true,
          cleaningFee: true,
          serviceFee: true,
        },
      }),

      // Revenue by property
      prisma.booking.groupBy({
        by: ['propertyId'],
        where: baseWhere,
        _sum: { total: true },
        _count: { propertyId: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),

      // Revenue trends by month
      prisma.$queryRaw`
        SELECT 
          EXTRACT(YEAR FROM created_at) as year,
          EXTRACT(MONTH FROM created_at) as month,
          SUM(total) as revenue,
          COUNT(*) as bookings
        FROM booking 
        WHERE created_at >= ${new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
        AND payment_status = 'PAID'
        ${req.user.role === UserRole.PROPERTY_HOST ? 
          `AND property_id IN (SELECT id FROM property WHERE host_id = '${req.user.id}')` : 
          ''
        }
        GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
        ORDER BY year ASC, month ASC
      `,

      // Average booking value
      prisma.booking.aggregate({
        where: baseWhere,
        _avg: { total: true },
      }),

      // Conversion rate (completed vs total bookings)
      prisma.booking.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          ...(req.user.role === UserRole.PROPERTY_HOST && {
            property: { hostId: req.user.id },
          }),
        },
        _count: { status: true },
      }),
    ])

    // Get property details for revenue by property
    const propertyIds = revenueByProperty.map(r => r.propertyId)
    const properties = await prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: {
        id: true,
        name: true,
        type: true,
        city: true,
      },
    })

    const revenueByPropertyWithDetails = revenueByProperty.map(revenue => {
      const property = properties.find(p => p.id === revenue.propertyId)
      return {
        property,
        revenue: revenue._sum.total || 0,
        bookings: revenue._count.propertyId,
        avgRevenue: (revenue._sum.total || 0) / revenue._count.propertyId,
      }
    })

    // Calculate conversion rate
    const totalBookingsForConversion = conversionRate.reduce((sum, status) => sum + status._count.status, 0)
    const completedBookings = conversionRate.find(s => s.status === BookingStatus.COMPLETED)?._count.status || 0
    const conversionRatePercent = totalBookingsForConversion > 0 
      ? (completedBookings / totalBookingsForConversion * 100).toFixed(1) 
      : '0'

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: totalRevenue._sum.total || 0,
          totalBookings: totalRevenue._count,
          avgBookingValue: averageBookingValue._avg.total || 0,
          conversionRate: `${conversionRatePercent}%`,
        },
        breakdown: {
          subtotal: revenueBreakdown._sum.subtotal || 0,
          cleaningFees: revenueBreakdown._sum.cleaningFee || 0,
          serviceFees: revenueBreakdown._sum.serviceFee || 0,
        },
        byProperty: revenueByPropertyWithDetails,
        trends: revenueByMonth,
        period,
      },
    })
  })
)

// ===============================
// PROPERTY ANALYTICS
// ===============================

/**
 * @route   GET /api/v1/analytics/properties
 * @desc    Get property performance analytics
 * @access  Admin, Property Host
 */
router.get(
  '/properties',
  requireAuth(UserRole.PROPERTY_HOST),
  [
    query('period').optional().isIn(['today', 'week', 'month', 'quarter', 'year']),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { period = 'month' } = req.query
    const { startDate, endDate } = getDateRange(period)

    const baseWhere: any = {}
    if (req.user.role === UserRole.PROPERTY_HOST) {
      baseWhere.hostId = req.user.id
    }

    const [
      propertyStats,
      performanceMetrics,
      occupancyRates,
      avgRatings,
    ] = await Promise.all([
      // Property statistics
      prisma.property.groupBy({
        by: ['status', 'type'],
        where: baseWhere,
        _count: { status: true },
      }),

      // Performance metrics per property
      prisma.property.findMany({
        where: baseWhere,
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          city: true,
          baseRate: true,
          _count: {
            select: {
              bookings: {
                where: {
                  createdAt: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
              },
              reviews: {
                where: { approved: true },
              },
            },
          },
          bookings: {
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
              paymentStatus: 'PAID',
            },
            select: {
              total: true,
              nights: true,
            },
          },
          reviews: {
            where: { approved: true },
            select: { rating: true },
          },
        },
      }),

      // Occupancy rates
      prisma.$queryRaw`
        SELECT 
          p.id,
          p.name,
          COUNT(b.id) as bookings,
          SUM(b.nights) as total_nights
        FROM property p
        LEFT JOIN booking b ON p.id = b.property_id 
          AND b.created_at >= ${startDate} 
          AND b.created_at <= ${endDate}
          AND b.status IN ('APPROVED', 'COMPLETED')
        ${req.user.role === UserRole.PROPERTY_HOST ? `WHERE p.host_id = '${req.user.id}'` : ''}
        GROUP BY p.id, p.name
      `,

      // Average ratings
      prisma.property.findMany({
        where: baseWhere,
        select: {
          id: true,
          reviews: {
            where: { approved: true },
            select: { rating: true },
          },
        },
      }),
    ])

    // Calculate performance metrics
    const propertyPerformance = performanceMetrics.map(property => {
      const totalRevenue = property.bookings.reduce((sum, booking) => sum + booking.total, 0)
      const totalNights = property.bookings.reduce((sum, booking) => sum + booking.nights, 0)
      const avgRevenue = property.bookings.length > 0 ? totalRevenue / property.bookings.length : 0
      
      const ratings = property.reviews.map(r => r.rating)
      const avgRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0

      return {
        id: property.id,
        name: property.name,
        type: property.type,
        status: property.status,
        city: property.city,
        baseRate: property.baseRate,
        metrics: {
          totalBookings: property._count.bookings,
          totalRevenue,
          avgRevenue: Math.round(avgRevenue * 100) / 100,
          totalNights,
          reviewCount: property._count.reviews,
          avgRating: Math.round(avgRating * 10) / 10,
        },
      }
    })

    res.json({
      success: true,
      data: {
        summary: {
          totalProperties: propertyStats.reduce((sum, stat) => sum + stat._count.status, 0),
          byStatus: propertyStats,
        },
        performance: propertyPerformance,
        period,
      },
    })
  })
)

/**
 * @route   GET /api/v1/analytics/export
 * @desc    Export analytics data
 * @access  Admin, Property Host
 */
router.get(
  '/export',
  requireAuth(UserRole.PROPERTY_HOST),
  [
    query('type').isIn(['bookings', 'revenue', 'properties']).withMessage('Valid export type required'),
    query('period').optional().isIn(['today', 'week', 'month', 'quarter', 'year']),
    query('format').optional().isIn(['csv', 'json']),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { type, period = 'month', format = 'csv' } = req.query
    const { startDate, endDate } = getDateRange(period)

    // Build where clause based on user role
    const baseWhere: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (req.user.role === UserRole.PROPERTY_HOST) {
      baseWhere.property = { hostId: req.user.id }
    }

    let data: any[] = []
    let filename = ''

    switch (type) {
      case 'bookings':
        data = await prisma.booking.findMany({
          where: baseWhere,
          include: {
            property: {
              select: { name: true, type: true, city: true },
            },
            customer: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        })
        filename = `bookings_${period}_${Date.now()}`
        break

      case 'revenue':
        data = await prisma.booking.findMany({
          where: {
            ...baseWhere,
            paymentStatus: 'PAID',
          },
          select: {
            id: true,
            bookingNumber: true,
            total: true,
            subtotal: true,
            cleaningFee: true,
            serviceFee: true,
            createdAt: true,
            property: {
              select: { name: true, city: true },
            },
          },
        })
        filename = `revenue_${period}_${Date.now()}`
        break

      case 'properties':
        const propertyWhere: any = {}
        if (req.user.role === UserRole.PROPERTY_HOST) {
          propertyWhere.hostId = req.user.id
        }

        data = await prisma.property.findMany({
          where: propertyWhere,
          include: {
            _count: {
              select: {
                bookings: {
                  where: {
                    createdAt: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                },
                reviews: true,
              },
            },
          },
        })
        filename = `properties_${period}_${Date.now()}`
        break
    }

    auditLog('ANALYTICS_EXPORTED', req.user.id, {
      type,
      period,
      format,
      recordCount: data.length,
    }, req.ip)

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(data)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`)
      res.send(csv)
    } else {
      res.json({
        success: true,
        data,
        metadata: {
          exportType: type,
          period,
          recordCount: data.length,
          exportedAt: new Date(),
        },
      })
    }
  })
)

// Helper function to convert data to CSV
function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const csvRows = [headers.join(',')]

  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header]
      return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
    })
    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}

export default router