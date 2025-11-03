"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = exports.AUDIT_RETENTION_POLICIES = void 0;
// MAR ABU PROJECTS SERVICES LLC - Audit Service
const server_1 = require("../server");
const logger_middleware_1 = require("../middlewares/logger.middleware");
/**
 * GDPR-Compliant Audit Log Retention Periods
 */
exports.AUDIT_RETENTION_POLICIES = {
    // Financial/Tax Records - Keep for 7 years (legal requirement)
    FINANCIAL: {
        days: 7 * 365, // 7 years
        actions: [
            "BOOKING_CREATED",
            "BOOKING_APPROVED",
            "BOOKING_PAYMENT_COMPLETED",
            "PAYMENT_VERIFIED",
            "PAYMENT_RECEIVED",
            "RECEIPT_VERIFIED",
            "REFUND_PROCESSED",
        ],
    },
    // User Data Management - Keep for 3 years (accountability)
    USER_MANAGEMENT: {
        days: 3 * 365, // 3 years
        actions: [
            "USER_CREATED",
            "USER_UPDATED",
            "USER_SOFT_DELETED",
            "USER_HARD_DELETED",
            "CUSTOMER_SOFT_DELETED_BY_EMAIL",
            "ROLE_CHANGED",
            "STATUS_CHANGED",
        ],
    },
    // Security/Access Logs - Keep for 1 year
    SECURITY: {
        days: 365, // 1 year
        actions: [
            "LOGIN",
            "LOGOUT",
            "LOGIN_FAILED",
            "PASSWORD_CHANGED",
            "OTP_SENT",
            "OTP_VERIFIED",
            "TOKEN_REFRESHED",
        ],
    },
    // Administrative Actions - Keep for 2 years
    ADMIN_ACTIONS: {
        days: 2 * 365, // 2 years
        actions: [
            "PROPERTY_STATUS_UPDATED",
            "BOOKING_STATUS_CHANGED",
            "SETTINGS_UPDATED",
            "SYSTEM_CONFIG_CHANGED",
            "AUDIT_LOGS_VIEWED",
            "AUDIT_LOGS_DOWNLOADED",
            "DELETED_USERS_VIEWED",
        ],
    },
    // General Activity - Keep for 6 months
    GENERAL: {
        days: 180, // 6 months
        actions: ["*"], // Catch-all for unspecified actions
    },
};
class AuditService {
    /**
     * Create an audit log entry in the database
     */
    async createAuditLog(entry) {
        try {
            await server_1.prisma.auditLog.create({
                data: {
                    action: entry.action,
                    entity: entry.entity,
                    entityId: entry.entityId || null,
                    userId: entry.userId || null,
                    changes: entry.changes || null,
                    metadata: {
                        ...entry.metadata,
                        userEmail: entry.userEmail,
                    },
                },
            });
        }
        catch (error) {
            logger_middleware_1.logger.error("Failed to create audit log:", error);
            // Don't throw - audit logging should never break the application
        }
    }
    /**
     * Get audit logs from database with filters and pagination
     */
    async getAuditLogs(options) {
        const { page = 1, limit = 50, action, entity, entityId, userId, userEmail, startDate, endDate, } = options;
        const where = {};
        if (action)
            where.action = { contains: action, mode: "insensitive" };
        if (entity)
            where.entity = { contains: entity, mode: "insensitive" };
        if (entityId)
            where.entityId = entityId;
        if (userId)
            where.userId = userId;
        if (userEmail) {
            where.metadata = {
                path: ["userEmail"],
                string_contains: userEmail,
            };
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = startDate;
            if (endDate)
                where.createdAt.lte = endDate;
        }
        const [logs, total] = await Promise.all([
            server_1.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: {
                        select: {
                            email: true,
                            role: true,
                        },
                    },
                },
            }),
            server_1.prisma.auditLog.count({ where }),
        ]);
        return {
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Get retention period for an action based on GDPR policies
     */
    getRetentionPeriod(action) {
        // Check each policy category
        for (const [category, policy] of Object.entries(exports.AUDIT_RETENTION_POLICIES)) {
            if (policy.actions.includes(action) || policy.actions.includes("*")) {
                return policy.days;
            }
        }
        // Default to general retention if not found
        return exports.AUDIT_RETENTION_POLICIES.GENERAL.days;
    }
    /**
     * Clean up old audit logs based on GDPR retention policies
     * Returns count of deleted logs by category
     */
    async cleanupOldAuditLogs() {
        const deletedByCategory = {};
        let totalDeleted = 0;
        logger_middleware_1.logger.info("Starting GDPR-compliant audit log cleanup...");
        try {
            // Process each retention policy
            for (const [category, policy] of Object.entries(exports.AUDIT_RETENTION_POLICIES)) {
                if (policy.actions.includes("*")) {
                    // Skip the catch-all for now
                    continue;
                }
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - policy.days);
                const deleted = await server_1.prisma.auditLog.deleteMany({
                    where: {
                        action: { in: policy.actions },
                        createdAt: { lt: cutoffDate },
                    },
                });
                deletedByCategory[category] = deleted.count;
                totalDeleted += deleted.count;
                logger_middleware_1.logger.info(`Cleaned up ${deleted.count} ${category} audit logs older than ${policy.days} days`);
            }
            // Clean up general logs (catch-all) that don't match any specific policy
            const generalCutoffDate = new Date();
            generalCutoffDate.setDate(generalCutoffDate.getDate() - exports.AUDIT_RETENTION_POLICIES.GENERAL.days);
            const allSpecificActions = Object.values(exports.AUDIT_RETENTION_POLICIES)
                .filter((policy) => !policy.actions.includes("*"))
                .flatMap((policy) => policy.actions);
            const deletedGeneral = await server_1.prisma.auditLog.deleteMany({
                where: {
                    action: { notIn: allSpecificActions },
                    createdAt: { lt: generalCutoffDate },
                },
            });
            deletedByCategory["GENERAL"] = deletedGeneral.count;
            totalDeleted += deletedGeneral.count;
            logger_middleware_1.logger.info(`Cleaned up ${deletedGeneral.count} GENERAL audit logs older than ${exports.AUDIT_RETENTION_POLICIES.GENERAL.days} days`);
            logger_middleware_1.logger.info(`Total audit logs cleaned up: ${totalDeleted}`);
            return { deletedByCategory, totalDeleted };
        }
        catch (error) {
            logger_middleware_1.logger.error("Error during audit log cleanup:", error);
            throw error;
        }
    }
    /**
     * Archive old audit logs to file before deletion (for compliance)
     */
    async archiveOldAuditLogs() {
        const fs = require("fs").promises;
        const path = require("path");
        try {
            // Get logs older than the shortest retention period
            const archiveCutoffDate = new Date();
            archiveCutoffDate.setDate(archiveCutoffDate.getDate() - exports.AUDIT_RETENTION_POLICIES.GENERAL.days);
            const logsToArchive = await server_1.prisma.auditLog.findMany({
                where: {
                    createdAt: { lt: archiveCutoffDate },
                },
                orderBy: { createdAt: "desc" },
            });
            if (logsToArchive.length === 0) {
                return { archivedFile: "", count: 0 };
            }
            // Create archive directory if it doesn't exist
            const archiveDir = path.join(process.cwd(), "logs", "archives");
            await fs.mkdir(archiveDir, { recursive: true });
            // Create archive file
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const archiveFile = path.join(archiveDir, `audit-archive-${timestamp}.json`);
            await fs.writeFile(archiveFile, JSON.stringify(logsToArchive, null, 2), "utf-8");
            logger_middleware_1.logger.info(`Archived ${logsToArchive.length} audit logs to ${archiveFile}`);
            return {
                archivedFile: archiveFile,
                count: logsToArchive.length,
            };
        }
        catch (error) {
            logger_middleware_1.logger.error("Error archiving audit logs:", error);
            throw error;
        }
    }
    /**
     * Get audit log statistics
     */
    async getAuditLogStats(days = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const [totalLogs, recentLogs, actionCounts, userActivity, retentionStatus] = await Promise.all([
            // Total logs count
            server_1.prisma.auditLog.count(),
            // Recent logs count
            server_1.prisma.auditLog.count({
                where: { createdAt: { gte: cutoffDate } },
            }),
            // Action counts
            server_1.prisma.auditLog.groupBy({
                by: ["action"],
                _count: true,
                where: { createdAt: { gte: cutoffDate } },
                orderBy: { _count: { action: "desc" } },
                take: 20,
            }),
            // User activity
            server_1.prisma.auditLog.groupBy({
                by: ["userId"],
                _count: true,
                where: {
                    createdAt: { gte: cutoffDate },
                    userId: { not: null },
                },
                orderBy: { _count: { userId: "desc" } },
                take: 10,
            }),
            // Retention status - logs approaching deletion
            this.getRetentionStatus(),
        ]);
        return {
            totalLogs,
            recentLogs,
            actionCounts: actionCounts.map((item) => ({
                action: item.action,
                count: item._count,
            })),
            userActivity: await Promise.all(userActivity.map(async (item) => {
                const user = await server_1.prisma.user.findUnique({
                    where: { id: item.userId },
                    select: { email: true },
                });
                return {
                    userId: item.userId,
                    email: user?.email || "Unknown",
                    count: item._count,
                };
            })),
            retentionStatus,
            dateRange: {
                from: cutoffDate,
                to: new Date(),
            },
        };
    }
    /**
     * Get retention status - logs approaching deletion by category
     */
    async getRetentionStatus() {
        const status = {};
        for (const [category, policy] of Object.entries(exports.AUDIT_RETENTION_POLICIES)) {
            if (policy.actions.includes("*"))
                continue;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - policy.days);
            const count = await server_1.prisma.auditLog.count({
                where: {
                    action: { in: policy.actions },
                    createdAt: { lt: cutoffDate },
                },
            });
            status[category] = {
                willBeDeleted: count,
                daysUntilDeletion: policy.days,
            };
        }
        return status;
    }
}
exports.AuditService = AuditService;
// Export singleton instance
exports.auditService = new AuditService();
