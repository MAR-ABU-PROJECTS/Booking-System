// MAR ABU PROJECTS SERVICES LLC - Error Handling Middleware
import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import winston from 'winston'

// Create logger
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
})

// Custom error class
export class AppError extends Error {
  statusCode: number
  isOperational: boolean
  code?: string

  constructor(message: string, statusCode: number, code?: string) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    this.code = code

    Error.captureStackTrace(this, this.constructor)
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error | AppError | ZodError | Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500
  let message = 'Internal server error'
  let errors: any = null

  // Log error
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  })

  // Handle different error types
  if (err instanceof AppError) {
    statusCode = err.statusCode
    message = err.message
  } else if (err instanceof ZodError) {
    statusCode = 400
    message = 'Validation error'
    errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }))
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400
    
    switch (err.code) {
      case 'P2002':
        message = 'A record with this value already exists'
        errors = {
          field: err.meta?.target,
          message: 'This value is already taken',
        }
        break
      case 'P2025':
        statusCode = 404
        message = 'Record not found'
        break
      case 'P2003':
        message = 'Invalid reference. Related record not found'
        break
      default:
        message = 'Database operation failed'
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400
    message = 'Invalid data provided'
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err,
    }),
  })
}

// Not found handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND')
  next(error)
}

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}