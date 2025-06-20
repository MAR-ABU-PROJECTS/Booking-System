// MAR ABU PROJECTS SERVICES LLC - Constants
// File: src/utils/constants.ts

export const APP_CONSTANTS = {
  // Company Info
  COMPANY: {
    NAME: 'MAR ABU PROJECTS SERVICES LLC',
    EMAIL: 'info@marabuprojects.com',
    PHONE: '+234 XXX XXX XXXX',
    ADDRESS: 'Lagos, Nigeria',
  },

  // Branding
  COLORS: {
    PRIMARY: '#F6931B',
    SECONDARY: '#000000',
  },

  // Booking
  BOOKING: {
    MIN_DAYS: 1,
    MAX_DAYS: 90,
    DEFAULT_CHECK_IN_TIME: '15:00',
    DEFAULT_CHECK_OUT_TIME: '11:00',
    CANCELLATION_HOURS: 48,
  },

  // Pricing
  PRICING: {
    DEFAULT_SERVICE_FEE_RATE: 0.05, // 5%
    DEFAULT_CURRENCY: 'NGN',
    MIN_PRICE: 1000,
    MAX_PRICE: 1000000,
  },

  // File Upload
  UPLOAD: {
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    MAX_PROPERTY_IMAGES: 20,
    MAX_RECEIPT_FILES: 5,
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // Authentication
  AUTH: {
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    JWT_EXPIRES_IN: '7d',
    REFRESH_TOKEN_EXPIRES_IN: '30d',
    VERIFICATION_TOKEN_EXPIRES_IN: '24h',
    RESET_TOKEN_EXPIRES_IN: '1h',
  },

  // Error Messages
  ERRORS: {
    UNAUTHORIZED: 'You are not authorized to perform this action',
    INVALID_CREDENTIALS: 'Invalid email or password',
    USER_NOT_FOUND: 'User not found',
    PROPERTY_NOT_FOUND: 'Property not found',
    BOOKING_NOT_FOUND: 'Booking not found',
    INVALID_DATE_RANGE: 'Invalid date range',
    PROPERTY_NOT_AVAILABLE: 'Property is not available for selected dates',
    BOOKING_ALREADY_EXISTS: 'A booking already exists for these dates',
    INVALID_FILE_TYPE: 'Invalid file type',
    FILE_TOO_LARGE: 'File size exceeds maximum allowed',
  },

  // Success Messages
  SUCCESS: {
    REGISTRATION: 'Registration successful! Please check your email to verify your account.',
    LOGIN: 'Login successful',
    LOGOUT: 'Logout successful',
    BOOKING_CREATED: 'Booking created successfully',
    BOOKING_APPROVED: 'Booking approved successfully',
    BOOKING_CANCELLED: 'Booking cancelled successfully',
    PROPERTY_CREATED: 'Property created successfully',
    PROPERTY_UPDATED: 'Property updated successfully',
    RECEIPT_UPLOADED: 'Receipt uploaded successfully',
    REVIEW_SUBMITTED: 'Review submitted successfully',
  },
}