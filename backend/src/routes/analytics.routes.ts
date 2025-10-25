// MAR ABU PROJECTS SERVICES LLC - Analytics and Reporting Routes
import { Router } from "express";
import { query, validationResult } from "express-validator";
import { UserRole, BookingStatus, PropertyStatus } from "@prisma/client";
import { requireAuth } from "../services/authservice";
import { asyncHandler } from "../middlewares/error.middleware";
import { AppError } from "../middlewares/error.middleware";
import { prisma } from "../server";
import { auditLog } from "../middlewares/logger.middleware";

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

// Helper function to get date range
const getDateRange = (period: string) => {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "quarter":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate: now };
};

// ===============================
// OVERVIEW ANALYTICS
// ===============================

/**
 * @route   GET /api/v1/analytics/overview
 * @desc    Get overview analytics
 * @access  Admin, Property Host
 */
/**
 * @swagger
 * /analytics/overview:
 *   get:
 *     summary: Get analytics overview
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - today
 *             - week
 *             - month
 *             - year
 *         description: |
 *              Time period for the analytics overview.
 *              Default: month.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: number
 *                 totalBookings:
 *                   type: number
 *                 revenue:
 *                   type: number
 */
router.get(
  "/overview",
  requireAuth({ role: UserRole.ADMIN }),
  [
    query("period")
      .optional()
      .isIn(["today", "week", "month", "quarter", "year"]),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { period = "month" } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Build base where clause for user role
    const baseWhere: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Property hosts can only see their own data
    if (req.user.role === UserRole.ADMIN) {
      baseWhere.property = { hostId: req.user.id };
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
          paymentStatus: "PAID",
        },
        _sum: { total: true },
      }),

      // Average booking value
      prisma.booking.aggregate({
        where: {
          ...baseWhere,
          paymentStatus: "PAID",
        },
        _avg: { total: true },
      }),

      // Top performing properties
      prisma.booking.groupBy({
        by: ["propertyId"],
        where: {
          ...baseWhere,
          paymentStatus: "PAID",
        },
        _sum: { total: true },
        _count: { propertyId: true },
        orderBy: { _sum: { total: "desc" } },
        take: 5,
      }),

      // Booking trends (daily) - FIXED
      req.user.role === UserRole.ADMIN
        ? prisma.$queryRaw`
            SELECT 
              DATE(b."createdAt") as date,
              COUNT(*)::int as bookings,
              SUM(CASE WHEN b."paymentStatus" = 'PAID' THEN b.total ELSE 0 END)::float as revenue
            FROM "bookings" b
            INNER JOIN "properties" p ON p.id = b."propertyId"
            WHERE b."createdAt" >= ${startDate} 
            AND b."createdAt" <= ${endDate}
            AND p."hostId" = ${req.user.id}
            GROUP BY DATE(b."createdAt")
            ORDER BY date ASC
          `
        : prisma.$queryRaw`
            SELECT 
              DATE(b."createdAt") as date,
              COUNT(*)::int as bookings,
              SUM(CASE WHEN b."paymentStatus" = 'PAID' THEN b.total ELSE 0 END)::float as revenue
            FROM "bookings" b
            WHERE b."createdAt" >= ${startDate} 
            AND b."createdAt" <= ${endDate}
            GROUP BY DATE(b."createdAt")
            ORDER BY date ASC
          `,

      // Revenue by month (last 12 months) - FIXED
      req.user.role === UserRole.ADMIN
        ? prisma.$queryRaw`
            SELECT 
              EXTRACT(YEAR FROM b."createdAt")::int as year,
              EXTRACT(MONTH FROM b."createdAt")::int as month,
              SUM(CASE WHEN b."paymentStatus" = 'PAID' THEN b.total ELSE 0 END)::float as revenue,
              COUNT(*)::int as bookings
            FROM "bookings" b
            INNER JOIN "properties" p ON p.id = b."propertyId"
            WHERE b."createdAt" >= ${new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
            AND p."hostId" = ${req.user.id}
            GROUP BY EXTRACT(YEAR FROM b."createdAt"), EXTRACT(MONTH FROM b."createdAt")
            ORDER BY year ASC, month ASC
          `
        : prisma.$queryRaw`
            SELECT 
              EXTRACT(YEAR FROM b."createdAt")::int as year,
              EXTRACT(MONTH FROM b."createdAt")::int as month,
              SUM(CASE WHEN b."paymentStatus" = 'PAID' THEN b.total ELSE 0 END)::float as revenue,
              COUNT(*)::int as bookings
            FROM "bookings" b
            WHERE b."createdAt" >= ${new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
            GROUP BY EXTRACT(YEAR FROM b."createdAt"), EXTRACT(MONTH FROM b."createdAt")
            ORDER BY year ASC, month ASC
          `,
    ]);

    // Get property details for top properties
    const propertyIds = topProperties.map((p) => p.propertyId);
    const propertyDetails = await prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: {
        id: true,
        name: true,
        type: true,
        city: true,
        images: true,
      },
    });

    const topPropertiesWithDetails = topProperties.map((prop) => {
      const details = propertyDetails.find((p) => p.id === prop.propertyId);
      return {
        property: details,
        revenue: prop._sum.total,
        bookings: prop._count.propertyId,
      };
    });

    // Calculate growth rates
    const previousPeriodEnd = startDate;
    const previousPeriodStart = new Date(
      startDate.getTime() - (endDate.getTime() - startDate.getTime())
    );

    const previousPeriodData = await prisma.booking.aggregate({
      where: {
        createdAt: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd,
        },
        ...(req.user.role === UserRole.ADMIN && {
          property: { hostId: req.user.id },
        }),
      },
      _count: true,
      _sum: { total: true },
    });

    const bookingGrowth =
      previousPeriodData._count > 0
        ? (
            ((totalBookings - previousPeriodData._count) /
              previousPeriodData._count) *
            100
          ).toFixed(1)
        : "0";

    const revenueGrowth =
      (previousPeriodData._sum.total || 0) > 0
        ? (
            (((totalRevenue._sum.total || 0) -
              (previousPeriodData._sum.total || 0)) /
              (previousPeriodData._sum.total || 0)) *
            100
          ).toFixed(1)
        : "0";

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
    });
  })
);

