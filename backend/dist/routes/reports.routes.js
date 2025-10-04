"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// MAR ABU PROJECTS SERVICES LLC - Report Generation Routes
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const authservice_1 = require("../services/authservice");
const error_middleware_1 = require("../middlewares/error.middleware");
const error_middleware_2 = require("../middlewares/error.middleware");
const server_1 = require("../server");
const logger_middleware_1 = require("../middlewares/logger.middleware");
const csv_writer_1 = require("csv-writer");
const pdfkit_1 = __importDefault(require("pdfkit"));
const exceljs_1 = __importDefault(require("exceljs"));
const path_1 = __importDefault(require("path"));
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
// Helper function to get date range
const getDateRange = (startDate, endDate, period) => {
    let start;
    let end = new Date();
    if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
    }
    else if (period) {
        const now = new Date();
        switch (period) {
            case "today":
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case "yesterday":
                start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case "week":
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "month":
                start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case "quarter":
                start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case "year":
                start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
    }
    else {
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    return { start, end };
};
// ===============================
// BOOKING REPORTS
// ===============================
/**
 * @route   GET /reports/bookings
 * @desc    Generate booking reports
 * @access  Admin, Property Host
 */
/**
 * @swagger
 * /reports/bookings:
 *   get:
 *     summary: Generate booking reports
 *     description: Generate detailed booking reports with summary statistics. Results can be filtered by date range, property, host, and status. Supports export formats (JSON, CSV, Excel, PDF).
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering bookings
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering bookings
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, yesterday, week, month, quarter, year]
 *         description: Predefined period filter (overrides startDate and endDate if provided)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, excel, pdf]
 *           default: json
 *         description: Output format
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *         description: Filter by property ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, COMPLETED, CANCELLED]
 *         description: Filter by booking status
 *       - in: query
 *         name: hostId
 *         schema:
 *           type: string
 *         description: Filter by host ID (admin only)
 *     responses:
 *       200:
 *         description: Booking report generated successfully
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
 *                     meta:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                           example: Booking Report
 *                         period:
 *                           type: object
 *                           properties:
 *                             start:
 *                               type: string
 *                               format: date-time
 *                             end:
 *                               type: string
 *                               format: date-time
 *                         generatedAt:
 *                           type: string
 *                           format: date-time
 *                         generatedBy:
 *                           type: string
 *                           example: "Admin User"
 *                         filters:
 *                           type: object
 *                           example:
 *                             propertyId: "prop_123"
 *                             status: "CONFIRMED"
 *                             hostId: "host_456"
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalBookings:
 *                           type: integer
 *                           example: 120
 *                         totalRevenue:
 *                           type: number
 *                           example: 850000
 *                         averageBookingValue:
 *                           type: number
 *                           example: 7083.33
 *                         statusBreakdown:
 *                           type: object
 *                           example:
 *                             CONFIRMED:
 *                               count: 80
 *                               revenue: 600000
 *                             CANCELLED:
 *                               count: 20
 *                               revenue: 0
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           bookingCode:
 *                             type: string
 *                             example: "BK12345"
 *                           propertyName:
 *                             type: string
 *                             example: "Seaside Villa"
 *                           propertyType:
 *                             type: string
 *                             example: "Villa"
 *                           propertyCity:
 *                             type: string
 *                             example: "Lagos"
 *                           hostName:
 *                             type: string
 *                             example: "John Doe"
 *                           hostEmail:
 *                             type: string
 *                             example: "john@example.com"
 *                           customerName:
 *                             type: string
 *                             example: "Jane Smith"
 *                           customerEmail:
 *                             type: string
 *                             example: "jane@example.com"
 *                           customerPhone:
 *                             type: string
 *                             example: "+2348012345678"
 *                           checkIn:
 *                             type: string
 *                             format: date-time
 *                           checkOut:
 *                             type: string
 *                             format: date-time
 *                           nights:
 *                             type: integer
 *                             example: 3
 *                           adults:
 *                             type: integer
 *                             example: 2
 *                           children:
 *                             type: integer
 *                             example: 1
 *                           baseAmount:
 *                             type: number
 *                             example: 50000
 *                           cleaningFee:
 *                             type: number
 *                             example: 5000
 *                           serviceFee:
 *                             type: number
 *                             example: 2000
 *                           total:
 *                             type: number
 *                             example: 57000
 *                           status:
 *                             type: string
 *                             example: "CONFIRMED"
 *                           paymentStatus:
 *                             type: string
 *                             example: "PAID"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           completeAt:
 *                             type: string
 *                             format: date-time
 *       403:
 *         description: Not authorized to generate booking reports
 */
router.get("/bookings", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.query)("startDate").optional().isISO8601(),
    (0, express_validator_1.query)("endDate").optional().isISO8601(),
    (0, express_validator_1.query)("period")
        .optional()
        .isIn(["today", "yesterday", "week", "month", "quarter", "year"]),
    (0, express_validator_1.query)("format").optional().isIn(["json", "csv", "excel", "pdf"]),
    (0, express_validator_1.query)("propertyId").optional().isString(),
    (0, express_validator_1.query)("status").optional().isIn(Object.values(client_1.BookingStatus)),
    (0, express_validator_1.query)("hostId").optional().isString(),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate, period = "month", format = "json", propertyId, status, hostId, } = req.query;
    const { start, end } = getDateRange(startDate, endDate, period);
    // Build where clause
    const where = {
        createdAt: {
            gte: start,
            lte: end,
        },
    };
    // Apply filters based on user role
    if (req.user.role === client_1.UserRole.ADMIN) {
        where.property = { hostId: req.user.id };
    }
    else if (hostId && req.user.role === client_1.UserRole.ADMIN) {
        where.property = { hostId };
    }
    if (propertyId)
        where.propertyId = propertyId;
    if (status)
        where.status = status;
    // Get booking data
    const [bookings, summary] = await Promise.all([
        server_1.prisma.booking.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                property: {
                    select: {
                        name: true,
                        type: true,
                        city: true,
                        host: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                payment: {
                    select: {
                        amount: true,
                        status: true,
                        method: true,
                        paidAt: true,
                    },
                },
            },
        }),
        // Summary statistics
        server_1.prisma.booking.groupBy({
            by: ["status"],
            where,
            _count: { status: true },
            _sum: { total: true },
        }),
    ]);
    // Calculate summary
    const totalBookings = summary.reduce((sum, item) => sum + item._count.status, 0);
    const totalRevenue = summary.reduce((sum, item) => sum + (item._sum.total || 0), 0);
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    const statusBreakdown = summary.reduce((acc, item) => {
        acc[item.status] = {
            count: item._count.status,
            revenue: item._sum.total || 0,
        };
        return acc;
    }, {});
    const reportData = {
        meta: {
            title: "Booking Report",
            period: { start, end },
            generatedAt: new Date(),
            generatedBy: `${req.user.firstName} ${req.user.lastName}`,
            filters: { propertyId, status, hostId },
        },
        summary: {
            totalBookings,
            totalRevenue,
            averageBookingValue,
            statusBreakdown,
        },
        data: bookings.map((booking) => ({
            bookingCode: booking.bookingCode,
            propertyName: booking.property.name,
            propertyType: booking.property.type,
            propertyCity: booking.property.city,
            hostName: `${booking.property.host.firstName} ${booking.property.host.lastName}`,
            hostEmail: booking.property.host.email,
            customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
            customerEmail: booking.customer.email,
            customerPhone: booking.customer.phone,
            checkIn: booking.checkInDate,
            checkOut: booking.checkOutDate,
            nights: booking.nights,
            adults: booking.adults,
            children: booking.children,
            baseAmount: booking.baseAmount,
            cleaningFee: booking.cleaningFee,
            serviceFee: booking.serviceFee,
            total: booking.total,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            createdAt: booking.createdAt,
            completeAt: booking.completedAt,
        })),
    };
    (0, logger_middleware_1.auditLog)("BOOKING_REPORT_GENERATED", req.user.id, {
        period: { start, end },
        totalRecords: bookings.length,
        format,
        filters: { propertyId, status, hostId },
    }, req.ip);
    if (format === "json") {
        res.json({
            success: true,
            data: reportData,
        });
    }
    else {
        // Generate file-based reports
        const fileName = `booking_report_${Date.now()}`;
        await generateFileReport(reportData, format, fileName, res);
    }
}));
// ===============================
// REVENUE REPORTS
// ===============================
/**
 * @route   GET /reports/revenue
 * @desc    Generate revenue reports
 * @access  Admin, Property Host
 */
