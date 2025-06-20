// MAR ABU PROJECTS SERVICES LLC - Helper Functions
import crypto from 'crypto'
import { APP_CONSTANTS } from './constants'

/**
 * Format currency to Nigerian Naira
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat(APP_CONSTANTS.PRICING.LOCALE, {
    style: 'currency',
    currency: APP_CONSTANTS.PRICING.CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date for display
 */
export const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Africa/Lagos',
    ...options,
  }
  
  return new Intl.DateTimeFormat('en-NG', defaultOptions).format(dateObj)
}

/**
 * Format date and time for display
 */
export const formatDateTime = (date: Date | string): string => {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Generate unique booking number
 */
export const generateBookingNumber = async (): Promise<string> => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `MAR-${timestamp}-${random}`
}

/**
 * Calculate booking pricing
 */
export const calculatePricing = (
  checkIn: Date,
  checkOut: Date,
  baseRate: number,
  cleaningFee: number = 0,
  serviceFeeRate: number = APP_CONSTANTS.PRICING.SERVICE_FEE_RATE
) => {
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  
  if (nights <= 0) {
    throw new Error('Check-out date must be after check-in date')
  }
  
  const subtotal = nights * baseRate
  let serviceFee = Math.round(subtotal * serviceFeeRate)
  
  // Cap service fee at maximum
  if (serviceFee > APP_CONSTANTS.PRICING.MAX_SERVICE_FEE) {
    serviceFee = APP_CONSTANTS.PRICING.MAX_SERVICE_FEE
  }
  
  const total = subtotal + cleaningFee + serviceFee
  
  return {
    nights,
    baseRate,
    subtotal,
    serviceFee,
    cleaningFee,
    total,
  }
}

/**
 * Generate secure random string
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Generate secure random code (numeric)
 */
export const generateSecureCode = (length: number = 6): string => {
  const chars = '0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  return APP_CONSTANTS.VALIDATION.EMAIL.REGEX.test(email)
}

/**
 * Validate phone number format
 */
export const isValidPhone = (phone: string): boolean => {
  return APP_CONSTANTS.VALIDATION.PHONE.REGEX.test(phone)
}

/**
 * Validate password strength
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= APP_CONSTANTS.VALIDATION.PASSWORD.MIN_LENGTH && 
         APP_CONSTANTS.VALIDATION.PASSWORD.REGEX.test(password)
}

/**
 * Sanitize filename for file uploads
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Generate slug from string
 */
export const generateSlug = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Calculate pagination info
 */
export const calculatePagination = (
  page: number,
  limit: number,
  total: number
) => {
  const pages = Math.ceil(total / limit)
  const hasNext = page < pages
  const hasPrev = page > 1
  const offset = (page - 1) * limit
  
  return {
    page,
    limit,
    total,
    pages,
    hasNext,
    hasPrev,
    offset,
  }
}

/**
 * Validate pagination parameters
 */
export const validatePagination = (page?: string, limit?: string) => {
  let pageNum = parseInt(page || '1')
  let limitNum = parseInt(limit || APP_CONSTANTS.PAGINATION.DEFAULT_LIMIT.toString())
  
  // Ensure valid page number
  if (isNaN(pageNum) || pageNum < 1) {
    pageNum = 1
  }
  
  // Ensure valid limit
  if (isNaN(limitNum) || limitNum < APP_CONSTANTS.PAGINATION.MIN_LIMIT) {
    limitNum = APP_CONSTANTS.PAGINATION.DEFAULT_LIMIT
  }
  
  if (limitNum > APP_CONSTANTS.PAGINATION.MAX_LIMIT) {
    limitNum = APP_CONSTANTS.PAGINATION.MAX_LIMIT
  }
  
  return { page: pageNum, limit: limitNum }
}

/**
 * Calculate date difference in days
 */
export const daysBetween = (startDate: Date, endDate: Date): number => {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if date is in the future
 */
export const isFutureDate = (date: Date): boolean => {
  return date.getTime() > Date.now()
}

/**
 * Check if date is within business hours
 */
export const isBusinessHours = (date: Date): boolean => {
  const hour = date.getHours()
  const day = date.getDay() // 0 = Sunday, 6 = Saturday
  
  // Monday to Friday, 9 AM to 6 PM
  return day >= 1 && day <= 5 && hour >= 9 && hour < 18
}

/**
 * Format file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Generate initials from name
 */
export const generateInitials = (firstName: string, lastName?: string): string => {
  const first = firstName.charAt(0).toUpperCase()
  const last = lastName ? lastName.charAt(0).toUpperCase() : ''
  return first + last
}

/**
 * Mask sensitive data (email, phone)
 */
export const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@')
  const maskedLocal = local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1)
  return `${maskedLocal}@${domain}`
}

export const maskPhone = (phone: string): string => {
  if (phone.length < 4) return phone
  return '*'.repeat(phone.length - 4) + phone.slice(-4)
}

/**
 * Generate color from string (for avatars)
 */
export const stringToColor = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const hue = hash % 360
  return `hsl(${hue}, 70%, 50%)`
}

/**
 * Validate booking dates
 */
export const validateBookingDates = (checkIn: Date, checkOut: Date) => {
  const now = new Date()
  const minAdvance = new Date(now.getTime() + APP_CONSTANTS.BOOKING.MIN_ADVANCE_HOURS * 60 * 60 * 1000)
  const maxAdvance = new Date(now.getTime() + APP_CONSTANTS.BOOKING.MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000)
  
  const errors: string[] = []
  
  if (checkIn < minAdvance) {
    errors.push(`Check-in must be at least ${APP_CONSTANTS.BOOKING.MIN_ADVANCE_HOURS} hours in advance`)
  }
  
  if (checkIn > maxAdvance) {
    errors.push(`Check-in cannot be more than ${APP_CONSTANTS.BOOKING.MAX_ADVANCE_DAYS} days in advance`)
  }
  
  if (checkOut <= checkIn) {
    errors.push('Check-out date must be after check-in date')
  }
  
  const nights = daysBetween(checkIn, checkOut)
  if (nights < APP_CONSTANTS.BOOKING.MIN_STAY_NIGHTS) {
    errors.push(`Minimum stay is ${APP_CONSTANTS.BOOKING.MIN_STAY_NIGHTS} night(s)`)
  }
  
  if (nights > APP_CONSTANTS.BOOKING.MAX_STAY_NIGHTS) {
    errors.push(`Maximum stay is ${APP_CONSTANTS.BOOKING.MAX_STAY_NIGHTS} nights`)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    nights,
  }
}

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Capitalize first letter of each word
 */
export const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
}