// ===============================
// BOOKING ANALYTICS
// ===============================

/**
 * @route   GET /api/v1/analytics/bookings
 * @desc    Get detailed booking analytics
 * @access  Admin, Property Host
 */
/**
 * @swagger
 * /analytics/bookings:
 *   get:
 *     summary: Get detailed booking analytics
 *     description: Retrieves booking analytics such as status distribution, property statistics, average stay duration, occupancy rate, cancellation rate, booking sources, and peak booking hours.
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *         description: The period to retrieve analytics for. Defaults to "month".
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *         description: Filter analytics to a specific property by ID.
 *     responses:
 *       200:
 *         description: Successful booking analytics response
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
 *                     summary:
 *                       type: object
 *                       properties:
 *                         avgStayDuration:
 *                           type: number
 *                           example: 2.3
 *                         cancellationRate:
 *                           type: string
 *                           example: "10.5%"
 *                         totalBookings:
 *                           type: number
 *                           example: 120
 *                     distributions:
 *                       type: object
 *                       properties:
 *                         byStatus:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               status:
 *                                 type: string
 *                                 example: "APPROVED"
 *                               _count:
 *                                 type: object
 *                                 properties:
 *                                   status:
 *                                     type: number
 *                                     example: 40
 *                         byProperty:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               property:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   name:
 *                                     type: string
 *                                   type:
 *                                     type: string
 *                                   city:
 *                                     type: string
 *                               bookings:
 *                                 type: number
 *                               revenue:
 *                                 type: number
 *                         byType:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               propertyId:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                               _count:
 *                                 type: object
 *                                 properties:
 *                                   propertyId:
 *                                     type: number
 *                         bySource:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               source:
 *                                 type: string
 *                               _count:
 *                                 type: object
 *                                 properties:
 *                                   source:
 *                                     type: number
 *                     patterns:
 *                       type: object
 *                       properties:
 *                         peakHours:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               hour:
 *                                 type: number
 *                                 example: 14
 *                               bookings:
 *                                 type: number
 *                                 example: 25
 *                     period:
 *                       type: string
 *                       example: month
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - only accessible to Admin or Property Host
 */