/**
 * @swagger
 * /reports/revenue:
 *   get:
 *     summary: Generate revenue reports
 *     description: Generate detailed revenue reports grouped by time (day, week, month) or entity (property, host). Includes booking count, revenue breakdown, and average booking value. Supports export formats (JSON, CSV, Excel, PDF).
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering completed bookings
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering completed bookings
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, yesterday, week, month, quarter, year]
 *         description: Predefined period filter (overrides startDate and endDate if provided)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, excel, pdf]
 *           default: json
 *         description: Output format
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month, property, host]
 *           default: month
 *         description: Group revenue data by time period or entity
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *         description: Filter by property ID
 *       - in: query
 *         name: hostId
 *         schema:
 *           type: string
 *         description: Filter by host ID (admin only)
 *     responses:
 *       200:
 *         description: Revenue report generated successfully
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
 *                     meta:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                           example: Revenue Report
 *                         period:
 *                           type: object
 *                           properties:
 *                             start:
 *                               type: string
 *                               format: date-time
 *                             end:
 *                               type: string
 *                               format: date-time
 *                         groupBy:
 *                           type: string
 *                           example: month
 *                         generatedAt:
 *                           type: string
 *                           format: date-time
 *                         generatedBy:
 *                           type: string
 *                           example: "Admin User"
 *                         filters:
 *                           type: object
 *                           example:
 *                             propertyId: "prop_123"
 *                             hostId: "host_456"
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalBookings:
 *                           type: integer
 *                           example: 350
 *                         totalRevenue:
 *                           type: number
 *                           example: 1250000
 *                         propertyRevenue:
 *                           type: number
 *                           example: 1000000
 *                         serviceFeeRevenue:
 *                           type: number
 *                           example: 200000
 *                         cleaningFeeRevenue:
 *                           type: number
 *                           example: 50000
 *                         avgBookingValue:
 *                           type: number
 *                           example: 3571.43
 *                     data:
 *                       type: array
 *                       items:
 *                         oneOf:
 *                           - type: object
 *                             description: Grouped by time (day/week/month)
 *                             properties:
 *                               date:
 *                                 type: string
 *                                 format: date
 *                                 example: "2025-08-01"
 *                               year:
 *                                 type: integer
 *                                 example: 2025
 *                               month:
 *                                 type: integer
 *                                 example: 8
 *                               bookingCount:
 *                                 type: integer
 *                                 example: 120
 *                               totalRevenue:
 *                                 type: number
 *                                 example: 500000
 *                               propertyRevenue:
 *                                 type: number
 *                                 example: 400000
 *                               serviceFeeRevenue:
 *                                 type: number
 *                                 example: 80000
 *                               cleaningFeeRevenue:
 *                                 type: number
 *                                 example: 20000
 *                               avgBookingValue:
 *                                 type: number
 *                                 example: 4166.67
 *                           - type: object
 *                             description: Grouped by property
 *                             properties:
 *                               propertyId:
 *                                 type: string
 *                                 example: "prop_123"
 *                               propertyName:
 *                                 type: string
 *                                 example: "Ocean View Apartment"
 *                               propertyType:
 *                                 type: string
 *                                 example: "Apartment"
 *                               propertyCity:
 *                                 type: string
 *                                 example: "Lagos"
 *                               hostName:
 *                                 type: string
 *                                 example: "John Doe"
 *                               bookingCount:
 *                                 type: integer
 *                                 example: 25
 *                               totalRevenue:
 *                                 type: number
 *                                 example: 200000
 *                               propertyRevenue:
 *                                 type: number
 *                                 example: 160000
 *                               serviceFeeRevenue:
 *                                 type: number
 *                                 example: 30000
 *                               cleaningFeeRevenue:
 *                                 type: number
 *                                 example: 10000
 *                               avgBookingValue:
 *                                 type: number
 *                                 example: 8000
 *       403:
 *         description: Not authorized to generate revenue reports
 */
