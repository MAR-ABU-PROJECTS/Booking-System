"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// MAR ABU PROJECTS SERVICES LLC - Dashboard Data Routes
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const authservice_1 = require("../services/authservice");
const error_middleware_1 = require("../middlewares/error.middleware");
const server_1 = require("../server");
const router = (0, express_1.Router)();
// Validation middleware
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    next();
};
// Helper function to get date ranges
const getDateRanges = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thisYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    return { now, today, yesterday, thisWeek, thisMonth, thisYear };
};
// ===============================
// CUSTOMER DASHBOARD
// ===============================
/**
 * @route   GET /api/v1/dashboard/customer
 * @desc    Get customer dashboard data
 * @access  Customer
 */
router.get('/customer', (0, authservice_1.requireAuth)({ role: client_1.UserRole.CUSTOMER }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { thisMonth, thisYear } = getDateRanges();
    const [totalBookings, upcomingBookings, recentBookings, favoriteProperties, reviewsToWrite, totalSpent, memberSince, loyaltyPoints,] = await Promise.all([
        // Total bookings count
        server_1.prisma.booking.count({
            where: { customerId: userId },
        }),
        // Upcoming bookings
        server_1.prisma.booking.findMany({
            where: {
                customerId: userId,
                status: client_1.BookingStatus.APPROVED,
                checkInDate: { gte: new Date() },
            },
            orderBy: { checkInDate: 'asc' },
            take: 5,
            include: {
                property: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        city: true,
                        images: true,
                        host: {
                            select: {
                                firstName: true,
                                lastName: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
        }),
        // Recent bookings
        server_1.prisma.booking.findMany({
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
        // Favorite properties
        server_1.prisma.favorite.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 8,
            include: {
                property: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        city: true,
                        baseRate: true,
                        images: true,
                        reviews: {
                            where: { approved: true },
                            select: { rating: true },
                        },
                    },
                },
            },
        }),
        // Completed bookings without reviews
        server_1.prisma.booking.findMany({
            where: {
                customerId: userId,
                status: client_1.BookingStatus.COMPLETED,
                checkOutDate: { lt: new Date() },
                review: null,
            },
            orderBy: { checkOutDate: 'desc' },
            take: 5,
            include: {
                property: {
                    select: {
                        id: true,
                        name: true,
                        images: true,
                    },
                },
            },
        }),
        // Total amount spent
        server_1.prisma.booking.aggregate({
            where: {
                customerId: userId,
                paymentStatus: client_1.PaymentStatus.PAID,
            },
            _sum: { total: true },
        }),
        // Member since
        server_1.prisma.user.findUnique({
            where: { id: userId },
            select: { createdAt: true },
        }),
        // Loyalty points (mock calculation)
        server_1.prisma.booking.aggregate({
            where: {
                customerId: userId,
                paymentStatus: client_1.PaymentStatus.PAID,
            },
            _sum: { total: true },
        }),
    ]);
    // Calculate averages and stats
    const avgRatingFavorites = favoriteProperties.map(fav => {
        const ratings = fav.property.reviews.map(r => r.rating);
        return {
            ...fav,
            property: {
                ...fav.property,
                averageRating: ratings.length > 0
                    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
                    : 0,
                reviews: undefined,
            },
        };
    });
    // Calculate loyalty points (1 point per ₦100 spent)
    const points = Math.floor((totalSpent._sum.total || 0) / 100);
    // Booking stats by status
    const bookingStats = await server_1.prisma.booking.groupBy({
        by: ['status'],
        where: { customerId: userId },
        _count: { status: true },
    });
    const statusCounts = bookingStats.reduce((acc, stat) => {
        acc[stat.status.toLowerCase()] = stat._count.status;
        return acc;
    }, {});
    res.json({
        success: true,
        data: {
            overview: {
                totalBookings,
                upcomingBookings: upcomingBookings.length,
                favoriteProperties: favoriteProperties.length,
                reviewsToWrite: reviewsToWrite.length,
                totalSpent: totalSpent._sum.total || 0,
                loyaltyPoints: points,
                memberSince: memberSince?.createdAt,
            },
            bookingStats: statusCounts,
            upcomingBookings,
            recentBookings,
            favoriteProperties: avgRatingFavorites,
            reviewsToWrite,
        },
    });
}));
// ===============================
// PROPERTY HOST DASHBOARD
// ===============================
/**
 * @route   GET /api/v1/dashboard/host
 * @desc    Get property host dashboard data
 * @access  Property Host
 */
