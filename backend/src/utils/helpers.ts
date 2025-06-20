// ===============================
// File: src/utils/helpers.ts
// ===============================

import crypto from 'crypto'
import { APP_CONSTANTS } from './constants'

/**
 * Format currency
 */
export const formatCurrency = (amount: number, currency: string = APP_CONSTANTS.PRICING.DEFAULT_CURRENCY): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Format date
 */
export const formatDate = (date: Date | string, format: 'short' | 'long' = 'short'): string => {
  const d = new Date(date)
  if (format === 'short') {
    return d.toLocaleDateString('en-NG')
  }
  return d.toLocaleDateString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Calculate nights between dates
 */
export const calculateNights = (checkIn: Date | string, checkOut: Date | string): number => {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const diff = end.getTime() - start.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Generate random string
 */
export const generateRandomString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Generate OTP
 */
export const generateOTP = (length: number = 6): string => {
  const digits = '0123456789'
  let otp = ''
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)]
  }
  return otp
}

/**
 * Sanitize filename
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
}

/**
 * Validate Nigerian phone number
 */
export const validateNigerianPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '')
  const regex = /^(234|0)(70|80|81|90|91|80|81|70)\d{8}$/
  return regex.test(cleaned)
}

/**
 * Format Nigerian phone number
 */
export const formatNigerianPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('234')) {
    return `+${cleaned}`
  } else if (cleaned.startsWith('0')) {
    return `+234${cleaned.substring(1)}`
  }
  return phone
}

/**
 * Calculate service fee
 */
export const calculateServiceFee = (subtotal: number, rate: number = APP_CONSTANTS.PRICING.DEFAULT_SERVICE_FEE_RATE): number => {
  return Math.round(subtotal * rate * 100) / 100
}

/**
 * Check if date is past
 */
export const isPastDate = (date: Date | string): boolean => {
  return new Date(date) < new Date()
}

/**
 * Check if booking can be cancelled
 */
export const canCancelBooking = (checkIn: Date | string): boolean => {
  const hoursUntilCheckIn = (new Date(checkIn).getTime() - new Date().getTime()) / (1000 * 60 * 60)
  return hoursUntilCheckIn >= APP_CONSTANTS.BOOKING.CANCELLATION_HOURS
}

/**
 * Paginate array
 */
export const paginateArray = <T>(array: T[], page: number, limit: number): {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
} => {
  const total = array.length
  const pages = Math.ceil(total / limit)
  const start = (page - 1) * limit
  const end = start + limit

  return {
    data: array.slice(start, end),
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  }
}

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Sleep function for delays
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: any
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i)
        await sleep(delay)
      }
    }
  }
  
  throw lastError
}