router.get("/revenue", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.query)("startDate").optional().isISO8601(),
    (0, express_validator_1.query)("endDate").optional().isISO8601(),
    (0, express_validator_1.query)("period")
        .optional()
        .isIn(["today", "yesterday", "week", "month", "quarter", "year"]),
    (0, express_validator_1.query)("format").optional().isIn(["json", "csv", "excel", "pdf"]),
    (0, express_validator_1.query)("groupBy")
        .optional()
        .isIn(["day", "week", "month", "property", "host"]),
    (0, express_validator_1.query)("propertyId").optional().isString(),
    (0, express_validator_1.query)("hostId").optional().isString(),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate, period = "month", format = "json", groupBy = "month", propertyId, hostId, } = req.query;
    const { start, end } = getDateRange(startDate, endDate, period);
    // Build where clause
    const where = {
        paymentStatus: client_1.PaymentStatus.PAID,
        completeAt: {
            gte: start,
            lte: end,
        },
    };
    // Apply filters based on user role
    if (req.user.role === client_1.UserRole.ADMIN) {
        where.property = { hostId: req.user.id };
    }
    else if (hostId && req.user.role === client_1.UserRole.ADMIN) {
        where.property = { hostId };
    }
    if (propertyId)
        where.propertyId = propertyId;
    // Get revenue data
    let revenueData = [];
    if (groupBy === "day") {
        revenueData = await server_1.prisma.$queryRaw `
        SELECT 
          DATE(paid_at) as date,
          COUNT(*) as booking_count,
          SUM(total) as total_revenue,
          SUM(baseAmount) as property_revenue,
          SUM(service_fee) as service_fee_revenue,
          SUM(cleaning_fee) as cleaning_fee_revenue,
          AVG(total) as avg_booking_value
        FROM booking 
        WHERE payment_status = 'PAID'
        AND paid_at >= ${start} 
        AND paid_at <= ${end}
        ${req.user.role === client_1.UserRole.ADMIN
            ? `AND property_id IN (SELECT id FROM property WHERE host_id = '${req.user.id}')`
            : ""}
        GROUP BY DATE(paid_at)
        ORDER BY date ASC
      `;
    }
    else if (groupBy === "month") {
        revenueData = await server_1.prisma.$queryRaw `
        SELECT 
          EXTRACT(YEAR FROM paid_at) as year,
          EXTRACT(MONTH FROM paid_at) as month,
          COUNT(*) as booking_count,
          SUM(total) as total_revenue,
          SUM(baseAmount) as property_revenue,
          SUM(service_fee) as service_fee_revenue,
          SUM(cleaning_fee) as cleaning_fee_revenue,
          AVG(total) as avg_booking_value
        FROM booking 
        WHERE payment_status = 'PAID'
        AND paid_at >= ${start} 
        AND paid_at <= ${end}
        ${req.user.role === client_1.UserRole.ADMIN
            ? `AND property_id IN (SELECT id FROM property WHERE host_id = '${req.user.id}')`
            : ""}
        GROUP BY EXTRACT(YEAR FROM paid_at), EXTRACT(MONTH FROM paid_at)
        ORDER BY year ASC, month ASC
      `;
    }
    else if (groupBy === "property") {
        const propertyRevenue = await server_1.prisma.booking.groupBy({
            by: ["propertyId"],
            where,
            _count: { propertyId: true },
            _sum: {
                total: true,
                baseAmount: true,
                serviceFee: true,
                cleaningFee: true,
            },
            _avg: { total: true },
            orderBy: { _sum: { total: "desc" } },
        });
        // Get property details
        const propertyIds = propertyRevenue.map((p) => p.propertyId);
        const properties = await server_1.prisma.property.findMany({
            where: { id: { in: propertyIds } },
            select: {
                id: true,
                name: true,
                type: true,
                city: true,
                host: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        revenueData = propertyRevenue.map((revenue) => {
            const property = properties.find((p) => p.id === revenue.propertyId);
            return {
                propertyId: revenue.propertyId,
                propertyName: property?.name,
                propertyType: property?.type,
                propertyCity: property?.city,
                hostName: property
                    ? `${property.host.firstName} ${property.host.lastName}`
                    : null,
                bookingCount: revenue._count.propertyId,
                totalRevenue: revenue._sum.total,
                propertyRevenue: revenue._sum.baseAmount,
                serviceFeeRevenue: revenue._sum.serviceFee,
                cleaningFeeRevenue: revenue._sum.cleaningFee,
                avgBookingValue: revenue._avg.total,
            };
        });
    }
    // Calculate summary
    const totalRevenue = await server_1.prisma.booking.aggregate({
        where,
        _sum: {
            total: true,
            baseAmount: true,
            serviceFee: true,
            cleaningFee: true,
        },
        _count: true,
        _avg: { total: true },
    });
    const reportData = {
        meta: {
            title: "Revenue Report",
            period: { start, end },
            groupBy,
            generatedAt: new Date(),
            generatedBy: `${req.user.firstName} ${req.user.lastName}`,
            filters: { propertyId, hostId },
        },
        summary: {
            totalBookings: totalRevenue._count,
            totalRevenue: totalRevenue._sum.total || 0,
            propertyRevenue: totalRevenue._sum.baseAmount || 0,
            serviceFeeRevenue: totalRevenue._sum.serviceFee || 0,
            cleaningFeeRevenue: totalRevenue._sum.cleaningFee || 0,
            avgBookingValue: totalRevenue._avg.total || 0,
        },
        data: revenueData,
    };
    (0, logger_middleware_1.auditLog)("REVENUE_REPORT_GENERATED", req.user.id, {
        period: { start, end },
        groupBy,
        totalRecords: revenueData.length,
        format,
        filters: { propertyId, hostId },
    }, req.ip);
    if (format === "json") {
        res.json({
            success: true,
            data: reportData,
        });
    }
    else {
        const fileName = `revenue_report_${Date.now()}`;
        await generateFileReport(reportData, format, fileName, res);
    }
}));
// ===============================
// PROPERTY PERFORMANCE REPORTS
// ===============================
/**
 * @route   GET /reports/property-performance
 * @desc    Generate property performance reports
 * @access  Admin, Property Host
 */