router.get('/host', (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const hostId = req.user.id;
    const { today, thisWeek, thisMonth, thisYear } = getDateRanges();
    const [properties, totalBookings, pendingBookings, recentBookings, earnings, monthlyEarnings, upcomingCheckIns, recentReviews, occupancyRate,] = await Promise.all([
        // Properties overview
        server_1.prisma.property.findMany({
            where: { hostId },
            include: {
                _count: {
                    select: {
                        bookings: {
                            where: {
                                createdAt: { gte: thisMonth },
                            },
                        },
                        reviews: {
                            where: { approved: true },
                        },
                    },
                },
                reviews: {
                    where: { approved: true },
                    select: { rating: true },
                },
            },
        }),
        // Total bookings
        server_1.prisma.booking.count({
            where: {
                property: { hostId },
            },
        }),
        // Pending bookings requiring attention
        server_1.prisma.booking.findMany({
            where: {
                property: { hostId },
                status: client_1.BookingStatus.PENDING,
            },
            orderBy: { createdAt: 'asc' },
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
        // Recent bookings
        server_1.prisma.booking.findMany({
            where: {
                property: { hostId },
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
                    },
                },
            },
        }),
        // Total earnings
        server_1.prisma.booking.aggregate({
            where: {
                property: { hostId },
                paymentStatus: client_1.PaymentStatus.PAID,
            },
            _sum: { total: true },
        }),
        // Monthly earnings
        server_1.prisma.booking.aggregate({
            where: {
                property: { hostId },
                paymentStatus: client_1.PaymentStatus.PAID,
                createdAt: { gte: thisMonth },
            },
            _sum: { total: true },
        }),
        // Upcoming check-ins
        server_1.prisma.booking.findMany({
            where: {
                property: { hostId },
                status: client_1.BookingStatus.APPROVED,
                checkInDate: {
                    gte: today,
                    lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
                },
            },
            orderBy: { checkInDate: 'asc' },
            include: {
                property: {
                    select: { name: true },
                },
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        }),
        // Recent reviews
        server_1.prisma.review.findMany({
            where: {
                property: { hostId },
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
        // Calculate occupancy rate for current month
        server_1.prisma.$queryRaw `
        SELECT 
          COUNT(DISTINCT property_id) as total_properties,
          COUNT(DISTINCT CASE 
            WHEN status IN ('APPROVED', 'COMPLETED') 
            AND check_in >= ${thisMonth}
            THEN property_id 
          END) as occupied_properties
        FROM booking b
        JOIN property p ON b.property_id = p.id
        WHERE p.host_id = ${hostId}
      `,
    ]);
    // Process properties with stats
    const propertiesWithStats = properties.map(property => {
        const ratings = property.reviews.map(r => r.rating);
        const averageRating = ratings.length > 0
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
            : 0;
        return {
            ...property,
            averageRating: Math.round(averageRating * 10) / 10,
            monthlyBookings: property._count.bookings,
            totalReviews: property._count.reviews,
            reviews: undefined,
        };
    });
    // Calculate performance metrics
    const totalProperties = properties.length;
    const activeProperties = properties.filter(p => p.status === client_1.PropertyStatus.ACTIVE).length;
    const pendingProperties = properties.filter(p => p.status === client_1.PropertyStatus.PENDING).length;
    // Revenue trends (last 6 months)
    const revenueHistory = await server_1.prisma.$queryRaw `
      SELECT 
        EXTRACT(YEAR FROM created_at) as year,
        EXTRACT(MONTH FROM created_at) as month,
        SUM(total) as revenue,
        COUNT(*) as bookings
      FROM booking b
      JOIN property p ON b.property_id = p.id
      WHERE p.host_id = ${hostId}
      AND b.payment_status = 'PAID'
      AND b.created_at >= ${new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)}
      GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
      ORDER BY year DESC, month DESC
      LIMIT 6
    `;
    res.json({
        success: true,
        data: {
            overview: {
                totalProperties,
                activeProperties,
                pendingProperties,
                totalBookings,
                pendingBookings: pendingBookings.length,
                totalEarnings: earnings._sum.total || 0,
                monthlyEarnings: monthlyEarnings._sum.total || 0,
                upcomingCheckIns: upcomingCheckIns.length,
                averageRating: propertiesWithStats.length > 0
                    ? propertiesWithStats.reduce((sum, p) => sum + p.averageRating, 0) / propertiesWithStats.length
                    : 0,
            },
            properties: propertiesWithStats,
            pendingBookings,
            recentBookings,
            upcomingCheckIns,
            recentReviews,
            revenueHistory,
        },
    });
}));
// ===============================
// ADMIN DASHBOARD
// ===============================
/**
 * @route   GET /api/v1/dashboard/admin
 * @desc    Get admin dashboard data
 * @access  Admin
 */
router.get('/admin', (0, authservice_1.requireAuth)({ role: client_1.UserRole.ADMIN }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { today, yesterday, thisWeek, thisMonth, thisYear } = getDateRanges();
    const [userStats, propertyStats, bookingStats, revenueStats, dailyMetrics, pendingApprovals, systemHealth, topPerformers,] = await Promise.all([
        // User statistics
        server_1.prisma.user.groupBy({
            by: ['role', 'status'],
            _count: { role: true },
        }),
        // Property statistics
        server_1.prisma.property.groupBy({
            by: ['status', 'type'],
            _count: { status: true },
        }),
        // Booking statistics
        server_1.prisma.booking.groupBy({
            by: ['status'],
            _count: { status: true },
        }),
        // Revenue statistics
        server_1.prisma.booking.aggregate({
            where: {
                paymentStatus: client_1.PaymentStatus.PAID,
                createdAt: { gte: thisMonth },
            },
            _sum: { total: true },
            _count: true,
        }),
        // Daily metrics comparison
        Promise.all([
            server_1.prisma.booking.count({
                where: { createdAt: { gte: today } },
            }),
            server_1.prisma.booking.count({
                where: {
                    createdAt: { gte: yesterday, lt: today },
                },
            }),
            server_1.prisma.user.count({
                where: { createdAt: { gte: today } },
            }),
            server_1.prisma.property.count({
                where: { createdAt: { gte: today } },
            }),
        ]),
        // Pending approvals
        Promise.all([
            server_1.prisma.property.count({
                where: { status: client_1.PropertyStatus.PENDING },
            }),
            server_1.prisma.review.count({
                where: { approved: false },
            }),
            server_1.prisma.booking.count({
                where: { status: client_1.BookingStatus.PENDING },
            }),
        ]),
        // System health indicators
        Promise.all([
            server_1.prisma.booking.count({
                where: {
                    status: client_1.BookingStatus.CANCELLED,
                    createdAt: { gte: thisWeek },
                },
            }),
            server_1.prisma.user.count({
                where: {
                    status: 'SUSPENDED',
                },
            }),
            server_1.prisma.auditLog.count({
                where: {
                    action: 'ERROR',
                    createdAt: { gte: today },
                },
            }),
        ]),
        // Top performing properties and hosts
        Promise.all([
            server_1.prisma.booking.groupBy({
                by: ['propertyId'],
                where: {
                    paymentStatus: client_1.PaymentStatus.PAID,
                    createdAt: { gte: thisMonth },
                },
                _sum: { total: true },
                _count: { propertyId: true },
                orderBy: { _sum: { total: 'desc' } },
                take: 5,
            }),
            server_1.prisma.$queryRaw `
          SELECT 
            p.host_id,
            u.first_name,
            u.last_name,
            COUNT(b.id) as bookings,
            SUM(b.total) as revenue
          FROM booking b
          JOIN property p ON b.property_id = p.id
          JOIN "user" u ON p.host_id = u.id
          WHERE b.payment_status = 'PAID'
          AND b.created_at >= ${thisMonth}
          GROUP BY p.host_id, u.first_name, u.last_name
          ORDER BY revenue DESC
          LIMIT 5
        `,
        ]),
    ]);
    // Process daily metrics
    const [todayBookings, yesterdayBookings, todayUsers, todayProperties] = dailyMetrics;
    const [pendingProperties, pendingReviews, pendingBookings] = pendingApprovals;
    const [weeklyCancellations, suspendedUsers, todayErrors] = systemHealth;
    const [topProperties, topHosts] = topPerformers;
    // Get property details for top performers
    const propertyIds = topProperties.map(p => p.propertyId);
    const propertyDetails = await server_1.prisma.property.findMany({
        where: { id: { in: propertyIds } },
        select: {
            id: true,
            name: true,
            city: true,
            type: true,
            host: {
                select: {
                    firstName: true,
                    lastName: true,
                },
            },
        },
    });
    const topPropertiesWithDetails = topProperties.map(prop => {
        const details = propertyDetails.find(p => p.id === prop.propertyId);
        return {
            property: details,
            revenue: prop._sum.total,
            bookings: prop._count.propertyId,
        };
    });
    // Calculate growth rates
    const bookingGrowth = yesterdayBookings > 0
        ? ((todayBookings - yesterdayBookings) / yesterdayBookings * 100).toFixed(1)
        : '0';
    // Format user and property stats
    const userStatsByRole = userStats.reduce((acc, stat) => {
        if (!acc[stat.role])
            acc[stat.role] = {};
        acc[stat.role][stat.status] = stat._count.role;
        return acc;
    }, {});
    const propertyStatsByStatus = propertyStats.reduce((acc, stat) => {
        if (!acc[stat.status])
            acc[stat.status] = 0;
        acc[stat.status] += stat._count.status;
        return acc;
    }, {});
    const bookingStatsByStatus = bookingStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
    }, {});
    res.json({
        success: true,
        data: {
            overview: {
                totalUsers: Object.values(userStatsByRole).reduce((sum, statuses) => sum + Object.values(statuses).reduce((s, count) => s + count, 0), 0),
                totalProperties: Object.values(propertyStatsByStatus).reduce((sum, count) => sum + count, 0),
                totalBookings: Object.values(bookingStatsByStatus).reduce((sum, count) => sum + count, 0),
                monthlyRevenue: revenueStats._sum.total || 0,
                todayBookings,
                bookingGrowth: `${bookingGrowth}%`,
            },
            stats: {
                users: userStatsByRole,
                properties: propertyStatsByStatus,
                bookings: bookingStatsByStatus,
            },
            pendingApprovals: {
                properties: pendingProperties,
                reviews: pendingReviews,
                bookings: pendingBookings,
                total: pendingProperties + pendingReviews + pendingBookings,
            },
            systemHealth: {
                weeklyCancellations,
                suspendedUsers,
                todayErrors,
                status: todayErrors > 10 ? 'CRITICAL' : todayErrors > 5 ? 'WARNING' : 'HEALTHY',
            },
            topPerformers: {
                properties: topPropertiesWithDetails,
                hosts: topHosts,
            },
            dailyMetrics: {
                newUsers: todayUsers,
                newProperties: todayProperties,
                newBookings: todayBookings,
            },
        },
    });
}));
// ===============================
// QUICK ACTIONS
// ===============================
/**
 * @route   GET /api/v1/dashboard/quick-actions
 * @desc    Get quick actions based on user role
 * @access  Protected
 */
