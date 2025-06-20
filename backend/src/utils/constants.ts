// MAR ABU PROJECTS SERVICES LLC - Application Constants
export const APP_CONSTANTS = {
  COMPANY: {
    NAME: 'MAR ABU PROJECTS SERVICES LLC',
    PRIMARY_COLOR: '#F6931B',
    SECONDARY_COLOR: '#000000',
    EMAIL: 'info@marabuprojects.com',
    SUPPORT_EMAIL: 'support@marabuprojects.com',
    ADDRESS: 'Lagos, Nigeria',
  },
  
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_DOCUMENT_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_PROPERTY_IMAGES: 10,
    MAX_AVATAR_SIZE: 2 * 1024 * 1024, // 2MB
    ALLOWED_IMAGE_TYPES: [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ],
    ALLOWED_DOCUMENT_TYPES: [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    UPLOAD_PATHS: {
      PROPERTIES: 'properties',
      RECEIPTS: 'receipts', 
      AVATARS: 'avatars',
      TEMP: 'temp'
    }
  },
  
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    MIN_LIMIT: 1,
  },
  
  JWT: {
    ACCESS_TOKEN_EXPIRY: '1h',
    REFRESH_TOKEN_EXPIRY: '7d',
    RESET_TOKEN_EXPIRY: '1h',
  },
  
  RATE_LIMITS: {
    API: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 100,
    },
    AUTH: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes  
      MAX_REQUESTS: 5,
    },
    UPLOAD: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 10,
    },
  },
  
  BOOKING: {
    MIN_ADVANCE_HOURS: 24, // Minimum hours before check-in
    MAX_ADVANCE_DAYS: 365, // Maximum days in advance
    MIN_STAY_NIGHTS: 1,
    MAX_STAY_NIGHTS: 30,
    CHECKOUT_TIME: '11:00',
    CHECKIN_TIME: '15:00',
  },
  
  PRICING: {
    SERVICE_FEE_RATE: 0.05, // 5%
    MAX_SERVICE_FEE: 50000, // 50,000 NGN
    DEFAULT_CLEANING_FEE: 15000, // 15,000 NGN
    CURRENCY: 'NGN',
    LOCALE: 'en-NG',
  },
  
  PROPERTY: {
    MAX_GUESTS: 20,
    MAX_BEDROOMS: 10,
    MAX_BATHROOMS: 10,
    REQUIRED_FIELDS: [
      'name',
      'description', 
      'type',
      'address',
      'city',
      'state',
      'bedrooms',
      'bathrooms',
      'maxGuests',
      'baseRate'
    ],
  },
  
  EMAIL: {
    TEMPLATES: {
      WELCOME: 'welcome',
      BOOKING_CONFIRMATION: 'booking-confirmation',
      BOOKING_APPROVED: 'booking-approved', 
      BOOKING_CANCELLED: 'booking-cancelled',
      RECEIPT_UPLOADED: 'receipt-uploaded',
      RECEIPT_VERIFIED: 'receipt-verified',
      PASSWORD_RESET: 'password-reset',
      EMAIL_VERIFICATION: 'email-verification',
    },
  },
  
  NOTIFICATIONS: {
    TYPES: {
      BOOKING_CONFIRMATION: 'BOOKING_CONFIRMATION',
      BOOKING_APPROVED: 'BOOKING_APPROVED',
      BOOKING_CANCELLED: 'BOOKING_CANCELLED',
      PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
      REVIEW_REQUEST: 'REVIEW_REQUEST',
      SYSTEM_UPDATE: 'SYSTEM_UPDATE',
    },
    MAX_UNREAD: 50,
  },
  
  VALIDATION: {
    PASSWORD: {
      MIN_LENGTH: 8,
      REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      ERROR_MESSAGE: 'Password must contain uppercase, lowercase, number and special character'
    },
    PHONE: {
      REGEX: /^\+?[1-9]\d{1,14}$/,
      ERROR_MESSAGE: 'Invalid phone number format'
    },
    EMAIL: {
      REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      ERROR_MESSAGE: 'Invalid email format'
    }
  },
  
  AUDIT: {
    ACTIONS: {
      CREATE: 'CREATE',
      UPDATE: 'UPDATE', 
      DELETE: 'DELETE',
      LOGIN: 'LOGIN',
      LOGOUT: 'LOGOUT',
      VIEW: 'VIEW',
      EXPORT: 'EXPORT',
    },
    RETENTION_DAYS: 365, // Keep audit logs for 1 year
  },
  
  CACHE: {
    DEFAULT_TTL: 300, // 5 minutes
    SHORT_TTL: 60,    // 1 minute
    LONG_TTL: 3600,   // 1 hour
  },
  
  API: {
    VERSION: 'v1',
    PREFIX: '/api/v1',
    TIMEOUT: 30000, // 30 seconds
  },
  
  SECURITY: {
    BCRYPT_ROUNDS: 12,
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    FAILED_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  },
}