/**
 * @swagger
 * /reports/property-performance:
 *   get:
 *     summary: Generate Property Performance Report
 *     description: Returns detailed performance metrics for properties (revenue, occupancy, rating, conversion, etc.).
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report period (ISO8601 format).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report period (ISO8601 format).
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [month, quarter, year]
 *           default: quarter
 *         description: Predefined period shortcut.
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, excel, pdf]
 *           default: json
 *         description: Report output format.
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *         description: Filter by specific property ID.
 *       - in: query
 *         name: hostId
 *         schema:
 *           type: string
 *         description: Filter by specific host ID.
 *     responses:
 *       200:
 *         description: Property performance report generated successfully
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
 *                     meta:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                           example: Property Performance Report
 *                         period:
 *                           type: object
 *                           properties:
 *                             start:
 *                               type: string
 *                               format: date-time
 *                             end:
 *                               type: string
 *                               format: date-time
 *                         generatedAt:
 *                           type: string
 *                           format: date-time
 *                         generatedBy:
 *                           type: string
 *                         filters:
 *                           type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalProperties:
 *                           type: integer
 *                         totalRevenue:
 *                           type: number
 *                         totalBookings:
 *                           type: integer
 *                         avgOccupancyRate:
 *                           type: number
 *                         avgRating:
 *                           type: number
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           propertyId:
 *                             type: string
 *                           propertyName:
 *                             type: string
 *                           propertyType:
 *                             type: string
 *                           city:
 *                             type: string
 *                           state:
 *                             type: string
 *                           hostName:
 *                             type: string
 *                           hostEmail:
 *                             type: string
 *                           metrics:
 *                             type: object
 *                             properties:
 *                               totalBookings:
 *                                 type: integer
 *                               confirmedBookings:
 *                                 type: integer
 *                               cancelledBookings:
 *                                 type: integer
 *                               totalRevenue:
 *                                 type: number
 *                               avgBookingValue:
 *                                 type: number
 *                               totalNights:
 *                                 type: integer
 *                               totalGuests:
 *                                 type: integer
 *                               avgGuestsPerBooking:
 *                                 type: number
 *                               occupancyRate:
 *                                 type: number
 *                               conversionRate:
 *                                 type: number
 *                               avgRating:
 *                                 type: number
 *                               totalReviews:
 *                                 type: integer
 *                               revenuePerNight:
 *                                 type: number
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (only admins allowed)
 *       500:
 *         description: Server error
 */