router.get('/quick-actions', (0, authservice_1.requireAuth)(), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const actions = [];
    switch (req.user.role) {
        case client_1.UserRole.CUSTOMER:
            // Customer quick actions
            const upcomingBookings = await server_1.prisma.booking.count({
                where: {
                    customerId: req.user.id,
                    status: client_1.BookingStatus.APPROVED,
                    checkInDate: { gte: new Date() },
                },
            });
            const pendingReviews = await server_1.prisma.booking.count({
                where: {
                    customerId: req.user.id,
                    status: client_1.BookingStatus.COMPLETED,
                    review: null,
                },
            });
            actions.push({ type: 'search', label: 'Search Properties', count: 0, priority: 'high' }, { type: 'bookings', label: 'My Bookings', count: upcomingBookings, priority: 'medium' }, { type: 'reviews', label: 'Write Reviews', count: pendingReviews, priority: 'low' }, { type: 'favorites', label: 'My Favorites', count: 0, priority: 'low' });
            break;
        case client_1.UserRole.ADMIN:
            // Host quick actions
            const pendingBookings = await server_1.prisma.booking.count({
                where: {
                    property: { hostId: req.user.id },
                    status: client_1.BookingStatus.PENDING,
                },
            });
            const checkInsToday = await server_1.prisma.booking.count({
                where: {
                    property: { hostId: req.user.id },
                    status: client_1.BookingStatus.APPROVED,
                    checkInDate: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lt: new Date(new Date().setHours(23, 59, 59, 999)),
                    },
                },
            });
            actions.push({ type: 'bookings', label: 'Pending Bookings', count: pendingBookings, priority: 'high' }, { type: 'checkins', label: "Today's Check-ins", count: checkInsToday, priority: 'high' }, { type: 'properties', label: 'Manage Properties', count: 0, priority: 'medium' }, { type: 'earnings', label: 'View Earnings', count: 0, priority: 'medium' });
            break;
        case client_1.UserRole.ADMIN:
            // Admin quick actions
            const pendingApprovals = await Promise.all([
                server_1.prisma.property.count({ where: { status: client_1.PropertyStatus.PENDING } }),
                server_1.prisma.review.count({ where: { approved: false } }),
                server_1.prisma.booking.count({ where: { status: client_1.BookingStatus.PENDING } }),
            ]);
            const totalPending = pendingApprovals.reduce((sum, count) => sum + count, 0);
            actions.push({ type: 'approvals', label: 'Pending Approvals', count: totalPending, priority: 'high' }, { type: 'users', label: 'Manage Users', count: 0, priority: 'medium' }, { type: 'analytics', label: 'View Analytics', count: 0, priority: 'medium' }, { type: 'settings', label: 'System Settings', count: 0, priority: 'low' });
            break;
    }
    res.json({
        success: true,
        data: actions,
    });
}));
exports.default = router;
