// MAR ABU PROJECTS SERVICES LLC - Email Service
import nodemailer from 'nodemailer'
import { logger } from '../middlewares/logger.middleware'
import { APP_CONSTANTS } from '../utils/constants'
import { formatCurrency, formatDate } from '../utils/helpers'

// Email templates interface
interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

// Email options interface
interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: any[]
}

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    // Create transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    // Verify connection
    this.verifyConnection()
  }

  /**
   * Verify SMTP connection
   */
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify()
      logger.info('Email service connected successfully')
    } catch (error) {
      logger.error('Email service connection failed:', error)
    }
  }

  /**
   * Send email
   */
  private async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || `"${APP_CONSTANTS.COMPANY.NAME}" <noreply@marabuprojects.com>`,
        ...options,
      }

      const info = await this.transporter.sendMail(mailOptions)
      logger.info('Email sent successfully', { messageId: info.messageId, to: options.to })
      return true
    } catch (error) {
      logger.error('Failed to send email', { error, to: options.to })
      return false
    }
  }

  /**
   * Get base email template
   */
  private getBaseTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${APP_CONSTANTS.COMPANY.NAME}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background-color: ${APP_CONSTANTS.COLORS.PRIMARY};
            color: white;
            padding: 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 30px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: ${APP_CONSTANTS.COLORS.PRIMARY};
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            background-color: ${APP_CONSTANTS.COLORS.SECONDARY};
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 14px;
          }
          .info-box {
            background-color: #f9f9f9;
            border-left: 4px solid ${APP_CONSTANTS.COLORS.PRIMARY};
            padding: 15px;
            margin: 20px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .detail-label {
            font-weight: bold;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${APP_CONSTANTS.COMPANY.NAME}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${APP_CONSTANTS.COMPANY.NAME}. All rights reserved.</p>
            <p>${APP_CONSTANTS.COMPANY.ADDRESS}</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user: {
    email: string
    firstName: string
    lastName: string
  }): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Welcome to ${APP_CONSTANTS.COMPANY.NAME}!`,
      html: this.getBaseTemplate(`
        <h2>Welcome ${user.firstName}!</h2>
        <p>Thank you for joining ${APP_CONSTANTS.COMPANY.NAME}. We're excited to have you on board.</p>
        <p>Your account has been created successfully. To get started, please verify your email address by clicking the button below:</p>
        <center>
          <a href="${process.env.FRONTEND_URL}/verify-email" class="button">Verify Email Address</a>
        </center>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>The ${APP_CONSTANTS.COMPANY.NAME} Team</p>
      `),
    }

    return this.sendEmail({
      to: user.email,
      ...template,
    })
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(booking: {
    guestEmail: string
    guestName: string
    bookingNumber: string
    property: {
      name: string
      address: string
      city: string
    }
    checkIn: Date
    checkOut: Date
    totalGuests: number
    total: number
  }): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Booking Confirmation - ${booking.bookingNumber}`,
      html: this.getBaseTemplate(`
        <h2>Booking Confirmation</h2>
        <p>Dear ${booking.guestName},</p>
        <p>Your booking request has been received and is pending approval from the property host.</p>
        
        <div class="info-box">
          <h3>Booking Details</h3>
          <div class="detail-row">
            <span class="detail-label">Booking Number:</span>
            <span>${booking.bookingNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Property:</span>
            <span>${booking.property.name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Location:</span>
            <span>${booking.property.address}, ${booking.property.city}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Check-in:</span>
            <span>${formatDate(booking.checkIn, 'long')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Check-out:</span>
            <span>${formatDate(booking.checkOut, 'long')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Guests:</span>
            <span>${booking.totalGuests}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Total Amount:</span>
            <span><strong>${formatCurrency(booking.total)}</strong></span>
          </div>
        </div>
        
        <p>You will receive another email once the host approves your booking. After approval, you can proceed with the payment.</p>
        
        <center>
          <a href="${process.env.FRONTEND_URL}/bookings/${booking.bookingNumber}" class="button">View Booking</a>
        </center>
        
        <p>Thank you for choosing ${APP_CONSTANTS.COMPANY.NAME}!</p>
      `),
    }

    return this.sendEmail({
      to: booking.guestEmail,
      ...template,
    })
  }

  /**
   * Send booking approved email
   */
  async sendBookingApproved(booking: {
    guestEmail: string
    guestName: string
    bookingNumber: string
    property: { name: string }
    total: number
  }): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Booking Approved - ${booking.bookingNumber}`,
      html: this.getBaseTemplate(`
        <h2>Great News! Your Booking is Approved</h2>
        <p>Dear ${booking.guestName},</p>
        <p>Your booking for <strong>${booking.property.name}</strong> has been approved!</p>
        
        <div class="info-box">
          <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
          <p><strong>Total Amount:</strong> ${formatCurrency(booking.total)}</p>
        </div>
        
        <p>Please proceed with the payment to confirm your reservation. You can upload your payment receipt through your dashboard.</p>
        
        <center>
          <a href="${process.env.FRONTEND_URL}/bookings/${booking.bookingNumber}/payment" class="button">Upload Payment Receipt</a>
        </center>
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
      `),
    }

    return this.sendEmail({
      to: booking.guestEmail,
      ...template,
    })
  }

  /**
   * Send booking cancelled email
   */
  async sendBookingCancelled(booking: {
    guestEmail: string
    guestName: string
    bookingNumber: string
    property: { name: string }
    reason?: string
  }): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Booking Cancelled - ${booking.bookingNumber}`,
      html: this.getBaseTemplate(`
        <h2>Booking Cancellation</h2>
        <p>Dear ${booking.guestName},</p>
        <p>We regret to inform you that your booking has been cancelled.</p>
        
        <div class="info-box">
          <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
          <p><strong>Property:</strong> ${booking.property.name}</p>
          ${booking.reason ? `<p><strong>Reason:</strong> ${booking.reason}</p>` : ''}
        </div>
        
        <p>If you have already made a payment, a refund will be processed within 5-7 business days.</p>
        <p>We apologize for any inconvenience caused. Please feel free to browse other available properties on our platform.</p>
        
        <center>
          <a href="${process.env.FRONTEND_URL}/properties" class="button">Browse Properties</a>
        </center>
      `),
    }

    return this.sendEmail({
      to: booking.guestEmail,
      ...template,
    })
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(user: {
    email: string
    firstName: string
    resetToken: string
  }): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${user.resetToken}`
    
    const template: EmailTemplate = {
      subject: 'Password Reset Request',
      html: this.getBaseTemplate(`
        <h2>Password Reset Request</h2>
        <p>Hi ${user.firstName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        
        <center>
          <a href="${resetUrl}" class="button">Reset Password</a>
        </center>
        
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        
        <p>Best regards,<br>The ${APP_CONSTANTS.COMPANY.NAME} Team</p>
      `),
    }

    return this.sendEmail({
      to: user.email,
      ...template,
    })
  }

  /**
   * Send receipt verified email
   */
  async sendReceiptVerified(booking: {
    guestEmail: string
    guestName: string
    bookingNumber: string
  }): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Payment Confirmed - ${booking.bookingNumber}`,
      html: this.getBaseTemplate(`
        <h2>Payment Confirmed!</h2>
        <p>Dear ${booking.guestName},</p>
        <p>Your payment has been verified successfully. Your booking is now confirmed!</p>
        
        <div class="info-box">
          <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
          <p><strong>Status:</strong> Confirmed</p>
        </div>
        
        <p>You will receive the property access details and check-in instructions closer to your arrival date.</p>
        
        <center>
          <a href="${process.env.FRONTEND_URL}/bookings/${booking.bookingNumber}" class="button">View Booking Details</a>
        </center>
        
        <p>Thank you for your booking!</p>
      `),
    }

    return this.sendEmail({
      to: booking.guestEmail,
      ...template,
    })
  }

  /**
   * Send review request email
   */
  async sendReviewRequest(booking: {
    guestEmail: string
    guestName: string
    bookingNumber: string
    property: { name: string }
  }): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `How was your stay at ${booking.property.name}?`,
      html: this.getBaseTemplate(`
        <h2>We'd Love Your Feedback!</h2>
        <p>Dear ${booking.guestName},</p>
        <p>We hope you enjoyed your stay at <strong>${booking.property.name}</strong>.</p>
        
        <p>Your feedback is important to us and helps other guests make informed decisions. Please take a moment to share your experience.</p>
        
        <center>
          <a href="${process.env.FRONTEND_URL}/bookings/${booking.bookingNumber}/review" class="button">Write a Review</a>
        </center>
        
        <p>Thank you for choosing ${APP_CONSTANTS.COMPANY.NAME}!</p>
      `),
    }

    return this.sendEmail({
      to: booking.guestEmail,
      ...template,
    })
  }
}

// Export singleton instance
export const emailService = new EmailService()