router.get("/property-performance", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.query)("startDate").optional().isISO8601(),
    (0, express_validator_1.query)("endDate").optional().isISO8601(),
    (0, express_validator_1.query)("period").optional().isIn(["month", "quarter", "year"]),
    (0, express_validator_1.query)("format").optional().isIn(["json", "csv", "excel", "pdf"]),
    (0, express_validator_1.query)("propertyId").optional().isString(),
    (0, express_validator_1.query)("hostId").optional().isString(),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate, period = "quarter", format = "json", propertyId, hostId, } = req.query;
    const { start, end } = getDateRange(startDate, endDate, period);
    // Build where clause for properties
    const propertyWhere = {
        status: client_1.PropertyStatus.ACTIVE,
    };
    if (req.user.role === client_1.UserRole.ADMIN) {
        propertyWhere.hostId = req.user.id;
    }
    else if (hostId && req.user.role === client_1.UserRole.ADMIN) {
        propertyWhere.hostId = hostId;
    }
    if (propertyId)
        propertyWhere.id = propertyId;
    // Get property performance data
    const properties = await server_1.prisma.property.findMany({
        where: propertyWhere,
        include: {
            host: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
            bookings: {
                where: {
                    createdAt: { gte: start, lte: end },
                },
                select: {
                    id: true,
                    status: true,
                    paymentStatus: true,
                    total: true,
                    nights: true,
                    adults: true,
                    children: true,
                    createdAt: true,
                    checkInDate: true,
                    checkOutDate: true,
                },
            },
            reviews: {
                where: {
                    approved: true,
                    createdAt: { gte: start, lte: end },
                },
                select: {
                    rating: true,
                    createdAt: true,
                },
            },
            _count: {
                select: {
                    bookings: {
                        where: {
                            createdAt: { gte: start, lte: end },
                        },
                    },
                    reviews: {
                        where: {
                            approved: true,
                            createdAt: { gte: start, lte: end },
                        },
                    },
                },
            },
        },
    });
    // Process property performance data
    const performanceData = properties.map((property) => {
        const totalBookings = property.bookings.length;
        const confirmedBookings = property.bookings.filter((b) => b.status === client_1.BookingStatus.APPROVED ||
            b.status === client_1.BookingStatus.COMPLETED).length;
        const cancelledBookings = property.bookings.filter((b) => b.status === client_1.BookingStatus.CANCELLED).length;
        const totalRevenue = property.bookings
            .filter((b) => b.paymentStatus === client_1.PaymentStatus.PAID)
            .reduce((sum, b) => sum + b.total, 0);
        const totalNights = property.bookings.reduce((sum, b) => sum + b.nights, 0);
        const totalGuests = property.bookings.reduce((sum, b) => sum + b.adults + (b.children || 0), 0);
        const ratings = property.reviews.map((r) => r.rating);
        const avgRating = ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
            : 0;
        // Calculate occupancy rate (simplified)
        const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const occupancyRate = (totalNights / daysInPeriod) * 100;
        // Calculate conversion rate
        const conversionRate = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;
        return {
            propertyId: property.id,
            propertyName: property.name,
            propertyType: property.type,
            city: property.city,
            state: property.state,
            hostName: `${property.host.firstName} ${property.host.lastName}`,
            hostEmail: property.host.email,
            baseRate: property.baseRate,
            maxGuests: property.maxGuests,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            metrics: {
                totalBookings,
                confirmedBookings,
                cancelledBookings,
                totalRevenue,
                avgBookingValue: totalBookings > 0 ? totalRevenue / totalBookings : 0,
                totalNights,
                totalGuests,
                avgGuestsPerBooking: totalBookings > 0 ? totalGuests / totalBookings : 0,
                occupancyRate: Math.min(occupancyRate, 100), // Cap at 100%
                conversionRate,
                avgRating: Math.round(avgRating * 10) / 10,
                totalReviews: property.reviews.length,
                revenuePerNight: totalNights > 0 ? totalRevenue / totalNights : 0,
            },
        };
    });
    // Sort by performance score (revenue + rating)
    performanceData.sort((a, b) => {
        const scoreA = a.metrics.totalRevenue * 0.7 + a.metrics.avgRating * 1000 * 0.3;
        const scoreB = b.metrics.totalRevenue * 0.7 + b.metrics.avgRating * 1000 * 0.3;
        return scoreB - scoreA;
    });
    const reportData = {
        meta: {
            title: "Property Performance Report",
            period: { start, end },
            generatedAt: new Date(),
            generatedBy: `${req.user.firstName} ${req.user.lastName}`,
            filters: { propertyId, hostId },
        },
        summary: {
            totalProperties: performanceData.length,
            totalRevenue: performanceData.reduce((sum, p) => sum + p.metrics.totalRevenue, 0),
            totalBookings: performanceData.reduce((sum, p) => sum + p.metrics.totalBookings, 0),
            avgOccupancyRate: performanceData.length > 0
                ? performanceData.reduce((sum, p) => sum + p.metrics.occupancyRate, 0) / performanceData.length
                : 0,
            avgRating: performanceData.length > 0
                ? performanceData.reduce((sum, p) => sum + p.metrics.avgRating, 0) /
                    performanceData.length
                : 0,
        },
        data: performanceData,
    };
    (0, logger_middleware_1.auditLog)("PROPERTY_PERFORMANCE_REPORT_GENERATED", req.user.id, {
        period: { start, end },
        totalProperties: performanceData.length,
        format,
        filters: { propertyId, hostId },
    }, req.ip);
    if (format === "json") {
        res.json({
            success: true,
            data: reportData,
        });
    }
    else {
        const fileName = `property_performance_report_${Date.now()}`;
        await generateFileReport(reportData, format, fileName, res);
    }
}));
// ===============================
// CUSTOMER REPORTS
// ===============================
/**
 * @route   GET /reports/customers
 * @desc    Generate customer analysis reports
 * @access  Admin only
 */
