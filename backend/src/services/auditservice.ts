// MAR ABU PROJECTS SERVICES LLC - Audit Service
import { prisma } from "../server";
import { logger } from "../middlewares/logger.middleware";

/**
 * GDPR-Compliant Audit Log Retention Periods
 */
export const AUDIT_RETENTION_POLICIES = {
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
    ] as string[],
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
    ] as string[],
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
    ] as string[],
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
    ] as string[],
  },

  // General Activity - Keep for 6 months
  GENERAL: {
    days: 180, // 6 months
    actions: ["*"] as string[], // Catch-all for unspecified actions
  },
};

export interface AuditLogEntry {
  action: string;
  entity: string;
  entityId?: string;
  userId?: string;
  userEmail?: string;
  changes?: any;
  metadata?: {
    ip?: string;
    userAgent?: string;
    [key: string]: any;
  };
}

export class AuditService {
  /**
   * Create an audit log entry in the database
   */
  async createAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
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
    } catch (error) {
      logger.error("Failed to create audit log:", error);
      // Don't throw - audit logging should never break the application
    }
  }

  /**
   * Get audit logs from database with filters and pagination
   */
  async getAuditLogs(options: {
    page?: number;
    limit?: number;
    action?: string;
    entity?: string;
    entityId?: string;
    userId?: string;
    userEmail?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const {
      page = 1,
      limit = 50,
      action,
      entity,
      entityId,
      userId,
      userEmail,
      startDate,
      endDate,
    } = options;

    const where: any = {};

    if (action) where.action = { contains: action, mode: "insensitive" };
    if (entity) where.entity = { contains: entity, mode: "insensitive" };
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    if (userEmail) {
      where.metadata = {
        path: ["userEmail"],
        string_contains: userEmail,
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
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
      prisma.auditLog.count({ where }),
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
  getRetentionPeriod(action: string): number {
    // Check each policy category
    for (const [category, policy] of Object.entries(AUDIT_RETENTION_POLICIES)) {
      if (policy.actions.includes(action) || policy.actions.includes("*")) {
        return policy.days;
      }
    }

    // Default to general retention if not found
    return AUDIT_RETENTION_POLICIES.GENERAL.days;
  }

  /**
   * Clean up old audit logs based on GDPR retention policies
   * Returns count of deleted logs by category
   */
  async cleanupOldAuditLogs(): Promise<{
    deletedByCategory: Record<string, number>;
    totalDeleted: number;
  }> {
    const deletedByCategory: Record<string, number> = {};
    let totalDeleted = 0;

    logger.info("Starting GDPR-compliant audit log cleanup...");

    try {
      // Process each retention policy
      for (const [category, policy] of Object.entries(
        AUDIT_RETENTION_POLICIES
      )) {
        if (policy.actions.includes("*")) {
          // Skip the catch-all for now
          continue;
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.days);

        const deleted = await prisma.auditLog.deleteMany({
          where: {
            action: { in: policy.actions },
            createdAt: { lt: cutoffDate },
          },
        });

        deletedByCategory[category] = deleted.count;
        totalDeleted += deleted.count;

        logger.info(
          `Cleaned up ${deleted.count} ${category} audit logs older than ${policy.days} days`
        );
      }

      // Clean up general logs (catch-all) that don't match any specific policy
      const generalCutoffDate = new Date();
      generalCutoffDate.setDate(
        generalCutoffDate.getDate() - AUDIT_RETENTION_POLICIES.GENERAL.days
      );

      const allSpecificActions = Object.values(AUDIT_RETENTION_POLICIES)
        .filter((policy) => !policy.actions.includes("*"))
        .flatMap((policy) => policy.actions);

      const deletedGeneral = await prisma.auditLog.deleteMany({
        where: {
          action: { notIn: allSpecificActions },
          createdAt: { lt: generalCutoffDate },
        },
      });

      deletedByCategory["GENERAL"] = deletedGeneral.count;
      totalDeleted += deletedGeneral.count;

      logger.info(
        `Cleaned up ${deletedGeneral.count} GENERAL audit logs older than ${AUDIT_RETENTION_POLICIES.GENERAL.days} days`
      );

      logger.info(`Total audit logs cleaned up: ${totalDeleted}`);

      return { deletedByCategory, totalDeleted };
    } catch (error) {
      logger.error("Error during audit log cleanup:", error);
      throw error;
    }
  }

  /**
   * Archive old audit logs to file before deletion (for compliance)
   */
  async archiveOldAuditLogs(): Promise<{
    archivedFile: string;
    count: number;
  }> {
    const fs = require("fs").promises;
    const path = require("path");

    try {
      // Get logs older than the shortest retention period
      const archiveCutoffDate = new Date();
      archiveCutoffDate.setDate(
        archiveCutoffDate.getDate() - AUDIT_RETENTION_POLICIES.GENERAL.days
      );

      const logsToArchive = await prisma.auditLog.findMany({
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
      const archiveFile = path.join(
        archiveDir,
        `audit-archive-${timestamp}.json`
      );

      await fs.writeFile(
        archiveFile,
        JSON.stringify(logsToArchive, null, 2),
        "utf-8"
      );

      logger.info(
        `Archived ${logsToArchive.length} audit logs to ${archiveFile}`
      );

      return {
        archivedFile: archiveFile,
        count: logsToArchive.length,
      };
    } catch (error) {
      logger.error("Error archiving audit logs:", error);
      throw error;
    }
  }

  /**
   * Get audit log statistics
   */
  async getAuditLogStats(days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const [totalLogs, recentLogs, actionCounts, userActivity, retentionStatus] =
      await Promise.all([
        // Total logs count
        prisma.auditLog.count(),

        // Recent logs count
        prisma.auditLog.count({
          where: { createdAt: { gte: cutoffDate } },
        }),

        // Action counts
        prisma.auditLog.groupBy({
          by: ["action"],
          _count: true,
          where: { createdAt: { gte: cutoffDate } },
          orderBy: { _count: { action: "desc" } },
          take: 20,
        }),

        // User activity
        prisma.auditLog.groupBy({
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
      userActivity: await Promise.all(
        userActivity.map(async (item) => {
          const user = await prisma.user.findUnique({
            where: { id: item.userId! },
            select: { email: true },
          });
          return {
            userId: item.userId,
            email: user?.email || "Unknown",
            count: item._count,
          };
        })
      ),
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
    const status: Record<
      string,
      { willBeDeleted: number; daysUntilDeletion: number }
    > = {};

    for (const [category, policy] of Object.entries(AUDIT_RETENTION_POLICIES)) {
      if (policy.actions.includes("*")) continue;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.days);

      const count = await prisma.auditLog.count({
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

// Export singleton instance
export const auditService = new AuditService();
