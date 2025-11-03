// MAR ABU PROJECTS SERVICES LLC - Scheduler Service
import { prisma } from "../server";
import { auditLog } from "../middlewares/logger.middleware";
import { auditService } from "./auditservice";
import { emailService } from "./emailservice";
import { BookingStatus, PaymentStatus, NotificationType } from "@prisma/client";

// ===============================
// INTERFACES & TYPES
// ===============================

interface BookingCancellationData {
  bookingId: string;
  bookingCode: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  propertyName: string;
  checkInDate: Date;
  checkOutDate: Date;
  approvedAt: Date | null;
}

interface SchedulerStats {
  count: number;
  bookings: Array<{
    bookingCode: string;
    customerName: string;
    propertyName: string;
    approvedAt: Date | null;
    timeUntilCancellation: number;
  }>;
}

// ===============================
// CONSTANTS
// ===============================

const SCHEDULER_CONFIG = {
  INTERVAL_MINUTES: 10,
  CANCELLATION_TIMEOUT_HOURS: 1,
  STARTUP_DELAY_SECONDS: 5,
  CLEANUP_DAYS: 30,
  AUDIT_CLEANUP_INTERVAL_HOURS: 24, // Run audit cleanup daily
} as const;

export class SchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private auditCleanupIntervalId: NodeJS.Timeout | null = null;

  /**
   * Start the scheduler to run booking cleanup tasks
   */
  public start() {
    if (this.intervalId) {
      console.log("Scheduler already running");
      return;
    }

    console.log("Starting booking scheduler service...");

    // Run every configured interval
    this.intervalId = setInterval(
      async () => {
        try {
          await this.cancelUnpaidBookings();
          await this.cleanupExpiredBookings();
        } catch (error) {
          console.error("Scheduler error:", error);
        }
      },
      SCHEDULER_CONFIG.INTERVAL_MINUTES * 60 * 1000
    );

    // Run after startup delay
    setTimeout(() => {
      this.cancelUnpaidBookings();
      this.cleanupExpiredBookings();
    }, SCHEDULER_CONFIG.STARTUP_DELAY_SECONDS * 1000);

    console.log(
      `Booking scheduler started (runs every ${SCHEDULER_CONFIG.INTERVAL_MINUTES} minutes)`
    );

    // Start audit log cleanup job (runs daily)
    this.startAuditLogCleanup();
  }

  /**
   * Stop the scheduler
   */
  public stop() {
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
  private startAuditLogCleanup() {
    console.log("Starting audit log cleanup scheduler...");

    // Run daily
    this.auditCleanupIntervalId = setInterval(
      async () => {
        try {
          await this.cleanupAuditLogs();
        } catch (error) {
          console.error("Audit cleanup error:", error);
        }
      },
      SCHEDULER_CONFIG.AUDIT_CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000
    );

    // Run on startup after a delay (30 seconds)
    setTimeout(async () => {
      await this.cleanupAuditLogs();
    }, 30 * 1000);

    console.log(
      `Audit log cleanup started (runs every ${SCHEDULER_CONFIG.AUDIT_CLEANUP_INTERVAL_HOURS} hours)`
    );
  }

  /**
   * Clean up old audit logs based on GDPR retention policies
   */
  private async cleanupAuditLogs() {
    try {
      console.log("Running GDPR-compliant audit log cleanup...");

      // Archive logs before deletion
      const archived = await auditService.archiveOldAuditLogs();
      if (archived.count > 0) {
        console.log(
          `Archived ${archived.count} audit logs to ${archived.archivedFile}`
        );
      }

      // Clean up old logs
      const result = await auditService.cleanupOldAuditLogs();

      auditLog(
        "AUDIT_LOGS_CLEANUP",
        "system",
        {
          deletedByCategory: result.deletedByCategory,
          totalDeleted: result.totalDeleted,
          archivedCount: archived.count,
        },
        "system"
      );

      console.log(
        `Audit log cleanup complete: ${result.totalDeleted} logs deleted`
      );
    } catch (error) {
      console.error("Failed to cleanup audit logs:", error);
    }
  }

  /**
   * Auto-cancel approved bookings that haven't been paid within configured timeout
   */
  private async cancelUnpaidBookings() {
    try {
      const timeoutAgo = new Date();
      timeoutAgo.setHours(
        timeoutAgo.getHours() - SCHEDULER_CONFIG.CANCELLATION_TIMEOUT_HOURS
      );

      // Find approved bookings older than timeout with pending payment
      // BUT exclude bookings that have receipt uploads (user has attempted payment)
      const unpaidBookings = await prisma.booking.findMany({
        where: {
          status: BookingStatus.APPROVED,
          paymentStatus: {
            in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
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
        console.log(
          "No unpaid bookings to cancel (all have receipts or are paid)"
        );
        return;
      }

      console.log(
        `Found ${unpaidBookings.length} unpaid booking(s) without receipts to auto-cancel`
      );

      for (const booking of unpaidBookings) {
        try {
          await this.processBookingCancellation(booking);
        } catch (error) {
          console.error(
            `Failed to cancel booking ${booking.bookingCode}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error in cancelUnpaidBookings:", error);
    }
  }

  /**
   * Process individual booking cancellation
   */
  private async processBookingCancellation(booking: any) {
    const cancellationData: BookingCancellationData = {
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
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CANCELLED,
        paymentStatus: PaymentStatus.FAILED,
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
    auditLog(
      "BOOKING_AUTO_CANCELLED",
      "system",
      {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        customerId: booking.customerId,
        reason: `no_receipt_uploaded_within_${SCHEDULER_CONFIG.CANCELLATION_TIMEOUT_HOURS}_hour`,
        approvedAt: booking.approvedAt,
        cancelledAt: new Date(),
      },
      "system"
    );

    console.log(
      `Auto-cancelled booking ${booking.bookingCode} - no receipt uploaded within ${SCHEDULER_CONFIG.CANCELLATION_TIMEOUT_HOURS} hour(s)`
    );
  }

  /**
   * Create in-app notifications for booking cancellation
   */
  private async createCancellationNotifications(data: BookingCancellationData) {
    await Promise.all([
      // Notify customer
      prisma.notification.create({
        data: {
          userId: data.customerId,
          type: NotificationType.BOOKING_CANCELLED,
          title: "Booking Auto-Cancelled",
          message: `Your booking ${data.bookingCode} has been automatically cancelled. Please upload payment receipt within ${SCHEDULER_CONFIG.CANCELLATION_TIMEOUT_HOURS} hour(s) of approval to avoid cancellation.`,
          metadata: {
            bookingId: data.bookingId,
            reason: "payment_timeout",
          },
        },
      }),
      // Notify host
      prisma.notification.create({
        data: {
          userId: data.hostId,
          type: NotificationType.BOOKING_CANCELLED,
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
  private async sendCancellationEmails(data: BookingCancellationData) {
    try {
      // Send customer cancellation email
      await emailService.sendBookingAutoCancelledToCustomer({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        bookingCode: data.bookingCode,
        propertyName: data.propertyName,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        cancellationTimeoutHours: SCHEDULER_CONFIG.CANCELLATION_TIMEOUT_HOURS,
      });

      // Send host notification email
      await emailService.sendBookingAutoCancelledToHost({
        hostName: data.hostName,
        hostEmail: data.hostEmail,
        bookingCode: data.bookingCode,
        propertyName: data.propertyName,
        customerName: data.customerName,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
      });
    } catch (emailError) {
      console.error(
        `Failed to send cancellation emails for booking ${data.bookingCode}:`,
        emailError
      );
    }
  }

  /**
   * Clean up very old cancelled/expired bookings (older than configured days)
   */
  private async cleanupExpiredBookings() {
    try {
      const cleanupDaysAgo = new Date();
      cleanupDaysAgo.setDate(
        cleanupDaysAgo.getDate() - SCHEDULER_CONFIG.CLEANUP_DAYS
      );

      // Find old cancelled bookings to clean up
      const expiredBookings = await prisma.booking.findMany({
        where: {
          status: BookingStatus.CANCELLED,
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
        console.log(
          `Found ${expiredBookings.length} expired cancelled bookings for cleanup`
        );

        // Archive to audit log (don't delete to preserve audit trail)
        auditLog(
          "EXPIRED_BOOKINGS_CLEANUP",
          "system",
          {
            count: expiredBookings.length,
            oldestCancellation: expiredBookings.reduce(
              (oldest, booking) =>
                booking.cancelledAt && (!oldest || booking.cancelledAt < oldest)
                  ? booking.cancelledAt
                  : oldest,
              null as Date | null
            ),
          },
          "system"
        );
      }
    } catch (error) {
      console.error("Error in cleanupExpiredBookings:", error);
    }
  }

  /**
   * Manually trigger unpaid booking cancellation (for testing or admin use)
   */
  public async triggerUnpaidBookingCancellation(): Promise<void> {
    console.log("Manually triggering unpaid booking cancellation...");
    await this.cancelUnpaidBookings();
  }

  /**
   * Get statistics about upcoming auto-cancellations
   */
  public async getUpcomingCancellations(): Promise<SchedulerStats> {
    try {
      const timeoutFromNow = new Date();
      timeoutFromNow.setHours(
        timeoutFromNow.getHours() + SCHEDULER_CONFIG.CANCELLATION_TIMEOUT_HOURS
      );

      const upcomingCancellations = await prisma.booking.findMany({
        where: {
          status: BookingStatus.APPROVED,
          paymentStatus: {
            in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
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
            ? Math.max(
                0,
                SCHEDULER_CONFIG.CANCELLATION_TIMEOUT_HOURS * 60 -
                  Math.floor(
                    (new Date().getTime() - booking.approvedAt.getTime()) /
                      (1000 * 60)
                  )
              )
            : 0,
        })),
      };
    } catch (error) {
      console.error("Error getting upcoming cancellations:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();
