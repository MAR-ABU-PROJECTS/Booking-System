"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTitleCase = exports.deepClone = exports.validateBookingDates = exports.stringToColor = exports.maskPhone = exports.maskEmail = exports.generateInitials = exports.formatFileSize = exports.isBusinessHours = exports.isFutureDate = exports.daysBetween = exports.validatePagination = exports.calculatePagination = exports.generateSlug = exports.sanitizeFilename = exports.isValidPassword = exports.isValidPhone = exports.isValidEmail = exports.generateSecureCode = exports.generateSecureToken = exports.calculatePricing = exports.generateBookingNumber = exports.formatDateTime = exports.formatDate = exports.formatCurrency = void 0;
// MAR ABU PROJECTS SERVICES LLC - Helper Functions
const crypto_1 = __importDefault(require("crypto"));
const constants_1 = require("./constants");
/**
 * Format currency to Nigerian Naira
 */
const formatCurrency = (amount) => {
    return new Intl.NumberFormat(constants_1.APP_CONSTANTS.PRICING.LOCALE, {
        style: 'currency',
        currency: constants_1.APP_CONSTANTS.PRICING.CURRENCY,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};
exports.formatCurrency = formatCurrency;
/**
 * Format date for display
 */
const formatDate = (date, options) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const defaultOptions = Object.assign({ year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Africa/Lagos' }, options);
    return new Intl.DateTimeFormat('en-NG', defaultOptions).format(dateObj);
};
exports.formatDate = formatDate;
/**
 * Format date and time for display
 */
const formatDateTime = (date) => {
    return (0, exports.formatDate)(date, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};
exports.formatDateTime = formatDateTime;
/**
 * Generate unique booking number
 */
const generateBookingNumber = () => __awaiter(void 0, void 0, void 0, function* () {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto_1.default.randomBytes(3).toString('hex').toUpperCase();
    return `MAR-${timestamp}-${random}`;
});
exports.generateBookingNumber = generateBookingNumber;
/**
 * Calculate booking pricing
 */
const calculatePricing = (checkIn, checkOut, baseRate, cleaningFee = 0, serviceFeeRate = constants_1.APP_CONSTANTS.PRICING.SERVICE_FEE_RATE) => {
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0) {
        throw new Error('Check-out date must be after check-in date');
    }
    const subtotal = nights * baseRate;
    let serviceFee = Math.round(subtotal * serviceFeeRate);
    // Cap service fee at maximum
    if (serviceFee > constants_1.APP_CONSTANTS.PRICING.MAX_SERVICE_FEE) {
        serviceFee = constants_1.APP_CONSTANTS.PRICING.MAX_SERVICE_FEE;
    }
    const total = subtotal + cleaningFee + serviceFee;
    return {
        nights,
        baseRate,
        subtotal,
        serviceFee,
        cleaningFee,
        total,
    };
};
exports.calculatePricing = calculatePricing;
/**
 * Generate secure random string
 */
const generateSecureToken = (length = 32) => {
    return crypto_1.default.randomBytes(length).toString('hex');
};
exports.generateSecureToken = generateSecureToken;
/**
 * Generate secure random code (numeric)
 */
const generateSecureCode = (length = 6) => {
    const chars = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
exports.generateSecureCode = generateSecureCode;
/**
 * Validate email format
 */
const isValidEmail = (email) => {
    return constants_1.APP_CONSTANTS.VALIDATION.EMAIL.REGEX.test(email);
};
exports.isValidEmail = isValidEmail;
/**
 * Validate phone number format
 */
const isValidPhone = (phone) => {
    return constants_1.APP_CONSTANTS.VALIDATION.PHONE.REGEX.test(phone);
};
exports.isValidPhone = isValidPhone;
/**
 * Validate password strength
 */
const isValidPassword = (password) => {
    return password.length >= constants_1.APP_CONSTANTS.VALIDATION.PASSWORD.MIN_LENGTH &&
        constants_1.APP_CONSTANTS.VALIDATION.PASSWORD.REGEX.test(password);
};
exports.isValidPassword = isValidPassword;
/**
 * Sanitize filename for file uploads
 */
const sanitizeFilename = (filename) => {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '');
};
exports.sanitizeFilename = sanitizeFilename;
/**
 * Generate slug from string
 */
const generateSlug = (str) => {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};
exports.generateSlug = generateSlug;
/**
 * Calculate pagination info
 */
const calculatePagination = (page, limit, total) => {
    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;
    const offset = (page - 1) * limit;
    return {
        page,
        limit,
        total,
        pages,
        hasNext,
        hasPrev,
        offset,
    };
};
exports.calculatePagination = calculatePagination;
/**
 * Validate pagination parameters
 */
const validatePagination = (page, limit) => {
    let pageNum = parseInt(page || '1');
    let limitNum = parseInt(limit || constants_1.APP_CONSTANTS.PAGINATION.DEFAULT_LIMIT.toString());
    // Ensure valid page number
    if (isNaN(pageNum) || pageNum < 1) {
        pageNum = 1;
    }
    // Ensure valid limit
    if (isNaN(limitNum) || limitNum < constants_1.APP_CONSTANTS.PAGINATION.MIN_LIMIT) {
        limitNum = constants_1.APP_CONSTANTS.PAGINATION.DEFAULT_LIMIT;
    }
    if (limitNum > constants_1.APP_CONSTANTS.PAGINATION.MAX_LIMIT) {
        limitNum = constants_1.APP_CONSTANTS.PAGINATION.MAX_LIMIT;
    }
    return { page: pageNum, limit: limitNum };
};
exports.validatePagination = validatePagination;
/**
 * Calculate date difference in days
 */
const daysBetween = (startDate, endDate) => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
exports.daysBetween = daysBetween;
/**
 * Check if date is in the future
 */
const isFutureDate = (date) => {
    return date.getTime() > Date.now();
};
exports.isFutureDate = isFutureDate;
/**
 * Check if date is within business hours
 */
const isBusinessHours = (date) => {
    const hour = date.getHours();
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    // Monday to Friday, 9 AM to 6 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
};
exports.isBusinessHours = isBusinessHours;
/**
 * Format file size in human readable format
 */
const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
exports.formatFileSize = formatFileSize;
/**
 * Generate initials from name
 */
const generateInitials = (firstName, lastName) => {
    const first = firstName.charAt(0).toUpperCase();
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last;
};
exports.generateInitials = generateInitials;
/**
 * Mask sensitive data (email, phone)
 */
const maskEmail = (email) => {
    const [local, domain] = email.split('@');
    const maskedLocal = local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1);
    return `${maskedLocal}@${domain}`;
};
exports.maskEmail = maskEmail;
const maskPhone = (phone) => {
    if (phone.length < 4)
        return phone;
    return '*'.repeat(phone.length - 4) + phone.slice(-4);
};
exports.maskPhone = maskPhone;
/**
 * Generate color from string (for avatars)
 */
const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
};
exports.stringToColor = stringToColor;
/**
 * Validate booking dates
 */
const validateBookingDates = (checkIn, checkOut) => {
    const now = new Date();
    const minAdvance = new Date(now.getTime() + constants_1.APP_CONSTANTS.BOOKING.MIN_ADVANCE_HOURS * 60 * 60 * 1000);
    const maxAdvance = new Date(now.getTime() + constants_1.APP_CONSTANTS.BOOKING.MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000);
    const errors = [];
    if (checkIn < minAdvance) {
        errors.push(`Check-in must be at least ${constants_1.APP_CONSTANTS.BOOKING.MIN_ADVANCE_HOURS} hours in advance`);
    }
    if (checkIn > maxAdvance) {
        errors.push(`Check-in cannot be more than ${constants_1.APP_CONSTANTS.BOOKING.MAX_ADVANCE_DAYS} days in advance`);
    }
    if (checkOut <= checkIn) {
        errors.push('Check-out date must be after check-in date');
    }
    const nights = (0, exports.daysBetween)(checkIn, checkOut);
    if (nights < constants_1.APP_CONSTANTS.BOOKING.MIN_STAY_NIGHTS) {
        errors.push(`Minimum stay is ${constants_1.APP_CONSTANTS.BOOKING.MIN_STAY_NIGHTS} night(s)`);
    }
    if (nights > constants_1.APP_CONSTANTS.BOOKING.MAX_STAY_NIGHTS) {
        errors.push(`Maximum stay is ${constants_1.APP_CONSTANTS.BOOKING.MAX_STAY_NIGHTS} nights`);
    }
    return {
        isValid: errors.length === 0,
        errors,
        nights,
    };
};
exports.validateBookingDates = validateBookingDates;
/**
 * Deep clone object
 */
const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};
exports.deepClone = deepClone;
/**
 * Capitalize first letter of each word
 */
const toTitleCase = (str) => {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};
exports.toTitleCase = toTitleCase;
