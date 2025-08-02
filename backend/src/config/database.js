"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a;
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
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'info', 'warn', 'error']
            : ['error'],
        errorFormat: 'pretty',
    });
    // Middleware for query logging in development
    if (process.env.NODE_ENV === 'development') {
        prisma.$use((params, next) => __awaiter(void 0, void 0, void 0, function* () {
            const before = Date.now();
            const result = yield next(params);
            const after = Date.now();
            logger_middleware_1.logger.debug({
                model: params.model,
                action: params.action,
                duration: `${after - before}ms`,
            });
            return result;
        }));
    }
    // Middleware for soft deletes (if needed in future)
    prisma.$use((params, next) => __awaiter(void 0, void 0, void 0, function* () {
        // Handle soft deletes for specific models
        if (params.model === 'User' || params.model === 'Property') {
            if (params.action === 'delete') {
                params.action = 'update';
                params.args['data'] = { deletedAt: new Date() };
            }
            if (params.action === 'deleteMany') {
                params.action = 'updateMany';
                if (params.args.data !== undefined) {
                    params.args.data['deletedAt'] = new Date();
                }
                else {
                    params.args['data'] = { deletedAt: new Date() };
                }
            }
        }
        return next(params);
    }));
    return prisma;
};
const prisma = (_a = globalThis.prismaGlobal) !== null && _a !== void 0 ? _a : prismaClientSingleton();
if (process.env.NODE_ENV !== 'production')
    globalThis.prismaGlobal = prisma;
// Database health check
function checkDatabaseConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield prisma.$queryRaw `SELECT 1`;
            logger_middleware_1.logger.info('Database connection successful');
            return true;
        }
        catch (error) {
            logger_middleware_1.logger.error('Database connection failed:', error);
            return false;
        }
    });
}
// Transaction helper
function withTransaction(fn) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            return fn(tx);
        }));
    });
}
function paginate(model, params, where, include, orderBy) {
    return __awaiter(this, void 0, void 0, function* () {
        const { page, limit } = params;
        const skip = (page - 1) * limit;
        const [data, total] = yield Promise.all([
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
    });
}
// Common database queries
exports.dbQueries = {
    // Check if email exists
    emailExists(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prisma.user.findUnique({
                where: { email: email.toLowerCase() },
            });
            return !!user;
        });
    },
    // Get system settings
    getSystemSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            const settings = yield prisma.systemSetting.findMany();
            return settings.reduce((acc, setting) => {
                acc[setting.key] = setting.value;
                return acc;
            }, {});
        });
    },
    // Get active properties count
    getActivePropertiesCount() {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.property.count({
                where: { status: 'ACTIVE' },
            });
        });
    },
    // Get booking statistics
    getBookingStats(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const where = {};
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate)
                    where.createdAt.gte = startDate;
                if (endDate)
                    where.createdAt.lte = endDate;
            }
            const [total, pending, approved, completed, cancelled] = yield Promise.all([
                prisma.booking.count({ where }),
                prisma.booking.count({ where: Object.assign(Object.assign({}, where), { status: 'PENDING' }) }),
                prisma.booking.count({ where: Object.assign(Object.assign({}, where), { status: 'APPROVED' }) }),
                prisma.booking.count({ where: Object.assign(Object.assign({}, where), { status: 'COMPLETED' }) }),
                prisma.booking.count({ where: Object.assign(Object.assign({}, where), { status: 'CANCELLED' }) }),
            ]);
            const revenue = yield prisma.booking.aggregate({
                where: Object.assign(Object.assign({}, where), { status: { in: ['APPROVED', 'COMPLETED'] }, paymentStatus: 'PAID' }),
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
        });
    },
};
exports.default = prisma;