router.get(
  "/bookings",
  requireAuth({ role: UserRole.ADMIN }),
  [
    query("period")
      .optional()
      .isIn(["today", "week", "month", "quarter", "year"]),
    query("propertyId").optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { period = "month", propertyId } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Build where clause
    const baseWhere: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (req.user.role === UserRole.ADMIN) {
      baseWhere.property = { hostId: req.user.id };
    }

    if (propertyId) {
      baseWhere.propertyId = propertyId;
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
        by: ["status"],
        where: baseWhere,
        _count: { status: true },
      }),

      // Bookings by property
      prisma.booking.groupBy({
        by: ["propertyId"],
        where: baseWhere,
        _count: { propertyId: true },
        _sum: { total: true },
        orderBy: { _count: { propertyId: "desc" } },
        take: 10,
      }),

      // Bookings by property type
      prisma.booking.groupBy({
        by: ["propertyId"],
        where: baseWhere,
        _count: { propertyId: true },
      }),

      // Average stay duration
      prisma.booking.aggregate({
        where: baseWhere,
        _avg: { nights: true },
      }),

      // Occupancy rate calculation - FIXED
      req.user.role === UserRole.ADMIN
        ? prisma.$queryRaw`
            SELECT 
              COUNT(DISTINCT b."propertyId")::int as total_properties,
              COUNT(DISTINCT CASE WHEN b.status IN ('APPROVED', 'COMPLETED') THEN b."propertyId" END)::int as occupied_properties
            FROM "bookings" b
            INNER JOIN "properties" p ON p.id = b."propertyId"
            WHERE b."createdAt" >= ${startDate} 
            AND b."createdAt" <= ${endDate}
            AND p."hostId" = ${req.user.id}
          `
        : prisma.$queryRaw`
            SELECT 
              COUNT(DISTINCT b."propertyId")::int as total_properties,
              COUNT(DISTINCT CASE WHEN b.status IN ('APPROVED', 'COMPLETED') THEN b."propertyId" END)::int as occupied_properties
            FROM "bookings" b
            WHERE b."createdAt" >= ${startDate} 
            AND b."createdAt" <= ${endDate}
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
        by: ["source"],
        where: baseWhere,
        _count: { source: true },
      }),

      // Peak booking times - FIXED
      req.user.role === UserRole.ADMIN
        ? prisma.$queryRaw`
            SELECT 
              EXTRACT(HOUR FROM b."createdAt")::int as hour,
              COUNT(*)::int as bookings
            FROM "bookings" b
            INNER JOIN "properties" p ON p.id = b."propertyId"
            WHERE b."createdAt" >= ${startDate} 
            AND b."createdAt" <= ${endDate}
            AND p."hostId" = ${req.user.id}
            GROUP BY EXTRACT(HOUR FROM b."createdAt")
            ORDER BY bookings DESC
            LIMIT 5
          `
        : prisma.$queryRaw`
            SELECT 
              EXTRACT(HOUR FROM b."createdAt")::int as hour,
              COUNT(*)::int as bookings
            FROM "bookings" b
            WHERE b."createdAt" >= ${startDate} 
            AND b."createdAt" <= ${endDate}
            GROUP BY EXTRACT(HOUR FROM b."createdAt")
            ORDER BY bookings DESC
            LIMIT 5
          `,
    ]);

    // Get property details
    const propertyIds = bookingsByProperty.map((b) => b.propertyId);
    const properties = await prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: {
        id: true,
        name: true,
        type: true,
        city: true,
      },
    });

    const bookingsByPropertyWithDetails = bookingsByProperty.map((booking) => {
      const property = properties.find((p) => p.id === booking.propertyId);
      return {
        property,
        bookings: booking._count.propertyId,
        revenue: booking._sum.total || 0,
      };
    });

    // Calculate rates
    const totalBookingsForRate = bookingsByStatus.reduce(
      (sum, status) => sum + status._count.status,
      0
    );
    const cancelledBookings =
      bookingsByStatus.find((s) => s.status === BookingStatus.CANCELLED)?._count
        .status || 0;
    const cancellationRatePercent =
      totalBookingsForRate > 0
        ? ((cancelledBookings / totalBookingsForRate) * 100).toFixed(1)
        : "0";

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
    });
  })
);

// ===============================
// REVENUE ANALYTICS
// ===============================

/**
 * @route   GET /api/v1/analytics/revenue
 * @desc    Get revenue analytics
 * @access  Admin, Property Host
 */
/**
 * @swagger
 * /analytics/revenue:
 *   get:
 *     summary: Get revenue analytics
 *     description: Returns total revenue, booking trends, breakdowns, and conversion rates based on period and optional property.
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *         description: Time period for revenue analysis (default is month).
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *         description: Filter results for a specific property ID.
 *     responses:
 *       200:
 *         description: Revenue analytics retrieved successfully
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
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: number
 *                           example: 125000
 *                         totalBookings:
 *                           type: integer
 *                           example: 87
 *                         avgBookingValue:
 *                           type: number
 *                           example: 1436.78
 *                         conversionRate:
 *                           type: string
 *                           example: "74.2%"
 *                     breakdown:
 *                       type: object
 *                       properties:
 *                         baseAmount:
 *                           type: number
 *                           example: 90000
 *                         cleaningFees:
 *                           type: number
 *                           example: 15000
 *                         cautionFees:
 *                           type: number
 *                           example: 20000
 *                     byProperty:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           property:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "prop_12345"
 *                               name:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                               city:
 *                                 type: string
 *                           revenue:
 *                             type: number
 *                             example: 12000
 *                           bookings:
 *                             type: integer
 *                             example: 8
 *                           avgRevenue:
 *                             type: number
 *                             example: 1500
 *                     trends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           year:
 *                             type: integer
 *                             example: 2025
 *                           month:
 *                             type: integer
 *                             example: 7
 *                           revenue:
 *                             type: number
 *                             example: 15800
 *                           bookings:
 *                             type: integer
 *                             example: 10
 *                     period:
 *                       type: string
 *                       example: "month"
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden – only Admins or Property Hosts can access
 */

router.get(
  "/revenue",
  requireAuth({ role: UserRole.ADMIN }),
  [
    query("period")
      .optional()
      .isIn(["today", "week", "month", "quarter", "year"]),
    query("propertyId").optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { period = "month", propertyId } = req.query;
    const { startDate, endDate } = getDateRange(period);

    const baseWhere: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      paymentStatus: "PAID",
    };

    if (req.user.role === UserRole.ADMIN) {
      baseWhere.property = { hostId: req.user.id };
    }

    if (propertyId) {
      baseWhere.propertyId = propertyId;
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
          baseAmount: true,
          cleaningFee: true,
          cautionFee: true,
        },
        _count: true,
      }),

      // Revenue breakdown by components
      prisma.booking.aggregate({
        where: baseWhere,
        _sum: {
          baseAmount: true,
          cleaningFee: true,
          cautionFee: true,
        },
      }),

      // Revenue by property
      prisma.booking.groupBy({
        by: ["propertyId"],
        where: baseWhere,
        _sum: { total: true },
        _count: { propertyId: true },
        orderBy: { _sum: { total: "desc" } },
        take: 10,
      }),

      // Revenue trends by month - FIXED
      req.user.role === UserRole.ADMIN
        ? prisma.$queryRaw`
            SELECT 
              EXTRACT(YEAR FROM b."createdAt")::int as year,
              EXTRACT(MONTH FROM b."createdAt")::int as month,
              SUM(b.total)::float as revenue,
              COUNT(*)::int as bookings
            FROM "bookings" b
            INNER JOIN "properties" p ON p.id = b."propertyId"
            WHERE b."createdAt" >= ${new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
            AND b."paymentStatus" = 'PAID'
            AND p."hostId" = ${req.user.id}
            GROUP BY EXTRACT(YEAR FROM b."createdAt"), EXTRACT(MONTH FROM b."createdAt")
            ORDER BY year ASC, month ASC
          `
        : prisma.$queryRaw`
            SELECT 
              EXTRACT(YEAR FROM b."createdAt")::int as year,
              EXTRACT(MONTH FROM b."createdAt")::int as month,
              SUM(b.total)::float as revenue,
              COUNT(*)::int as bookings
            FROM "bookings" b
            WHERE b."createdAt" >= ${new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
            AND b."paymentStatus" = 'PAID'
            GROUP BY EXTRACT(YEAR FROM b."createdAt"), EXTRACT(MONTH FROM b."createdAt")
            ORDER BY year ASC, month ASC
          `,

      // Average booking value
      prisma.booking.aggregate({
        where: baseWhere,
        _avg: { total: true },
      }),

      // Conversion rate (completed vs total bookings)
      prisma.booking.groupBy({
        by: ["status"],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          ...(req.user.role === UserRole.ADMIN && {
            property: { hostId: req.user.id },
          }),
        },
        _count: { status: true },
      }),
    ]);

    // Get property details for revenue by property
    const propertyIds = revenueByProperty.map((r) => r.propertyId);
    const properties = await prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: {
        id: true,
        name: true,
        type: true,
        city: true,
      },
    });

    const revenueByPropertyWithDetails = revenueByProperty.map((revenue) => {
      const property = properties.find((p) => p.id === revenue.propertyId);
      return {
        property,
        revenue: revenue._sum.total || 0,
        bookings: revenue._count.propertyId,
        avgRevenue: (revenue._sum.total || 0) / revenue._count.propertyId,
      };
    });

    // Calculate conversion rate
    const totalBookingsForConversion = conversionRate.reduce(
      (sum, status) => sum + status._count.status,
      0
    );
    const completedBookings =
      conversionRate.find((s) => s.status === BookingStatus.COMPLETED)?._count
        .status || 0;
    const conversionRatePercent =
      totalBookingsForConversion > 0
        ? ((completedBookings / totalBookingsForConversion) * 100).toFixed(1)
        : "0";

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
          baseAmount: revenueBreakdown._sum.baseAmount || 0,
          cleaningFees: revenueBreakdown._sum.cleaningFee || 0,
          cautionFees: revenueBreakdown._sum.cautionFee || 0,
        },
        byProperty: revenueByPropertyWithDetails,
        trends: revenueByMonth,
        period,
      },
    });
  })
);

// ===============================
// PROPERTY ANALYTICS
// ===============================

/**
 * @route   GET /api/v1/analytics/properties
 * @desc    Get property performance analytics
 * @access  Admin, Property Host
 */
/**
 * @swagger
 * /analytics/properties:
 *   get:
 *     summary: Get property performance analytics
 *     description: Returns analytics data such as bookings, revenue, occupancy, and reviews for properties within a specific time period.
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *         description: Optional period to filter analytics. Default is 'month'.
 *     responses:
 *       200:
 *         description: Property performance analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalProperties:
 *                           type: integer
 *                         byStatus:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               status:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                               _count:
 *                                 type: object
 *                                 properties:
 *                                   status:
 *                                     type: integer
 *                     performance:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                           status:
 *                             type: string
 *                           city:
 *                             type: string
 *                           baseRate:
 *                             type: number
 *                           metrics:
 *                             type: object
 *                             properties:
 *                               totalBookings:
 *                                 type: integer
 *                               totalRevenue:
 *                                 type: number
 *                               avgRevenue:
 *                                 type: number
 *                               totalNights:
 *                                 type: integer
 *                               reviewCount:
 *                                 type: integer
 *                               avgRating:
 *                                 type: number
 *                     period:
 *                       type: string
 *       401:
 *         description: Unauthorized – invalid or missing token
 *       403:
 *         description: Forbidden – only admins or property hosts allowed
 *       500:
 *         description: Internal server error
 */
router.get(
  "/properties",
  requireAuth({ role: UserRole.ADMIN }),
  [
    query("period")
      .optional()
      .isIn(["today", "week", "month", "quarter", "year"]),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { period = "month" } = req.query;
    const { startDate, endDate } = getDateRange(period);

    const baseWhere: any = {};
    if (req.user.role === UserRole.ADMIN) {
      baseWhere.hostId = req.user.id;
    }

    const [propertyStats, performanceMetrics, occupancyRates, avgRatings] =
      await Promise.all([
        // Property statistics
        prisma.property.groupBy({
          by: ["status", "type"],
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
                paymentStatus: "PAID",
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

        // Occupancy rates - FIXED
        req.user.role === UserRole.ADMIN
          ? prisma.$queryRaw`
              SELECT 
                p.id,
                p.name,
                COUNT(b.id)::int as bookings,
                SUM(b.nights)::int as total_nights
              FROM "properties" p
              LEFT JOIN "bookings" b ON p.id = b."propertyId" 
                AND b."createdAt" >= ${startDate} 
                AND b."createdAt" <= ${endDate}
                AND b.status IN ('APPROVED', 'COMPLETED')
              WHERE p."hostId" = ${req.user.id}
              GROUP BY p.id, p.name
            `
          : prisma.$queryRaw`
              SELECT 
                p.id,
                p.name,
                COUNT(b.id)::int as bookings,
                SUM(b.nights)::int as total_nights
              FROM "properties" p
              LEFT JOIN "bookings" b ON p.id = b."propertyId" 
                AND b."createdAt" >= ${startDate} 
                AND b."createdAt" <= ${endDate}
                AND b.status IN ('APPROVED', 'COMPLETED')
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
      ]);

    // Calculate performance metrics
    const propertyPerformance = performanceMetrics.map((property) => {
      const totalRevenue = property.bookings.reduce(
        (sum, booking) => sum + booking.total,
        0
      );
      const totalNights = property.bookings.reduce(
        (sum, booking) => sum + booking.nights,
        0
      );
      const avgRevenue =
        property.bookings.length > 0
          ? totalRevenue / property.bookings.length
          : 0;

      const ratings = property.reviews.map((r) => r.rating);
      const avgRating =
        ratings.length > 0
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
          : 0;

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
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalProperties: propertyStats.reduce(
            (sum, stat) => sum + stat._count.status,
            0
          ),
          byStatus: propertyStats,
        },
        performance: propertyPerformance,
        period,
      },
    });
  })
);

