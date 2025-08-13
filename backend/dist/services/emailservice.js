"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
// MAR ABU PROJECTS SERVICES LLC - Email Service (Dual Driver: MailHog | Resend)
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_middleware_1 = require("../middlewares/logger.middleware");
const constants_1 = require("../utils/constants");
class EmailService {
    // Safely get property object or fallback
    safeBookingProperty(property) {
        return property && typeof property === "object"
            ? property
            : {
                name: "Property",
                address: "N/A",
                city: "N/A",
                host: { firstName: "Host", lastName: "", phone: "" },
            };
    }
    constructor() {
        this.driver = "mailhog"; // Force MailHog for all environments
        this.transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST || "127.0.0.1",
            port: Number(process.env.SMTP_PORT || 1025),
            secure: false,
        });
        logger_middleware_1.logger.info("MailHog SMTP transporter initialized");
        logger_middleware_1.logger.info(`Email driver active: ${this.driver}`);
    }
    buildFrom() {
        const fromEmail = process.env.EMAIL_FROM || "no-reply@local.test";
        return `"${constants_1.APP_CONSTANTS.COMPANY.NAME}" <${fromEmail}>`;
    }
    getBackendBaseUrl() {
        return (process.env.BACKEND_URL || "http://localhost:5050").replace(/\/$/, "");
    }
    url(path) {
        return `${this.getBackendBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
    }
    apiUrl(path) {
        const prefix = process.env.API_PREFIX || "/api/v1";
        const clean = path.startsWith("/") ? path : `/${path}`;
        return `${this.getBackendBaseUrl()}${prefix}${clean}`;
    }
    async sendEmail(options) {
        try {
            if (this.driver === "mailhog") {
                if (!this.transporter)
                    throw new Error("SMTP transporter not ready");
                await this.transporter.sendMail({
                    from: this.buildFrom(),
                    to: options.to,
                    subject: options.subject,
                    html: options.html,
                    attachments: options.attachments?.map((a) => ({
                        filename: a.filename,
                        content: a.content,
                    })),
                });
                logger_middleware_1.logger.info("Email sent (MailHog)", { to: options.to });
                return true;
            }
            if (!this.resend)
                throw new Error("Resend client not initialized");
            const response = await this.resend.emails.send({
                from: this.buildFrom(),
                to: options.to,
                subject: options.subject,
                html: options.html,
                attachments: options.attachments?.map((att) => ({
                    filename: att.filename,
                    content: Buffer.isBuffer(att.content)
                        ? att.content.toString("base64")
                        : Buffer.from(att.content).toString("base64"),
                })),
            });
            logger_middleware_1.logger.info("Email sent (Resend)", {
                to: options.to,
                id: response?.data?.id,
            });
            return true;
        }
        catch (err) {
            logger_middleware_1.logger.error("Email send failed", {
                driver: this.driver,
                to: options.to,
                error: err?.message,
            });
            return false;
        }
    }
    getBaseTemplate(content) {
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${constants_1.APP_CONSTANTS.COMPANY.NAME}</title>
<style>
body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f4f4f4;margin:0;padding:0;}
.container{max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,.1);}
.header{background:${constants_1.APP_CONSTANTS.COLORS.PRIMARY};color:#fff;padding:20px;text-align:center;}
.content{padding:30px;}
.button{display:inline-block;padding:12px 30px;background:${constants_1.APP_CONSTANTS.COLORS.PRIMARY};color:#fff;text-decoration:none;border-radius:5px;margin:20px 0;}
.footer{background:${constants_1.APP_CONSTANTS.COLORS.SECONDARY};color:#fff;padding:20px;text-align:center;font-size:14px;}
.info-box{background:#f9f9f9;border-left:4px solid ${constants_1.APP_CONSTANTS.COLORS.PRIMARY};padding:15px;margin:20px 0;}
.detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;}
.detail-label{font-weight:bold;color:#666;}
a{color:${constants_1.APP_CONSTANTS.COLORS.PRIMARY};}
</style></head><body>
<div class="container">
<div class="header"><h1>${constants_1.APP_CONSTANTS.COMPANY.NAME}</h1></div>
<div class="content">${content}</div>
<div class="footer">
<p>&copy; ${new Date().getFullYear()} ${constants_1.APP_CONSTANTS.COMPANY.NAME}. All rights reserved.</p>
<p><a href="mailto:${constants_1.APP_CONSTANTS.COMPANY.SUPPORT_EMAIL}" style="color:#fff;">${constants_1.APP_CONSTANTS.COMPANY.SUPPORT_EMAIL}</a></p>
</div></div></body></html>`;
    }
    /**
     * Send welcome email
     */
    async sendWelcomeEmail(email, firstName) {
        const content = `
      <h2>Welcome to ${constants_1.APP_CONSTANTS.COMPANY.NAME}, ${firstName}!</h2>
      <p>We're excited to have you join our community of property hosts and travelers.</p>
      <p>Here's what you can do next:</p>
      <ul>
        <li>Complete your profile to build trust with other users</li>
        <li>Browse available properties for your next stay</li>
        <li>List your property if you're a host</li>
      </ul>
      <a href="${this.url("/dashboard")}" class="button">Go to Dashboard</a>
      <p>If you have any questions, don't hesitate to reach out to our support team.</p>
    `;
        return this.sendEmail({
            to: email,
            subject: `Welcome to ${constants_1.APP_CONSTANTS.COMPANY.NAME}!`,
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send booking confirmation email
     */
    async sendBookingConfirmation(email, booking) {
        const property = this.safeBookingProperty(booking.property);
        const content = `
      <h2>Booking Confirmation</h2>
      <p>Your booking has been confirmed!</p>
      <div class="info-box">
        <h3>Booking Details</h3>
        <div class="detail-row"><span class="detail-label">Booking Code:</span><span>${booking.bookingCode || "N/A"}</span></div>
        <div class="detail-row"><span class="detail-label">Property:</span><span>${property.name}</span></div>
        <div class="detail-row"><span class="detail-label">Check-in:</span><span>${booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString() : "N/A"}</span></div>
        <div class="detail-row"><span class="detail-label">Check-out:</span><span>${booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString() : "N/A"}</span></div>
        <div class="detail-row"><span class="detail-label">Total Amount:</span><span>${booking.currency || "NGN"} ${(booking.total || 0).toLocaleString()}</span></div>
      </div>
      <a href="${this.url(`/bookings/${booking.id || booking.bookingCode || ""}`)}" class="button">View Booking</a>
    `;
        return this.sendEmail({
            to: email,
            subject: `Booking Confirmed - ${booking.bookingCode || "Booking"}`,
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, resetToken) {
        const resetUrl = `${this.getBackendBaseUrl()}/auth/reset-password?token=${resetToken}`;
        const content = `
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password. Click below:</p>
      <a href="${resetUrl}" class="button">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
    `;
        return this.sendEmail({
            to: email,
            subject: "Password Reset Request",
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send email verification
     */
    async sendEmailVerification(email, verificationToken) {
        // Use backend API route for verification
        const verifyUrl = this.apiUrl(`/auth/verify-email/${verificationToken}`);
        const content = `
      <h2>Verify Your Email Address</h2>
      <p>Please click the button below to verify your email address:</p>
      <a href="${verifyUrl}" class="button">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    `;
        return this.sendEmail({
            to: email,
            subject: "Verify Your Email Address",
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send receipt uploaded notification
     */
    async sendReceiptUploadedNotification(email, booking) {
        const content = `
      <h2>Payment Receipt Uploaded</h2>
      <p>A payment receipt has been uploaded for booking ${booking.bookingCode}.</p>
      <div class="info-box">
        <p><strong>Property:</strong> ${booking.property.name}</p>
        <p><strong>Amount:</strong> ${booking.currency} ${booking.total.toLocaleString()}</p>
      </div>
      <p>Our team will verify the receipt within 24 hours.</p>
      <a href="${this.url(`/bookings/${booking.id}`)}" class="button">View Booking</a>
    `;
        return this.sendEmail({
            to: email,
            subject: `Receipt Uploaded - ${booking.bookingCode}`,
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send receipt verified notification
     */
    async sendReceiptVerifiedNotification(email, booking) {
        const content = `
      <h2>Payment Verified</h2>
      <p>Your payment for booking ${booking.bookingCode} has been verified.</p>
      <div class="info-box">
        <p><strong>Property:</strong> ${booking.property.name}</p>
        <p><strong>Check-in:</strong> ${new Date(booking.checkInDate).toLocaleDateString()}</p>
        <p><strong>Check-out:</strong> ${new Date(booking.checkOutDate).toLocaleDateString()}</p>
      </div>
      <p>You're all set for your stay!</p>
      <a href="${this.url(`/bookings/${booking.id}`)}" class="button">View Booking Details</a>
    `;
        return this.sendEmail({
            to: email,
            subject: `Payment Verified - ${booking.bookingCode}`,
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send booking approved email
     */
    async sendBookingApprovedEmail(email, booking) {
        const content = `
      <h2>Booking Approved!</h2>
      <p>Your booking request has been approved.</p>
      <div class="info-box">
        <p><strong>Booking Code:</strong> ${booking.bookingCode}</p>
        <p><strong>Property:</strong> ${booking.property.name}</p>
        <p><strong>Check-in:</strong> ${new Date(booking.checkInDate).toLocaleDateString()}</p>
        <p><strong>Check-out:</strong> ${new Date(booking.checkOutDate).toLocaleDateString()}</p>
        <p><strong>Total Amount:</strong> ${booking.currency} ${booking.total.toLocaleString()}</p>
      </div>
      <p>Please complete your payment within 24 hours to secure your booking.</p>
      <a href="${this.url(`/bookings/${booking.id}/payment`)}" class="button">Make Payment</a>
    `;
        return this.sendEmail({
            to: email,
            subject: `Booking Approved - ${booking.bookingCode}`,
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send booking cancelled email
     */
    async sendBookingCancelledEmail(email, booking, reason) {
        const property = this.safeBookingProperty(booking.property);
        const content = `
      <h2>Booking Cancelled</h2>
      <p>Your booking ${booking.bookingCode || ""} has been cancelled.</p>
      <div class="info-box">
        <p><strong>Property:</strong> ${property.name}</p>
        <p><strong>Original Dates:</strong> ${booking.checkInDate && booking.checkOutDate
            ? `${new Date(booking.checkInDate).toLocaleDateString()} - ${new Date(booking.checkOutDate).toLocaleDateString()}`
            : "N/A"}</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
      </div>
      ${booking.refundAmount ? `<p>A refund of ${booking.currency || "NGN"} ${(booking.refundAmount || 0).toLocaleString()} will be processed within 5-7 business days.</p>` : ""}
      <p>If you have any questions, please contact our support team.</p>
      <a href="${this.url("/support")}" class="button">Contact Support</a>
    `;
        return this.sendEmail({
            to: email,
            subject: `Booking Cancelled - ${booking.bookingCode || "Booking"}`,
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send property approved email
     */
    async sendPropertyApprovedEmail(email, property) {
        const content = `
      <h2>Property Approved!</h2>
      <p>Congratulations! Your property listing has been approved.</p>
      <div class="info-box">
        <h3>Property Details</h3>
        <p><strong>Name:</strong> ${property.name}</p>
        <p><strong>Location:</strong> ${property.city}, ${property.state}</p>
        <p><strong>Type:</strong> ${property.type}</p>
      </div>
      <p>Your property is now live and available for bookings!</p>
      <a href="${this.url(`/properties/${property.id}`)}" class="button">View Property</a>
    `;
        return this.sendEmail({
            to: email,
            subject: `Property Approved - ${property.name}`,
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send property rejected email
     */
    async sendPropertyRejectedEmail(email, property, reason) {
        const content = `
      <h2>Property Listing Update</h2>
      <p>Your property listing has not been approved at this time.</p>
      <div class="info-box">
        <h3>Property Details</h3>
        <p><strong>Name:</strong> ${property.name}</p>
        <p><strong>Reason:</strong> ${reason}</p>
      </div>
      <p>Please address the issues mentioned and resubmit your property for review.</p>
      <a href="${this.url(`/properties/${property.id}/edit`)}" class="button">Edit Property</a>
    `;
        return this.sendEmail({
            to: email,
            subject: `Property Review Update - ${property.name}`,
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send review request email
     */
    async sendReviewRequestEmail(email, booking) {
        const content = `
      <h2>How was your stay?</h2>
      <p>We hope you enjoyed your stay at ${booking.property.name}!</p>
      <p>Your feedback helps other travelers and helps hosts improve.</p>
      <div class="info-box">
        <p><strong>Property:</strong> ${booking.property.name}</p>
        <p><strong>Stay Dates:</strong> ${new Date(booking.checkInDate).toLocaleDateString()} - ${new Date(booking.checkOutDate).toLocaleDateString()}</p>
      </div>
      <a href="${this.url(`/bookings/${booking.id}/review`)}" class="button">Write a Review</a>
    `;
        return this.sendEmail({
            to: email,
            subject: `Review Your Stay at ${booking.property.name}`,
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send password change notification - NEW
     */
    async sendPasswordChangeNotification(email) {
        const content = `
      <h2>Password Changed Successfully</h2>
      <p>Your password has been changed.</p>
      <div class="info-box">
        <p><strong>Changed at:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>IP Address:</strong> ${process.env.NODE_ENV === "production" ? "Hidden for security" : "Local development"}</p>
      </div>
      <p>If this wasn't you, contact support immediately.</p>
      <a href="${this.url("/support")}" class="button">Contact Support</a>
    `;
        return this.sendEmail({
            to: email,
            subject: "Password Changed - Security Alert",
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send account deletion confirmation - NEW
     */
    async sendAccountDeletionConfirmation(email, name) {
        const content = `
      <h2>Account Deleted</h2>
      <p>Dear ${name},</p>
      <p>Your account has been deleted as requested.</p>
      <div class="info-box">
        <p>Your data will be permanently removed within 30 days.</p>
        <p>If this was a mistake, contact support within 7 days.</p>
      </div>
      <p>Thank you for being part of ${constants_1.APP_CONSTANTS.COMPANY.NAME}.</p>
      <a href="mailto:${constants_1.APP_CONSTANTS.COMPANY.SUPPORT_EMAIL}" class="button">Contact Support</a>
    `;
        return this.sendEmail({
            to: email,
            subject: "Account Deletion Confirmation",
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send host notification for new booking
     */
    async sendHostBookingNotification(email, booking) {
        const property = this.safeBookingProperty(booking.property);
        const guestName = booking.customer?.firstName
            ? `${booking.customer.firstName} ${booking.customer.lastName || ""}`
            : booking.guestName || "Guest";
        const content = `
      <h2>New Booking Request</h2>
      <p>You have a new booking request.</p>
      <div class="info-box">
        <p><strong>Property:</strong> ${property.name}</p>
        <p><strong>Guest:</strong> ${guestName}</p>
        <p><strong>Check-in:</strong> ${booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString() : "N/A"}</p>
        <p><strong>Check-out:</strong> ${booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString() : "N/A"}</p>
        <p><strong>Guests:</strong> ${booking.adults || 0} adults${booking.children ? `, ${booking.children} children` : ""}</p>
        <p><strong>Total Amount:</strong> ${booking.currency || "NGN"} ${(booking.total || 0).toLocaleString()}</p>
      </div>
      <p>Please review and respond within 24 hours.</p>
      <a href="${this.url(`/bookings/${booking.id || booking.bookingCode || ""}`)}" class="button">Review Booking</a>
    `;
        return this.sendEmail({
            to: email,
            subject: `New Booking Request - ${property.name}`,
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send payment reminder
     */
    async sendPaymentReminderEmail(email, booking) {
        const content = `
      <h2>Payment Reminder</h2>
      <p>Your payment for booking ${booking.bookingCode} is pending.</p>
      <div class="info-box">
        <p><strong>Property:</strong> ${booking.property.name}</p>
        <p><strong>Amount Due:</strong> ${booking.currency} ${booking.total.toLocaleString()}</p>
      </div>
      <p>Please complete payment soon.</p>
      <a href="${this.url(`/bookings/${booking.id}/payment`)}" class="button">Make Payment</a>
    `;
        return this.sendEmail({
            to: email,
            subject: `Payment Reminder - ${booking.bookingCode}`,
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send check-in reminder
     */
    async sendCheckInReminderEmail(email, booking) {
        const property = this.safeBookingProperty(booking.property);
        const content = `
      <h2>Check-in Reminder</h2>
      <p>Your check-in at ${property.name} is tomorrow.</p>
      <div class="info-box">
        <p><strong>Date:</strong> ${booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString() : "N/A"}</p>
        <p><strong>Time:</strong> After ${constants_1.APP_CONSTANTS.BOOKING.CHECKIN_TIME}</p>
        <p><strong>Address:</strong> ${property.address}, ${property.city}</p>
      </div>
      <div class="info-box">
        <p><strong>Host:</strong> ${property.host.firstName} ${property.host.lastName}</p>
        <p><strong>Phone:</strong> ${property.host.phone || "Available in app"}</p>
      </div>
      <p>Have a wonderful stay!</p>
      <a href="${this.url(`/bookings/${booking.id || booking.bookingCode || ""}`)}" class="button">View Booking Details</a>
    `;
        return this.sendEmail({
            to: email,
            subject: `Check-in Tomorrow - ${property.name}`,
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send review status update notification
     */
    async sendReviewStatusUpdate(email, data) {
        const content = `
      <h2>Review Update - ${data.propertyName}</h2>
      <p>Dear ${data.customerName},</p>
      <div class="info-box">
        <p>Your review for <strong>${data.propertyName}</strong> has been <strong>${data.approved ? "approved" : "rejected"}</strong>.</p>
        ${data.adminNotes && !data.approved ? `<p><strong>Admin Notes:</strong> ${data.adminNotes}</p>` : ""}
        <p>${data.approved ? "Your review is now publicly visible." : "Please consider submitting a revised review."}</p>
      </div>
      ${data.approved
            ? `<a href="${this.url(`/properties/${data.propertyName}`)}" class="button">View Property</a>`
            : `<a href="${this.url("/support")}" class="button">Contact Support</a>`}
      <p>Thank you for sharing your feedback with the ${constants_1.APP_CONSTANTS.COMPANY.NAME} community.</p>
    `;
        return this.sendEmail({
            to: email,
            subject: `Review ${data.approved ? "Approved" : "Rejected"} - ${data.propertyName}`,
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send payment confirmation email to customer
     */
    async sendPaymentConfirmation(email, data) {
        const content = `
      <h2>Payment Confirmed</h2>
      <p>Dear ${data.customerName},</p>
      <p>Your payment for booking <strong>${data.bookingCode}</strong> at <strong>${data.propertyName}</strong> has been received.</p>
      <div class="info-box">
        <p><strong>Amount Paid:</strong> ${data.amount.toLocaleString()}</p>
        <p><strong>Payment Reference:</strong> ${data.paymentReference}</p>
      </div>
      <p>Thank you. We look forward to hosting you!</p>
      <a href="${this.url(`/bookings/${data.bookingCode}`)}" class="button">View Booking</a>
    `;
        return this.sendEmail({
            to: email,
            subject: `Payment Confirmed - ${data.bookingCode}`,
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send payment notification email to host
     */
    async sendPaymentNotificationToHost(email, data) {
        const content = `
      <h2>Payment Received</h2>
      <p>Dear ${data.hostName},</p>
      <p>A payment has been received for booking <strong>${data.bookingCode}</strong>.</p>
      <div class="info-box">
        <p><strong>Guest:</strong> ${data.customerName}</p>
        <p><strong>Amount Paid:</strong> ${data.amount.toLocaleString()}</p>
      </div>
      <p>View the booking details in your dashboard.</p>
      <a href="${this.url(`/bookings/${data.bookingCode}`)}" class="button">View Booking</a>
    `;
        return this.sendEmail({
            to: email,
            subject: `Payment Received - ${data.bookingCode}`,
            html: this.getBaseTemplate(content),
        });
    }
    /**
     * Send a test email to verify email configuration
     */
    async sendTestEmail(email, data) {
        const content = `
      <h2>Email Test Successful</h2>
      <p>Hello${data?.recipientName ? ` ${data.recipientName}` : ""},</p>
      <p>This is a test email from ${data?.systemName || constants_1.APP_CONSTANTS.COMPANY.NAME}.</p>
      <div class="info-box">
        <p><strong>Sent at:</strong> ${data?.testDate || new Date().toLocaleString()}</p>
        <p><strong>Recipient:</strong> ${email}</p>
      </div>
      <p>If you received this email, your email configuration is working correctly!</p>
    `;
        return this.sendEmail({
            to: email,
            subject: "Test Email - Email Configuration Successful",
            html: this.getBaseTemplate(content),
        });
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
