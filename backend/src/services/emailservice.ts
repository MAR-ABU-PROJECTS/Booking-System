// MAR ABU PROJECTS SERVICES LLC - Production Email Service (Resend API Only)
import { Resend } from "resend";
import { logger } from "../middlewares/logger.middleware";
import { APP_CONSTANTS } from "../utils/constants";

interface EmailAttachment {
  filename: string;
  content: string | Buffer;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export class EmailService {
  private resend: Resend;
  private fromEmail: string;
  private replyToEmail: string;

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is required for EmailService");
    }

    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.EMAIL_FROM || "noreply@marabuprojects.com";
    this.replyToEmail =
      process.env.EMAIL_REPLY_TO || "noreply@marabuprojects.com";

    logger.info("Email service initialized with Resend API");
  }

  private safeBookingProperty(property: any): any {
    return property && typeof property === "object"
      ? property
      : {
          name: "Property",
          address: "N/A",
          city: "N/A",
          host: { firstName: "Host", lastName: "", phone: "" },
        };
  }

  private buildFrom(): string {
    return `"${APP_CONSTANTS.COMPANY.NAME}" <${this.fromEmail}>`;
  }

  private getBackendBaseUrl(): string {
    return (process.env.BACKEND_URL || "http://localhost:5050").replace(/\/$/, "");
  }

  private getFrontendBaseUrl(): string {
    return (process.env.FRONTEND_URL || "http://localhost:3000").replace(
      /\/$/,
      ""
    );
  }

  private apiUrl(path: string): string {
    const prefix = process.env.API_PREFIX || "/api/v1";
    const clean = path.startsWith("/") ? path : `/${path}`;
    return `${this.getBackendBaseUrl()}${prefix}${clean}`;
  }

  private frontendUrl(path: string): string {
    const clean = path.startsWith("/") ? path : `/${path}`;
    return `${this.getFrontendBaseUrl()}${clean}`;
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async queueEmail(
    options: EmailOptions,
    type: string
  ): Promise<string> {
    try {
      const queued = await prisma.emailQueue.create({
        data: {
          to: options.to,
          subject: options.subject,
          html: options.html,
          type,
          status: "processing",
        },
      });
      return queued.id;
    } catch (error) {
      logger.error("Failed to queue email:", error);
      throw error;
    }
  }

  private async updateEmailQueueStatus(
    queueId: string,
    status: string,
    error?: string
  ): Promise<void> {
    try {
      await prisma.emailQueue.update({
        where: { id: queueId },
        data: {
          status,
          error: error || null,
          updatedAt: new Date(),
        },
      });
    } catch (updateError) {
      logger.error("Failed to update email queue status:", updateError);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    let queueId: string | undefined;

    try {
      if (!this.validateEmail(options.to)) {
        logger.error("Invalid email address", { email: options.to });
        return false;
      }

      // Queue the email first
      queueId = await this.queueEmail(options, "general");

      const emailData: any = {
        from: this.buildFrom(),
        to: options.to,
        subject: options.subject,
        html: options.html,
        reply_to: this.replyToEmail,
      };

      if (options.attachments?.length) {
        emailData.attachments = options.attachments.map((att) => ({
          filename: att.filename,
          content: Buffer.isBuffer(att.content)
            ? att.content.toString("base64")
            : Buffer.from(att.content).toString("base64"),
        }));
      }

      const response = await this.resend.emails.send(emailData);

      if (response.error) {
        await this.updateEmailQueueStatus(
          queueId,
          "failed",
          response.error.message
        );
        throw new Error(`Resend API error: ${response.error.message}`);
      }

      // Update queue status to sent
      await this.updateEmailQueueStatus(queueId, "sent");

      logger.info("✅ Email sent successfully via API", {
        to: options.to,
        id: response.data?.id,
        subject: options.subject,
      });

      return true;
    } catch (err: any) {
      // Update queue status to failed if queueId exists
      if (queueId) {
        await this.updateEmailQueueStatus(queueId, "failed", err?.message);
      }

      logger.error("❌ Email send failed", {
        to: options.to,
        error: err?.message,
        from: this.fromEmail,
        method: "API",
      });
      return false;
    }
  }

  private getBaseTemplate(content: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${APP_CONSTANTS.COMPANY.NAME}</title>
<style>
body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f4f4f4;margin:0;padding:0;}
.container{max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,.1);}
.header{background:${APP_CONSTANTS.COLORS.PRIMARY};color:#fff;padding:20px;text-align:center;}
.content{padding:30px;}
.button{display:inline-block;padding:12px 30px;background:${APP_CONSTANTS.COLORS.PRIMARY};color:#fff;text-decoration:none;border-radius:5px;margin:20px 0;}
.footer{background:${APP_CONSTANTS.COLORS.SECONDARY};color:#fff;padding:20px;text-align:center;font-size:14px;}
.info-box{background:#f9f9f9;border-left:4px solid ${APP_CONSTANTS.COLORS.PRIMARY};padding:15px;margin:20px 0;}
.detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;}
.detail-label{font-weight:bold;color:#666;}
a{color:${APP_CONSTANTS.COLORS.PRIMARY};}
</style></head><body>
<div class="container">
<div class="header"><h1>${APP_CONSTANTS.COMPANY.NAME}</h1></div>
<div class="content">${content}</div>
<div class="footer">
<p>&copy; ${new Date().getFullYear()} ${APP_CONSTANTS.COMPANY.NAME}. All rights reserved.</p>
<p><a href="mailto:${APP_CONSTANTS.COMPANY.SUPPORT_EMAIL}" style="color:#fff;">${APP_CONSTANTS.COMPANY.SUPPORT_EMAIL}</a></p>
</div></div></body></html>`;
  }

  /**
   * Send OTP verification email
   */
  async sendOTPEmail(
    email: string,
    otpCode: string,
    purpose: "login" | "signup" = "login"
  ): Promise<boolean> {
    const actionText = purpose === "signup" ? "create your account" : "sign in";
    const titleText =
      purpose === "signup" ? "Complete Your Registration" : "Your Login Code";

    const content = `
      <h2 style="color: #007bff;">🔐 ${titleText}</h2>
      <p>Please use the verification code below to ${actionText}:</p>
      
      <div class="info-box" style="border-left: 4px solid #007bff; text-align: center; padding: 30px 20px;">
        <h1 style="font-size: 48px; margin: 0; letter-spacing: 8px; color: #007bff; font-family: 'Courier New', monospace;">
          ${otpCode}
        </h1>
        <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Verification Code</p>
      </div>
      
      <div class="info-box" style="border-left: 4px solid #f0ad4e; background-color: #fef5e7;">
        <h3>⏰ Important Security Information</h3>
        <div class="detail-row"><span class="detail-label">Code Expires:</span><span><strong>10 minutes</strong></span></div>
        <div class="detail-row"><span class="detail-label">One-time Use:</span><span>Code becomes invalid after use</span></div>
        <div class="detail-row"><span class="detail-label">Security:</span><span>Never share this code with anyone</span></div>
      </div>
      
      <p>If you didn't request this code, please ignore this email. Your account remains secure.</p>
    `;

    return this.sendEmail({
      to: email,
      subject: `${APP_CONSTANTS.COMPANY.NAME} - Your Login Code: ${otpCode}`,
      html: this.getBaseTemplate(content),
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string): Promise<boolean> {
    const content = `
      <h2 style="color: #28a745;">🎉 Welcome to ${APP_CONSTANTS.COMPANY.NAME}!</h2>
      <p>Your account has been created successfully. We're excited to have you join our community!</p>
      
      <div class="info-box" style="border-left: 4px solid #28a745;">
        <h3>🚀 What's Next?</h3>
        <div class="detail-row"><span class="detail-label">✅ Account:</span><span>Created & Ready</span></div>
        <div class="detail-row"><span class="detail-label">🏠 Browse:</span><span>Explore amazing properties</span></div>
        <div class="detail-row"><span class="detail-label">📋 Book:</span><span>Make your first reservation</span></div>
      </div>
      
      <p>Experience seamless booking with our passwordless login system - just your email and verification code!</p>
      <a href="${this.frontendUrl("/properties")}" class="button">Explore Properties</a>
    `;

    return this.sendEmail({
      to: email,
      subject: `Welcome to ${APP_CONSTANTS.COMPANY.NAME}!`,
      html: this.getBaseTemplate(content),
    });
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(email: string, booking: any): Promise<boolean> {
    const property = this.safeBookingProperty(booking.property);
    const content = `
      <h2>🎉 Booking Confirmation</h2>
      <p>Great news! Your booking has been confirmed.</p>
      
      <div class="info-box">
        <h3>📋 Booking Details</h3>
        <div class="detail-row"><span class="detail-label">Booking Code:</span><span>${booking.bookingCode || "N/A"}</span></div>
        <div class="detail-row"><span class="detail-label">Property:</span><span>${property.name}</span></div>
        <div class="detail-row"><span class="detail-label">Location:</span><span>${property.address || property.city}</span></div>
        <div class="detail-row"><span class="detail-label">Check-in:</span><span>${booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString() : "N/A"}</span></div>
        <div class="detail-row"><span class="detail-label">Check-out:</span><span>${booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString() : "N/A"}</span></div>
        <div class="detail-row"><span class="detail-label">Guests:</span><span>${booking.adults || 1} adult(s)${booking.children ? `, ${booking.children} children` : ""}</span></div>
        <div class="detail-row"><span class="detail-label">Total Amount:</span><span><strong>${booking.currency || "NGN"} ${(booking.total || 0).toLocaleString()}</strong></span></div>
      </div>
      
      <p>We're excited to host you! If you have any questions, feel free to reach out.</p>
      <a href="${this.frontendUrl(`/booking/${booking.bookingCode || booking.id || ""}`)}" class="button">View Booking Details</a>
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
  async sendPasswordResetEmail(
    email: string,
    resetToken: string
  ): Promise<boolean> {
    // Use API route (adds /api/v1 automatically)
    const resetapiUrl = this.apiUrl(`/auth/reset-password?token=${resetToken}`);
    const content = `
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password. Click below:</p>
      <a href="${resetapiUrl}" class="button">Reset Password</a>
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
  async sendEmailVerification(
    email: string,
    verificationToken: string
  ): Promise<boolean> {
    // Use backend API route for verification
    const verifyapiUrl = this.apiUrl(`/auth/verify-email/${verificationToken}`);

    const content = `
      <h2>Verify Your Email Address</h2>
      <p>Please click the button below to verify your email address:</p>
      <a href="${verifyapiUrl}" class="button">Verify Email</a>
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
  async sendReceiptUploadedNotification(
    email: string,
    booking: any
  ): Promise<boolean> {
    const content = `
      <h2>Payment Receipt Uploaded</h2>
      <p>A payment receipt has been uploaded for booking ${booking.bookingCode}.</p>
      <div class="info-box">
        <p><strong>Property:</strong> ${booking.property.name}</p>
        <p><strong>Amount:</strong> ${booking.currency} ${booking.total.toLocaleString()}</p>
      </div>
      <p>Our team will verify the receipt within 24 hours.</p>
      <a href="${this.frontendUrl(`/booking/${booking.bookingCode || booking.id}`)}" class="button">View Booking</a>
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
  async sendReceiptVerifiedNotification(
    email: string,
    booking: any
  ): Promise<boolean> {
    const content = `
      <h2>Payment Verified</h2>
      <p>Your payment for booking ${booking.bookingCode} has been verified.</p>
      <div class="info-box">
        <p><strong>Property:</strong> ${booking.property.name}</p>
        <p><strong>Check-in:</strong> ${new Date(booking.checkInDate).toLocaleDateString()}</p>
        <p><strong>Check-out:</strong> ${new Date(booking.checkOutDate).toLocaleDateString()}</p>
      </div>
      <p>You're all set for your stay!</p>
      <a href="${this.frontendUrl(`/booking/${booking.bookingCode || booking.id}`)}" class="button">View Booking Details</a>
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
  async sendBookingApprovedEmail(
    email: string,
    booking: any
  ): Promise<boolean> {
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
      <a href="${this.frontendUrl(`/booking/${booking.bookingCode || booking.id}/payment`)}" class="button">Make Payment</a>
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
  async sendBookingCancelledEmail(
    email: string,
    booking: any,
    reason?: string
  ): Promise<boolean> {
    const property = this.safeBookingProperty(booking.property);
    const content = `
      <h2>Booking Cancelled</h2>
      <p>Your booking ${booking.bookingCode || ""} has been cancelled.</p>
      <div class="info-box">
        <p><strong>Property:</strong> ${property.name}</p>
        <p><strong>Original Dates:</strong> ${
          booking.checkInDate && booking.checkOutDate
            ? `${new Date(booking.checkInDate).toLocaleDateString()} - ${new Date(booking.checkOutDate).toLocaleDateString()}`
            : "N/A"
        }</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
      </div>
      ${booking.refundAmount ? `<p>A refund of ${booking.currency || "NGN"} ${(booking.refundAmount || 0).toLocaleString()} will be processed within 5-7 business days.</p>` : ""}
      <p>If you have any questions, please contact our support team.</p>
      <a href="${this.frontendUrl("/support")}" class="button">Contact Support</a>
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
  async sendPropertyApprovedEmail(
    email: string,
    property: any
  ): Promise<boolean> {
    const content = `
      <h2 style="color: #28a745;">🎉 Property Approved!</h2>
      <p>Congratulations! Your property listing has been approved and is now live.</p>
      
      <div class="info-box" style="border-left: 4px solid #28a745;">
        <h3>🏠 Property Details</h3>
        <div class="detail-row"><span class="detail-label">Name:</span><span><strong>${property.name}</strong></span></div>
        <div class="detail-row"><span class="detail-label">Location:</span><span>${property.city}, ${property.state}</span></div>
        <div class="detail-row"><span class="detail-label">Type:</span><span>${property.type}</span></div>
        <div class="detail-row"><span class="detail-label">Status:</span><span style="color: #28a745;">✅ Live & Bookable</span></div>
        <div class="detail-row"><span class="detail-label">Approved Date:</span><span>${new Date().toLocaleDateString()}</span></div>
      </div>
      
      <p>Your property is now available for bookings! Guests can now discover and book your space.</p>
      <a href="${this.frontendUrl(`/property/${property.id}`)}" class="button">View Property Listing</a>
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
  async sendPropertyRejectedEmail(
    email: string,
    property: any,
    reason: string
  ): Promise<boolean> {
    const content = `
      <h2 style="color: #dc3545;">📝 Property Review Update</h2>
      <p>Thank you for submitting your property. Unfortunately, it requires some revisions before approval.</p>
      
      <div class="info-box" style="border-left: 4px solid #dc3545;">
        <h3>🏠 Property Details</h3>
        <div class="detail-row"><span class="detail-label">Name:</span><span><strong>${property.name}</strong></span></div>
        <div class="detail-row"><span class="detail-label">Status:</span><span style="color: #dc3545;">❌ Needs Revision</span></div>
        <div class="detail-row"><span class="detail-label">Review Date:</span><span>${new Date().toLocaleDateString()}</span></div>
      </div>
      
      <div class="info-box" style="border-left: 4px solid #f0ad4e; background-color: #fef5e7;">
        <h3>⚠️ Required Changes</h3>
        <div class="detail-row"><span class="detail-label">Feedback:</span><span>${reason}</span></div>
      </div>
      
      <p>Please address the feedback above and resubmit your property. Our team will review it promptly.</p>
      <a href="${this.frontendUrl(`/dashboard/properties/${property.id}/edit`)}" class="button">Edit & Resubmit Property</a>
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
  async sendReviewRequestEmail(email: string, booking: any): Promise<boolean> {
    const content = `
      <h2 style="color: #007bff;">⭐ How was your stay?</h2>
      <p>We hope you had a wonderful experience at ${booking.property.name}!</p>
      <p>Your feedback helps other travelers make informed decisions and helps hosts improve their service.</p>
      
      <div class="info-box" style="border-left: 4px solid #007bff;">
        <h3>🏠 Stay Summary</h3>
        <div class="detail-row"><span class="detail-label">Property:</span><span><strong>${booking.property.name}</strong></span></div>
        <div class="detail-row"><span class="detail-label">Check-in:</span><span>${new Date(booking.checkInDate).toLocaleDateString()}</span></div>
        <div class="detail-row"><span class="detail-label">Check-out:</span><span>${new Date(booking.checkOutDate).toLocaleDateString()}</span></div>
        <div class="detail-row"><span class="detail-label">Duration:</span><span>${Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 3600 * 24))} nights</span></div>
        <div class="detail-row"><span class="detail-label">Booking ID:</span><span>#${booking.id}</span></div>
      </div>
      
      <p>Share your experience and help our community thrive!</p>
      <a href="${this.frontendUrl(`/booking/${booking.bookingCode || booking.id}/review`)}" class="button">Write Your Review ⭐</a>
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
  async sendPasswordChangeNotification(email: string): Promise<boolean> {
    const content = `
      <h2 style="color: #28a745;">🔒 Password Changed Successfully</h2>
      <p>Your account password has been updated successfully.</p>
      
      <div class="info-box" style="border-left: 4px solid #28a745;">
        <h3>🔐 Security Details</h3>
        <div class="detail-row"><span class="detail-label">Changed On:</span><span>${new Date().toLocaleString()}</span></div>
        <div class="detail-row"><span class="detail-label">Environment:</span><span>${process.env.NODE_ENV === "production" ? "Production Server" : "Development Mode"}</span></div>
        <div class="detail-row"><span class="detail-label">Security Status:</span><span style="color: #28a745;">✅ Secure</span></div>
      </div>
      
      <div class="info-box" style="border-left: 4px solid #f0ad4e; background-color: #fef5e7;">
        <h3>⚠️ Security Notice</h3>
        <p>If you did not make this change, your account may have been compromised. Please contact our support team immediately.</p>
      </div>
      
      <p>Your account security is important to us. If this change was not made by you, please take action immediately.</p>
      <a href="${this.frontendUrl("/support")}" class="button">Contact Support Team</a>
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
  async sendAccountDeletionConfirmation(
    email: string,
    name: string
  ): Promise<boolean> {
    const content = `
      <h2>Account Deleted</h2>
      <p>Dear ${name},</p>
      <p>Your account has been deleted as requested.</p>
      <div class="info-box">
        <p>Your data will be permanently removed within 30 days.</p>
        <p>If this was a mistake, contact support within 7 days.</p>
      </div>
      <p>Thank you for being part of ${APP_CONSTANTS.COMPANY.NAME}.</p>
      <a href="mailto:${APP_CONSTANTS.COMPANY.SUPPORT_EMAIL}" class="button">Contact Support</a>
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
  async sendHostBookingNotification(
    email: string,
    booking: any
  ): Promise<boolean> {
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
      <a href="${this.frontendUrl(`/dashboard/bookings/${booking.bookingCode || booking.id || ""}`)}" class="button">Review Booking</a>
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
  async sendPaymentReminderEmail(
    email: string,
    booking: any
  ): Promise<boolean> {
    const content = `
      <h2>Payment Reminder</h2>
      <p>Your payment for booking ${booking.bookingCode} is pending.</p>
      <div class="info-box">
        <p><strong>Property:</strong> ${booking.property.name}</p>
        <p><strong>Amount Due:</strong> ${booking.currency} ${booking.total.toLocaleString()}</p>
      </div>
      <p>Please complete payment soon.</p>
      <a href="${this.frontendUrl(`/booking/${booking.bookingCode || booking.id}/payment`)}" class="button">Make Payment</a>
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
  async sendCheckInReminderEmail(
    email: string,
    booking: any
  ): Promise<boolean> {
    const property = this.safeBookingProperty(booking.property);
    const content = `
      <h2>Check-in Reminder</h2>
      <p>Your check-in at <strong>${property.name}</strong> is tomorrow!</p>
      
      <div class="info-box">
        <h3>📍 Check-in Details</h3>
        <div class="detail-row"><span class="detail-label">Date:</span><span>${booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString() : "N/A"}</span></div>
        <div class="detail-row"><span class="detail-label">Time:</span><span>After 3:00 PM</span></div>
        <div class="detail-row"><span class="detail-label">Address:</span><span>${property.address}, ${property.city}</span></div>
      </div>
      
      <div class="info-box">
        <h3>👤 Host Information</h3>
        <div class="detail-row"><span class="detail-label">Host:</span><span>${property.host.firstName} ${property.host.lastName}</span></div>
        <div class="detail-row"><span class="detail-label">Phone:</span><span>${property.host.phone || "Available in app"}</span></div>
      </div>
      
      <p>Have a wonderful stay!</p>
      <a href="${this.frontendUrl(`/booking/${booking.bookingCode || booking.id || ""}`)}" class="button">View Booking Details</a>
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
  async sendReviewStatusUpdate(
    email: string,
    data: {
      customerName: string;
      propertyName: string;
      approved: boolean;
      adminNotes?: string;
    }
  ): Promise<boolean> {
    const content = `
      <h2>Review Update - ${data.propertyName}</h2>
      <p>Dear ${data.customerName},</p>
      <div class="info-box">
        <p>Your review for <strong>${data.propertyName}</strong> has been <strong>${data.approved ? "approved" : "rejected"}</strong>.</p>
        ${data.adminNotes && !data.approved ? `<p><strong>Admin Notes:</strong> ${data.adminNotes}</p>` : ""}
        <p>${data.approved ? "Your review is now publicly visible." : "Please consider submitting a revised review."}</p>
      </div>
      ${
        data.approved
          ? `<a href="${this.frontendUrl(`/property/${data.propertyName}`)}" class="button">View Property</a>`
          : `<a href="${this.frontendUrl("/support")}" class="button">Contact Support</a>`
      }
      <p>Thank you for sharing your feedback with the ${APP_CONSTANTS.COMPANY.NAME} community.</p>
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
  async sendPaymentConfirmation(
    email: string,
    data: {
      customerName: string;
      bookingCode: string;
      propertyName: string;
      amount: number;
      paymentReference: string;
    }
  ): Promise<boolean> {
    const content = `
      <h2 style="color: #28a745;">💳 Payment Confirmed</h2>
      <p>Dear <strong>${data.customerName}</strong>,</p>
      <p>Your payment for booking <strong>${data.bookingCode}</strong> at <strong>${data.propertyName}</strong> has been successfully received.</p>
      
      <div class="info-box" style="border-left: 4px solid #28a745;">
        <h3>💰 Payment Details</h3>
        <div class="detail-row"><span class="detail-label">Amount Paid:</span><span><strong>₦${data.amount.toLocaleString()}</strong></span></div>
        <div class="detail-row"><span class="detail-label">Payment Reference:</span><span>${data.paymentReference}</span></div>
        <div class="detail-row"><span class="detail-label">Payment Date:</span><span>${new Date().toLocaleDateString()}</span></div>
        <div class="detail-row"><span class="detail-label">Status:</span><span style="color: #28a745;">✅ Confirmed</span></div>
      </div>
      
      <p>Your booking is now fully confirmed. We look forward to hosting you!</p>
      <a href="${this.frontendUrl(`/booking/${data.bookingCode}`)}" class="button">View Booking Details</a>
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
  async sendPaymentNotificationToHost(
    email: string,
    data: {
      hostName: string;
      customerName: string;
      bookingCode: string;
      propertyName: string;
      amount: number;
    }
  ): Promise<boolean> {
    const content = `
      <h2>Payment Received</h2>
      <p>Dear ${data.hostName},</p>
      <p>A payment has been received for booking <strong>${data.bookingCode}</strong>.</p>
      <div class="info-box">
        <p><strong>Guest:</strong> ${data.customerName}</p>
        <p><strong>Amount Paid:</strong> ${data.amount.toLocaleString()}</p>
      </div>
      <p>View the booking details in your dashboard.</p>
      <a href="${this.frontendUrl(`/dashboard/bookings/${data.bookingCode}`)}" class="button">View Booking</a>
    `;

    return this.sendEmail({
      to: email,
      subject: `Payment Received - ${data.bookingCode}`,
      html: this.getBaseTemplate(content),
    });
  }

  /**
   * Send a refund notification email to customer
   */
  async sendRefundNotification(
    email: string,
    booking: any,
    refundAmount: number,
    reason?: string
  ): Promise<boolean> {
    const property = this.safeBookingProperty(booking.property);
    const content = `
    <h2>Refund Processed</h2>
    <p>Dear ${booking.customer.firstName || "Customer"},</p>
    <p>Your refund for booking <strong>${booking.bookingCode}</strong> at <strong>${property.name}</strong> has been processed.</p>
    <div class="info-box">
      <p><strong>Amount Refunded:</strong> ${booking.currency || "NGN"} ${refundAmount.toLocaleString()}</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
    </div>
    <p>The refunded amount should reflect in your account within a few business days.</p>
    <a href="${this.frontendUrl(`/booking/${booking.bookingCode || booking.id}`)}" class="button">View Booking</a>
  `;
    return this.sendEmail({
      to: email,
      subject: `Refund Processed - ${booking.bookingCode}`,
      html: this.getBaseTemplate(content),
    });
  }

  /**
   * Send booking cancellation email with a refund request link
   */
  async sendBookingCancellationWithRefund(
    email: string,
    booking: any
  ): Promise<boolean> {
    const property = this.safeBookingProperty(booking.property);
    const refundLink = this.frontendUrl(
      `/booking/${booking.bookingCode || booking.id}/refund`
    );

    const content = `
    <h2>Booking Cancelled</h2>
    <p>Dear ${booking.customer.firstName || "Customer"},</p>
    <p>Your booking <strong>${booking.bookingCode}</strong> at <strong>${property.name}</strong> has been cancelled.</p>
    <div class="info-box">
      <p><strong>Property:</strong> ${property.name}</p>
      <p><strong>Original Dates:</strong> ${
        booking.checkInDate && booking.checkOutDate
          ? `${new Date(booking.checkInDate).toLocaleDateString()} - ${new Date(booking.checkOutDate).toLocaleDateString()}`
          : "N/A"
      }</p>
      <p>If you want to request a refund, please click the link below:</p>
      <a href="${refundLink}" class="button">Request Refund</a>
      <p>The refund reason is optional. If you leave it blank, it will default to the cancellation reason.</p>
    </div>
    <p>If you have any questions, please contact our support team.</p>
    <a href="${this.frontendUrl("/support")}" class="button">Contact Support</a>
  `;

    return this.sendEmail({
      to: email,
      subject: `Booking Cancelled - ${booking.bookingCode}`,
      html: this.getBaseTemplate(content),
    });
  }

  /**
   * Send a test email to verify email configuration
   */
  async sendTestEmail(
    email: string,
    data?: { recipientName?: string; testDate?: string; systemName?: string }
  ): Promise<boolean> {
    const content = `
      <h2 style="color: #28a745;">✅ Email Test Successful</h2>
      <p>Hello${data?.recipientName ? ` ${data.recipientName}` : ""},</p>
      <p>This is a test email from ${data?.systemName || APP_CONSTANTS.COMPANY.NAME} to verify email functionality.</p>
      
      <div class="info-box" style="border-left: 4px solid #28a745;">
        <h3>📧 Test Details</h3>
        <div class="detail-row"><span class="detail-label">Sent At:</span><span>${data?.testDate || new Date().toLocaleString()}</span></div>
        <div class="detail-row"><span class="detail-label">Recipient:</span><span>${email}</span></div>
        <div class="detail-row"><span class="detail-label">System:</span><span>${data?.systemName || APP_CONSTANTS.COMPANY.NAME}</span></div>
        <div class="detail-row"><span class="detail-label">Status:</span><span style="color: #28a745;">✅ Configuration Working</span></div>
      </div>
      
      <p>Congratulations! If you're reading this, your email configuration is working perfectly.</p>
    `;

    return this.sendEmail({
      to: email,
      subject: "Test Email - Email Configuration Successful",
      html: this.getBaseTemplate(content),
    });
  }

  /**
   * Send admin notification about new receipt upload
   */
  async sendAdminReceiptUploadNotification(
    adminEmail: string,
    payment: any,
    booking: any,
    filename: string
  ): Promise<boolean> {
    const content = `
      <h2>Payment Receipt Verification Required</h2>
      <p>A customer has uploaded a payment receipt that requires manual verification.</p>
      
      <div class="info-box">
        <h3>Payment Details:</h3>
        <ul>
          <li><strong>Payment ID:</strong> ${payment.id}</li>
          <li><strong>Booking ID:</strong> ${booking.id}</li>
          <li><strong>Booking Code:</strong> ${booking.bookingCode}</li>
          <li><strong>Amount:</strong> ₦${payment.amount.toLocaleString()}</li>
          <li><strong>Property:</strong> ${booking.property.name}</li>
          <li><strong>Customer:</strong> ${booking.customer.firstName} ${booking.customer.lastName}</li>
          <li><strong>Customer Email:</strong> ${booking.customer.email}</li>
          <li><strong>Receipt File:</strong> ${filename}</li>
        </ul>
      </div>
      
      <p>Please verify this payment in the admin dashboard within 24 hours.</p>
      <a href="${this.apiUrl(`/admin/payments/pending-verification`)}" class="button">Review Payment</a>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `New Payment Receipt Uploaded - ${booking.bookingCode}`,
      html: this.getBaseTemplate(content),
    });
  }
  /**
   * Send auto-cancellation email to customer
   */
  public async sendBookingAutoCancelledToCustomer({
    customerName,
    customerEmail,
    bookingCode,
    propertyName,
    checkInDate,
    checkOutDate,
    cancellationTimeoutHours,
  }: {
    customerName: string;
    customerEmail: string;
    bookingCode: string;
    propertyName: string;
    checkInDate: Date;
    checkOutDate: Date;
    cancellationTimeoutHours: number;
  }): Promise<void> {
    const content = `
      <h2 style="color: #dc3545;">Booking Automatically Cancelled</h2>
      <p>Dear <strong>${customerName}</strong>,</p>
      
      <p>Your booking <strong>${bookingCode}</strong> for <strong>${propertyName}</strong> has been automatically cancelled because payment was not completed within ${cancellationTimeoutHours} hour(s) of approval.</p>
      
      <div class="info-box" style="border-left: 4px solid #dc3545;">
        <h3>📋 Booking Details</h3>
        <div class="detail-row"><span class="detail-label">Booking Code:</span><span>${bookingCode}</span></div>
        <div class="detail-row"><span class="detail-label">Property:</span><span>${propertyName}</span></div>
        <div class="detail-row"><span class="detail-label">Check-in:</span><span>${checkInDate.toLocaleDateString()}</span></div>
        <div class="detail-row"><span class="detail-label">Check-out:</span><span>${checkOutDate.toLocaleDateString()}</span></div>
        <div class="detail-row"><span class="detail-label">Cancellation Time:</span><span>${new Date().toLocaleString()}</span></div>
      </div>

      <h3>🔄 What happens now?</h3>
      <ul>
        <li>The booking has been cancelled and the dates are now available for other guests</li>
        <li>You can create a new booking if the property is still available</li>
        <li>For future bookings, please complete payment within ${cancellationTimeoutHours} hour(s) of approval</li>
        <li>No charges have been made to your account</li>
      </ul>

      <p>If you have any questions about this cancellation or need assistance with a new booking, please contact our support team.</p>
      <a href="${this.frontendUrl("/support")}" class="button">Contact Support</a>
    `;

    await this.sendEmail({
      to: customerEmail,
      subject: "Booking Cancelled - Payment Timeout",
      html: this.getBaseTemplate(content),
    });
  }

  /**
   * Send auto-cancellation notification to host
   */
  public async sendBookingAutoCancelledToHost({
    hostName,
    hostEmail,
    bookingCode,
    propertyName,
    customerName,
    checkInDate,
    checkOutDate,
  }: {
    hostName: string;
    hostEmail: string;
    bookingCode: string;
    propertyName: string;
    customerName: string;
    checkInDate: Date;
    checkOutDate: Date;
  }): Promise<void> {
    const content = `
      <h2 style="color: #ffc107;">Booking Auto-Cancelled</h2>
      <p>Dear <strong>${hostName}</strong>,</p>
      
      <p>A booking for your property <strong>${propertyName}</strong> has been automatically cancelled due to non-payment within the required timeframe.</p>
      
      <div class="info-box" style="border-left: 4px solid #ffc107;">
        <h3>📋 Cancelled Booking Details</h3>
        <div class="detail-row"><span class="detail-label">Booking Code:</span><span>${bookingCode}</span></div>
        <div class="detail-row"><span class="detail-label">Guest:</span><span>${customerName}</span></div>
        <div class="detail-row"><span class="detail-label">Property:</span><span>${propertyName}</span></div>
        <div class="detail-row"><span class="detail-label">Check-in:</span><span>${checkInDate.toLocaleDateString()}</span></div>
        <div class="detail-row"><span class="detail-label">Check-out:</span><span>${checkOutDate.toLocaleDateString()}</span></div>
        <div class="detail-row"><span class="detail-label">Cancellation Time:</span><span>${new Date().toLocaleString()}</span></div>
      </div>

      <div class="info-box" style="background: #d4edda; border-left: 4px solid #28a745;">
        <h3>✅ Property Availability Restored</h3>
        <p>The dates are now available for new bookings. Your property calendar has been automatically updated.</p>
      </div>

      <p>This automatic cancellation helps ensure that approved bookings are backed by confirmed payments, maintaining the integrity of the booking system.</p>
      <a href="${this.frontendUrl("/dashboard")}" class="button">View Dashboard</a>
    `;

    await this.sendEmail({
      to: hostEmail,
      subject: "Booking Auto-Cancelled - Payment Timeout",
      html: this.getBaseTemplate(content),
    });
  }
}

export const emailService = new EmailService();