/**
 * @swagger
 * /reports/customers:
 *   get:
 *     summary: Generate Customer Analysis Report
 *     description: Returns customer insights including bookings, spending, ratings, and segmentation (new, returning, VIP).
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report period (ISO8601 format).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report period (ISO8601 format).
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [month, quarter, year]
 *           default: quarter
 *         description: Predefined period shortcut.
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, excel, pdf]
 *           default: json
 *         description: Report output format.
 *       - in: query
 *         name: segment
 *         schema:
 *           type: string
 *           enum: [new, returning, vip, all]
 *           default: all
 *         description: Filter customers by segment.
 *     responses:
 *       200:
 *         description: Customer analysis report generated successfully
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
 *                     meta:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                           example: Customer Analysis Report
 *                         period:
 *                           type: object
 *                           properties:
 *                             start:
 *                               type: string
 *                               format: date-time
 *                             end:
 *                               type: string
 *                               format: date-time
 *                         segment:
 *                           type: string
 *                           example: all
 *                         generatedAt:
 *                           type: string
 *                           format: date-time
 *                         generatedBy:
 *                           type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalCustomers:
 *                           type: integer
 *                         newCustomers:
 *                           type: integer
 *                         returningCustomers:
 *                           type: integer
 *                         vipCustomers:
 *                           type: integer
 *                         totalRevenue:
 *                           type: number
 *                         avgCustomerValue:
 *                           type: number
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           customerId:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           email:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           joinedAt:
 *                             type: string
 *                             format: date-time
 *                           segment:
 *                             type: string
 *                             enum: [new, returning, vip]
 *                           metrics:
 *                             type: object
 *                             properties:
 *                               totalBookings:
 *                                 type: integer
 *                               completedBookings:
 *                                 type: integer
 *                               totalSpent:
 *                                 type: number
 *                               avgSpendPerBooking:
 *                                 type: number
 *                               totalReviews:
 *                                 type: integer
 *                               avgRating:
 *                                 type: number
 *                               lastBooking:
 *                                 type: string
 *                                 format: date-time
 *                                 nullable: true
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (only admins allowed)
 *       500:
 *         description: Server error
 */
