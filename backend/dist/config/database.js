"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbQueries = void 0;
exports.checkDatabaseConnection = checkDatabaseConnection;
exports.withTransaction = withTransaction;
exports.paginate = paginate;
// MAR ABU PROJECTS SERVICES LLC - Database Configuration
const client_1 = require("@prisma/client");
const logger_middleware_1 = require("../middlewares/logger.middleware");
// Extend PrismaClient with middleware
const prismaClientSingleton = () => {
    const prisma = new client_1.PrismaClient({
        log: process.env.NODE_ENV === "development"
            ? ["query", "info", "warn", "error"]
            : ["error"],
        errorFormat: "pretty",
    });
    // Middleware for query logging in development
    if (process.env.NODE_ENV === "development") {
        prisma.$use(async (params, next) => {
            const before = Date.now();
            const result = await next(params);
            const after = Date.now();
            logger_middleware_1.logger.debug({
                model: params.model,
                action: params.action,
                duration: `${after - before}ms`,
            });
            return result;
        });
    }
    // Middleware for soft deletes (if needed in future)
    prisma.$use(async (params, next) => {
        // Handle soft deletes for specific models
        if (params.model === "User" || params.model === "Property") {
            if (params.action === "delete") {
                params.action = "update";
                params.args["data"] = { deletedAt: new Date() };
            }
            if (params.action === "deleteMany") {
                params.action = "updateMany";
                if (params.args.data !== undefined) {
                    params.args.data["deletedAt"] = new Date();
                }
                else {
                    params.args["data"] = { deletedAt: new Date() };
                }
            }
        }
        return next(params);
    });
    return prisma;
};
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();
if (process.env.NODE_ENV !== "production")
    globalThis.prismaGlobal = prisma;
// Database health check
async function checkDatabaseConnection() {
    try {
        await prisma.$queryRaw `SELECT 1`;
        logger_middleware_1.logger.info("Database connection successful");
        return true;
    }
    catch (error) {
        logger_middleware_1.logger.error("Database connection failed:", error);
        return false;
    }
}
// Transaction helper
async function withTransaction(fn) {
    return prisma.$transaction(async (tx) => {
        return fn(tx);
    });
}
async function paginate(model, params, where, include, orderBy) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        model.findMany({
            where,
            include,
            orderBy,
            skip,
            take: limit,
        }),
        model.count({ where }),
    ]);
    const pages = Math.ceil(total / limit);
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            pages,
            hasNext: page < pages,
            hasPrev: page > 1,
        },
    };
}
// Common database queries
exports.dbQueries = {
    // Check if email exists
    async emailExists(email) {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        return !!user;
    },
    // Get system settings
    async getSystemSettings() {
        const settings = await prisma.systemSetting.findMany();
        return settings.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {});
    },
    // Get active properties count
    async getActivePropertiesCount() {
        return prisma.property.count({
            where: { status: "ACTIVE" },
        });
    },
    // Get booking statistics
    async getBookingStats(startDate, endDate) {
        const where = {};
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = startDate;
            if (endDate)
                where.createdAt.lte = endDate;
        }
        const [total, pending, approved, completed, cancelled] = await Promise.all([
            prisma.booking.count({ where }),
            prisma.booking.count({ where: { ...where, status: "PENDING" } }),
            prisma.booking.count({ where: { ...where, status: "APPROVED" } }),
            prisma.booking.count({ where: { ...where, status: "COMPLETED" } }),
            prisma.booking.count({ where: { ...where, status: "CANCELLED" } }),
        ]);
        const revenue = await prisma.booking.aggregate({
            where: {
                ...where,
                status: { in: ["APPROVED", "COMPLETED"] },
                paymentStatus: "PAID",
            },
            _sum: {
                total: true,
            },
        });
        return {
            total,
            pending,
            approved,
            completed,
            cancelled,
            revenue: revenue._sum.total || 0,
        };
    },
};
exports.default = prisma;