/**
 * @route   GET /api/v1/analytics/export
 * @desc    Export analytics data
 * @access  Admin, Property Host
 */
/**
 * @swagger
 * /analytics/export:
 *   get:
 *     summary: Export analytics data
 *     description: Export bookings, revenue, or properties data as CSV or JSON for a specified time period. Only accessible by Admins or Property Hosts.
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [bookings, revenue, properties]
 *         description: The type of analytics data to export.
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *         description: Time range for analytics export. Default is 'month'.
 *       - in: query
 *         name: format
 *         required: false
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *         description: Export format. Default is 'csv'.
 *     responses:
 *       200:
 *         description: Analytics data exported successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               description: CSV data as text
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     exportType:
 *                       type: string
 *                     period:
 *                       type: string
 *                     recordCount:
 *                       type: integer
 *                     exportedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       403:
 *         description: Forbidden – access restricted to Admin or Property Host
 *       500:
 *         description: Internal server error
 */
router.get(
  "/export",
  requireAuth({ role: UserRole.ADMIN }),
  [
    query("type")
      .isIn(["bookings", "revenue", "properties"])
      .withMessage("Valid export type required"),
    query("period")
      .optional()
      .isIn(["today", "week", "month", "quarter", "year"]),
    query("format").optional().isIn(["csv", "json"]),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { type, period = "month", format = "csv" } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Build where clause based on user role
    const baseWhere: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (req.user.role === UserRole.ADMIN) {
      baseWhere.property = { hostId: req.user.id };
    }

    let data: any[] = [];
    let filename = "";

    switch (type) {
      case "bookings":
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
        });
        filename = `bookings_${period}_${Date.now()}`;
        break;

      case "revenue":
        data = await prisma.booking.findMany({
          where: {
            ...baseWhere,
            paymentStatus: "PAID",
          },
          select: {
            id: true,
            bookingCode: true,
            total: true,
            baseAmount: true,
            cleaningFee: true,
            cautionFee: true,
            createdAt: true,
            property: {
              select: { name: true, city: true },
            },
          },
        });
        filename = `revenue_${period}_${Date.now()}`;
        break;

      case "properties":
        const propertyWhere: any = {};
        if (req.user.role === UserRole.ADMIN) {
          propertyWhere.hostId = req.user.id;
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
        });
        filename = `properties_${period}_${Date.now()}`;
        break;
    }

    auditLog(
      "ANALYTICS_EXPORTED",
      req.user.id,
      {
        type,
        period,
        format,
        recordCount: data.length,
      },
      req.ip
    );

    if (format === "csv") {
      // Convert to CSV format
      const csv = convertToCSV(data);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}.csv"`
      );
      res.send(csv);
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
      });
    }
  })
);

// Helper function to convert data to CSV
function convertToCSV(data: any[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

export default router;