router.get("/customers", (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), [
    (0, express_validator_1.query)("startDate").optional().isISO8601(),
    (0, express_validator_1.query)("endDate").optional().isISO8601(),
    (0, express_validator_1.query)("period").optional().isIn(["month", "quarter", "year"]),
    (0, express_validator_1.query)("format").optional().isIn(["json", "csv", "excel", "pdf"]),
    (0, express_validator_1.query)("segment").optional().isIn(["new", "returning", "vip", "all"]),
], validate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate, period = "quarter", format = "json", segment = "all", } = req.query;
    const { start, end } = getDateRange(startDate, endDate, period);
    // Get customer data
    const customers = await server_1.prisma.user.findMany({
        where: {
            role: client_1.UserRole.CUSTOMER,
            createdAt: { gte: start, lte: end },
        },
        include: {
            bookings: {
                where: {
                    paymentStatus: client_1.PaymentStatus.PAID,
                },
                select: {
                    total: true,
                    createdAt: true,
                    status: true,
                },
            },
            reviews: {
                where: { approved: true },
                select: {
                    rating: true,
                    createdAt: true,
                },
            },
        },
    });
    // Process customer data
    const customerData = customers.map((customer) => {
        const totalSpent = customer.bookings.reduce((sum, b) => sum + b.total, 0);
        const completedBookings = customer.bookings.filter((b) => b.status === client_1.BookingStatus.COMPLETED).length;
        const avgSpendPerBooking = customer.bookings.length > 0
            ? totalSpent / customer.bookings.length
            : 0;
        const ratings = customer.reviews.map((r) => r.rating);
        const avgRating = ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
            : 0;
        // Determine customer segment
        let customerSegment = "new";
        if (totalSpent > 100000)
            customerSegment = "vip";
        else if (customer.bookings.length > 1)
            customerSegment = "returning";
        return {
            customerId: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone,
            joinedAt: customer.createdAt,
            segment: customerSegment,
            metrics: {
                totalBookings: customer.bookings.length,
                completedBookings,
                totalSpent,
                avgSpendPerBooking,
                totalReviews: customer.reviews.length,
                avgRating: Math.round(avgRating * 10) / 10,
                lastBooking: customer.bookings.length > 0
                    ? Math.max(...customer.bookings.map((b) => b.createdAt.getTime()))
                    : null,
            },
        };
    });
    // Filter by segment if specified
    const filteredData = segment === "all"
        ? customerData
        : customerData.filter((c) => c.segment === segment);
    const reportData = {
        meta: {
            title: "Customer Analysis Report",
            period: { start, end },
            segment,
            generatedAt: new Date(),
            generatedBy: `${req.user.firstName} ${req.user.lastName}`,
        },
        summary: {
            totalCustomers: filteredData.length,
            newCustomers: filteredData.filter((c) => c.segment === "new").length,
            returningCustomers: filteredData.filter((c) => c.segment === "returning").length,
            vipCustomers: filteredData.filter((c) => c.segment === "vip").length,
            totalRevenue: filteredData.reduce((sum, c) => sum + c.metrics.totalSpent, 0),
            avgCustomerValue: filteredData.length > 0
                ? filteredData.reduce((sum, c) => sum + c.metrics.totalSpent, 0) /
                    filteredData.length
                : 0,
        },
        data: filteredData,
    };
    (0, logger_middleware_1.auditLog)("CUSTOMER_REPORT_GENERATED", req.user.id, {
        period: { start, end },
        segment,
        totalCustomers: filteredData.length,
        format,
    }, req.ip);
    if (format === "json") {
        res.json({
            success: true,
            data: reportData,
        });
    }
    else {
        const fileName = `customer_report_${Date.now()}`;
        await generateFileReport(reportData, format, fileName, res);
    }
}));
// ===============================
// HELPER FUNCTION FOR FILE GENERATION
// ===============================
async function generateFileReport(data, format, fileName, res) {
    const uploadsDir = path_1.default.join(process.cwd(), "uploads", "reports");
    // Ensure directory exists
    const fs = require("fs");
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    switch (format) {
        case "csv":
            await generateCSVReport(data, fileName, uploadsDir, res);
            break;
        case "excel":
            await generateExcelReport(data, fileName, uploadsDir, res);
            break;
        case "pdf":
            await generatePDFReport(data, fileName, uploadsDir, res);
            break;
        default:
            throw new error_middleware_2.AppError("Unsupported format", 400);
    }
}
async function generateCSVReport(data, fileName, uploadsDir, res) {
    const filePath = path_1.default.join(uploadsDir, `${fileName}.csv`);
    if (data.data.length > 0) {
        const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
            path: filePath,
            header: Object.keys(data.data[0]).map((key) => ({ id: key, title: key })),
        });
        await csvWriter.writeRecords(data.data);
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}.csv"`);
    res.sendFile(filePath);
}
async function generateExcelReport(data, fileName, uploadsDir, res) {
    const filePath = path_1.default.join(uploadsDir, `${fileName}.xlsx`);
    const workbook = new exceljs_1.default.Workbook();
    // Summary sheet
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.addRow(["Report Title", data.meta.title]);
    summarySheet.addRow(["Generated At", data.meta.generatedAt]);
    summarySheet.addRow(["Generated By", data.meta.generatedBy]);
    summarySheet.addRow([]); // Empty row
    // Add summary data
    Object.entries(data.summary).forEach(([key, value]) => {
        summarySheet.addRow([key, value]);
    });
    // Data sheet
    if (data.data.length > 0) {
        const dataSheet = workbook.addWorksheet("Data");
        const headers = Object.keys(data.data[0]);
        dataSheet.addRow(headers);
        data.data.forEach((row) => {
            dataSheet.addRow(headers.map((header) => row[header]));
        });
    }
    await workbook.xlsx.writeFile(filePath);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}.xlsx"`);
    res.sendFile(filePath);
}
async function generatePDFReport(data, fileName, uploadsDir, res) {
    const filePath = path_1.default.join(uploadsDir, `${fileName}.pdf`);
    const doc = new pdfkit_1.default();
    doc.pipe(require("fs").createWriteStream(filePath));
    // Header
    doc.fontSize(20).text(data.meta.title, 50, 50);
    doc.fontSize(12).text(`Generated: ${data.meta.generatedAt}`, 50, 80);
    doc.text(`Generated by: ${data.meta.generatedBy}`, 50, 100);
    // Summary
    doc.fontSize(16).text("Summary", 50, 140);
    let yPosition = 160;
    Object.entries(data.summary).forEach(([key, value]) => {
        doc.fontSize(12).text(`${key}: ${value}`, 50, yPosition);
        yPosition += 20;
    });
    doc.end();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}.pdf"`);
    res.sendFile(filePath);
}
/**
 * @route   GET /reports/available
 * @desc    Get available report types
 * @access  Protected
 */
