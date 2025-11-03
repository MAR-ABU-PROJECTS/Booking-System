"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulerService = exports.SchedulerService = void 0;
// MAR ABU PROJECTS SERVICES LLC - Scheduler Service
const server_1 = require("../server");
const logger_middleware_1 = require("../middlewares/logger.middleware");
const auditservice_1 = require("./auditservice");
const emailservice_1 = require("./emailservice");
const client_1 = require("@prisma/client");
// ===============================
// CONSTANTS
// ===============================
const SCHEDULER_CONFIG = {
    INTERVAL_MINUTES: 10,
    CANCELLATION_TIMEOUT_HOURS: 1,
    STARTUP_DELAY_SECONDS: 5,
    CLEANUP_DAYS: 30,
    AUDIT_CLEANUP_INTERVAL_HOURS: 24, // Run audit cleanup daily
};
class SchedulerService {
    constructor() {
        this.intervalId = null;
        this.auditCleanupIntervalId = null;
    }
    /**
     * Start the scheduler to run booking cleanup tasks
     */
    start() {
        if (this.intervalId) {
            console.log("Scheduler already running");
            return;
        }
        console.log("Starting booking scheduler service...");
        // Run every configured interval
        this.intervalId = setInterval(async () => {
            try {
                await this.cancelUnpaidBookings();
                await this.cleanupExpiredBookings();
            }
            catch (error) {
                console.error("Scheduler error:", error);
            }
        }, SCHEDULER_CONFIG.INTERVAL_MINUTES * 60 * 1000);
        // Run after startup delay
        setTimeout(() => {
            this.cancelUnpaidBookings();
            this.cleanupExpiredBookings();
        }, SCHEDULER_CONFIG.STARTUP_DELAY_SECONDS * 1000);
        console.log(`Booking scheduler started (runs every ${SCHEDULER_CONFIG.INTERVAL_MINUTES} minutes)`);
        // Start audit log cleanup job (runs daily)
        this.startAuditLogCleanup();
    }
    /**
     * Stop the scheduler
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log("Booking scheduler stopped");
        }
        if (this.auditCleanupIntervalId) {
            clearInterval(this.auditCleanupIntervalId);
            this.auditCleanupIntervalId = null;
            console.log("Audit cleanup scheduler stopped");
        }
    }
    /**
     * Start the audit log cleanup job (runs daily)
     */
    startAuditLogCleanup() {
        console.log("Starting audit log cleanup scheduler...");
        // Run daily
        this.auditCleanupIntervalId = setInterval(async () => {
            try {
                await this.cleanupAuditLogs();
            }
            catch (error) {
                console.error("Audit cleanup error:", error);
            }
        }, SCHEDULER_CONFIG.AUDIT_CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000);
        // Run on startup after a delay (30 seconds)
        setTimeout(async () => {
            await this.cleanupAuditLogs();
        }, 30 * 1000);
        console.log(`Audit log cleanup started (runs every ${SCHEDULER_CONFIG.AUDIT_CLEANUP_INTERVAL_HOURS} hours)`);
    }
    /**
     * Clean up old audit logs based on GDPR retention policies
     */
    async cleanupAuditLogs() {
        try {
            console.log("Running GDPR-compliant audit log cleanup...");
            // Archive logs before deletion
            const archived = await auditservice_1.auditService.archiveOldAuditLogs();
            if (archived.count > 0) {
                console.log(`Archived ${archived.count} audit logs to ${archived.archivedFile}`);
            }
            // Clean up old logs
            const result = await auditservice_1.auditService.cleanupOldAuditLogs();
            (0, logger_middleware_1.auditLog)("AUDIT_LOGS_CLEANUP", "system", {
                deletedByCategory: result.deletedByCategory,
                totalDeleted: result.totalDeleted,
                archivedCount: archived.count,
            }, "system");
            console.log(`Audit log cleanup complete: ${result.totalDeleted} logs deleted`);
        }
        catch (error) {
            console.error("Failed to cleanup audit logs:", error);
        }
    }
    /**
     * Auto-cancel approved bookings that haven't been paid within configured timeout
     */
    async cancelUnpaidBookings() {
        try {
            const timeoutAgo = new Date();
            timeoutAgo.setHours(timeoutAgo.getHours() - SCHEDULER_CONFIG.CANCELLATION_TIMEOUT_HOURS);
            // Find approved bookings older than timeout with pending payment
            // BUT exclude bookings that have receipt uploads (user has attempted payment)
            const unpaidBookings = await server_1.prisma.booking.findMany({
                where: {
                    status: client_1.BookingStatus.APPROVED,
                    paymentStatus: {
                        in: [client_1.PaymentStatus.PENDING, client_1.PaymentStatus.PROCESSING],
                    },
                    approvedAt: {
                        lte: timeoutAgo,
                    },
                    // Only cancel if NO receipts have been uploaded
                    receipts: {
                        none: {},
                    },
                },
                select: {
                    id: true,
                    bookingCode: true,
                    guestName: true,
                    guestEmail: true,
                    customerId: true,
                    propertyId: true,
                    customer: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                    property: {
                        select: {
                            id: true,
                            name: true,
                            hostId: true,
                            host: {
                                select: {
                                    email: true,
                                },
                            },
                        },
                    },
                },
            });
            if (unpaidBookings.length === 0) {
                console.log("No unpaid bookings to cancel (all have receipts or are paid)");
                return;
            }
            console.log(`Found ${unpaidBookings.length} unpaid booking(s) without receipts to auto-cancel`);
            for (const booking of unpaidBookings) {
                try {
                    await this.processBookingCancellation(booking);
                }
                catch (error) {
                    console.error(`Failed to cancel booking ${booking.bookingCode}:`, error);
                }
            }
        }
        catch (error) {
            console.error("Error in cancelUnpaidBookings:", error);
        }
    }
    /**
     * Process individual booking cancellation
     */
    async processBookingCancellation(booking) {
        const cancellationData = {
            bookingId: booking.id,
            bookingCode: booking.bookingCode,
            customerId: booking.customerId,
            customerName: booking.guestName || booking.guestEmail,
            customerEmail: booking.customer?.email || booking.guestEmail,
            hostId: booking.property?.hostId,
            hostName: booking.property?.host?.email,
            hostEmail: booking.property?.host?.email,
            propertyName: booking.property?.name,
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            approvedAt: booking.approvedAt,
        };
        // Update booking to cancelled
        await server_1.prisma.booking.update({
            where: { id: booking.id },
            data: {
                status: client_1.BookingStatus.CANCELLED,
                paymentStatus: client_1.PaymentStatus.FAILED,
                cancellationReason: `Auto-cancelled: No payment receipt uploaded within ${SCHEDULER_CONFIG.CANCELLATION_TIMEOUT_HOURS} hour(s) of approval`,
                cancelledAt: new Date(),
                cancelledBy: "system",
            },
        });
        // Create in-app notifications
        await this.createCancellationNotifications(cancellationData);
        // Send email notifications
        await this.sendCancellationEmails(cancellationData);
        // Create audit log
        (0, logger_middleware_1.auditLog)("BOOKING_AUTO_CANCELLED", "system", {
            bookingId: booking.id,
            bookingCode: booking.bookingCode,
            customerId: booking.customerId,
            reason: `no_receipt_uploaded_within_${SCHEDULER_CONFIG.CANCELLATION_TIMEOUT_HOURS}_hour`,
            approvedAt: booking.approvedAt,
            cancelledAt: new Date(),
        }, "system");
        console.log(`Auto-cancelled booking ${booking.bookingCode} - no receipt uploaded within ${SCHEDULER_CONFIG.CANCELLATION_TIMEOUT_HOURS} hour(s)`);
    }
    /**
     * Create in-app notifications for booking cancellation
     */
    async createCancellationNotifications(data) {
        await Promise.all([
            // Notify customer
            server_1.prisma.notification.create({
                data: {
                    userId: data.customerId,
                    type: client_1.NotificationType.BOOKING_CANCELLED,
                    title: "Booking Auto-Cancelled",
                    message: `Your booking ${data.bookingCode} has been automatically cancelled. Please upload payment receipt within ${SCHEDULER_CONFIG.CANCELLATION_TIMEOUT_HOURS} hour(s) of approval to avoid cancellation.`,
                    metadata: {
                        bookingId: data.bookingId,
                        reason: "payment_timeout",
                    },
                },
            }),
            // Notify host
            server_1.prisma.notification.create({
                data: {
                    userId: data.hostId,
                    type: client_1.NotificationType.BOOKING_CANCELLED,
                    title: "Booking Auto-Cancelled",
                    message: `Booking ${data.bookingCode} by ${data.customerName} was auto-cancelled - no payment receipt uploaded within timeout period`,
                    metadata: {
                        bookingId: data.bookingId,
                        reason: "payment_timeout",
                    },
                },
            }),
        ]);
    }
    /**
     * Send email notifications for booking cancellation
     */
    async sendCancellationEmails(data) {
        try {
            // Send customer cancellation email
            await emailservice_1.emailService.sendBookingAutoCancelledToCustomer({
                customerName: data.customerName,
                customerEmail: data.customerEmail,
                bookingCode: data.bookingCode,
                propertyName: data.propertyName,
                checkInDate: data.checkInDate,
                checkOutDate: data.checkOutDate,
                cancellationTimeoutHours: SCHEDULER_CONFIG.CANCELLATION_TIMEOUT_HOURS,
            });
            // Send host notification email
            await emailservice_1.emailService.sendBookingAutoCancelledToHost({
                hostName: data.hostName,
                hostEmail: data.hostEmail,
                bookingCode: data.bookingCode,
                propertyName: data.propertyName,
                customerName: data.customerName,
                checkInDate: data.checkInDate,
                checkOutDate: data.checkOutDate,
            });
        }
        catch (emailError) {
            console.error(`Failed to send cancellation emails for booking ${data.bookingCode}:`, emailError);
        }
    }
    /**
     * Clean up very old cancelled/expired bookings (older than configured days)
     */
    async cleanupExpiredBookings() {
        try {
            const cleanupDaysAgo = new Date();
            cleanupDaysAgo.setDate(cleanupDaysAgo.getDate() - SCHEDULER_CONFIG.CLEANUP_DAYS);
            // Find old cancelled bookings to clean up
            const expiredBookings = await server_1.prisma.booking.findMany({
                where: {
                    status: client_1.BookingStatus.CANCELLED,
                    cancelledAt: {
                        lte: cleanupDaysAgo,
                    },
                },
                select: {
                    id: true,
                    bookingCode: true,
                    cancelledAt: true,
                },
            });
            if (expiredBookings.length > 0) {
                console.log(`Found ${expiredBookings.length} expired cancelled bookings for cleanup`);
                // Archive to audit log (don't delete to preserve audit trail)
                (0, logger_middleware_1.auditLog)("EXPIRED_BOOKINGS_CLEANUP", "system", {
                    count: expiredBookings.length,
                    oldestCancellation: expiredBookings.reduce((oldest, booking) => booking.cancelledAt && (!oldest || booking.cancelledAt < oldest)
                        ? booking.cancelledAt
                        : oldest, null),
                }, "system");
            }
        }
        catch (error) {
            console.error("Error in cleanupExpiredBookings:", error);
        }
    }
    /**
     * Manually trigger unpaid booking cancellation (for testing or admin use)
     */
    async triggerUnpaidBookingCancellation() {
        console.log("Manually triggering unpaid booking cancellation...");
        await this.cancelUnpaidBookings();
    }
    /**
     * Get statistics about upcoming auto-cancellations
     */
    async getUpcomingCancellations() {
        try {
            const timeoutFromNow = new Date();
            timeoutFromNow.setHours(timeoutFromNow.getHours() + SCHEDULER_CONFIG.CANCELLATION_TIMEOUT_HOURS);
            const upcomingCancellations = await server_1.prisma.booking.findMany({
                where: {
                    status: client_1.BookingStatus.APPROVED,
                    paymentStatus: {
                        in: [client_1.PaymentStatus.PENDING, client_1.PaymentStatus.PROCESSING],
                    },
                    approvedAt: {
                        lte: timeoutFromNow,
                    },
                },
                select: {
                    id: true,
                    bookingCode: true,
                    approvedAt: true,
                    guestName: true,
                    guestEmail: true,
                    customer: {
                        select: { email: true },
                    },
                    property: {
                        select: {
                            name: true,
                        },
                    },
                },
            });
            return {
                count: upcomingCancellations.length,
                bookings: upcomingCancellations.map((booking) => ({
                    bookingCode: booking.bookingCode,
                    customerName: booking.guestName || booking.guestEmail,
                    propertyName: booking.property.name,
                    approvedAt: booking.approvedAt,
                    timeUntilCancellation: booking.approvedAt
                        ? Math.max(0, SCHEDULER_CONFIG.CANCELLATION_TIMEOUT_HOURS * 60 -
                            Math.floor((new Date().getTime() - booking.approvedAt.getTime()) /
                                (1000 * 60)))
                        : 0,
                })),
            };
        }
        catch (error) {
            console.error("Error getting upcoming cancellations:", error);
            throw error;
        }
    }
}
exports.SchedulerService = SchedulerService;
// Export singleton instance
exports.schedulerService = new SchedulerService();