/**
 * @swagger
 * /reports/available:
 *   get:
 *     summary: Get available reports
 *     description: Returns a list of report types available to the authenticated user based on their role.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched available reports
 *         content:
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
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: bookings
 *                       name:
 *                         type: string
 *                         example: Booking Reports
 *                       description:
 *                         type: string
 *                         example: Detailed booking analysis and trends
 *                       access:
 *                         type: array
 *                         items:
 *                           type: string
 *                           example: ADMIN
 *                       formats:
 *                         type: array
 *                         items:
 *                           type: string
 *                           example: pdf
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - User role not allowed to access reports
 */
router.get("/available", (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const reports = [
        {
            id: "bookings",
            name: "Booking Reports",
            description: "Detailed booking analysis and trends",
            access: [client_1.UserRole.ADMIN, client_1.UserRole.ADMIN],
            formats: ["json", "csv", "excel", "pdf"],
        },
        {
            id: "revenue",
            name: "Revenue Reports",
            description: "Financial performance and revenue analysis",
            access: [client_1.UserRole.ADMIN, client_1.UserRole.ADMIN],
            formats: ["json", "csv", "excel", "pdf"],
        },
        {
            id: "property-performance",
            name: "Property Performance",
            description: "Individual property metrics and performance",
            access: [client_1.UserRole.ADMIN, client_1.UserRole.ADMIN],
            formats: ["json", "csv", "excel", "pdf"],
        },
        {
            id: "customers",
            name: "Customer Analysis",
            description: "Customer behavior and segmentation analysis",
            access: [client_1.UserRole.ADMIN],
            formats: ["json", "csv", "excel", "pdf"],
        },
    ];
    // Filter reports based on user role
    const availableReports = reports.filter((report) => report.access.includes(req.user.role));
    res.json({
        success: true,
        data: availableReports,
    });
}));
exports.default = router;
