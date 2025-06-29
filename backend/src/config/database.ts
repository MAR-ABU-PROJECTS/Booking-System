// MAR ABU PROJECTS SERVICES LLC - Database Configuration
import { PrismaClient } from '@prisma/client'
import { logger } from '../middlewares/logger.middleware'

// Extend PrismaClient with middleware
const prismaClientSingleton = () => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['error'],
    errorFormat: 'pretty',
  })

  // Middleware for query logging in development
  if (process.env.NODE_ENV === 'development') {
    prisma.$use(async (params, next) => {
      const before = Date.now()
      const result = await next(params)
      const after = Date.now()

      logger.debug({
        model: params.model,
        action: params.action,
        duration: `${after - before}ms`,
      })

      return result
    })
  }

  // Middleware for soft deletes (if needed in future)
  prisma.$use(async (params, next) => {
    // Handle soft deletes for specific models
    if (params.model === 'User' || params.model === 'Property') {
      if (params.action === 'delete') {
        params.action = 'update'
        params.args['data'] = { deletedAt: new Date() }
      }
      if (params.action === 'deleteMany') {
        params.action = 'updateMany'
        if (params.args.data !== undefined) {
          params.args.data['deletedAt'] = new Date()
        } else {
          params.args['data'] = { deletedAt: new Date() }
        }
      }
    }

    return next(params)
  })

  return prisma
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

// Database health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    logger.info('Database connection successful')
    return true
  } catch (error) {
    logger.error('Database connection failed:', error)
    return false
  }
}

// Transaction helper
export async function withTransaction<T>(
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return fn(tx as PrismaClient)
  })
}

// Pagination helper
export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export async function paginate<T>(
  model: any,
  params: PaginationParams,
  where?: any,
  include?: any,
  orderBy?: any
): Promise<PaginatedResult<T>> {
  const { page, limit } = params
  const skip = (page - 1) * limit

  const [data, total] = await Promise.all([
    model.findMany({
      where,
      include,
      orderBy,
      skip,
      take: limit,
    }),
    model.count({ where }),
  ])

  const pages = Math.ceil(total / limit)

  return {
    data,
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

// Common database queries
export const dbQueries = {
  // Check if email exists
  async emailExists(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    return !!user
  },

  // Get system settings
  async getSystemSettings(): Promise<Record<string, any>> {
    const settings = await prisma.systemSetting.findMany()
    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, any>)
  },

  // Get active properties count
  async getActivePropertiesCount(): Promise<number> {
    return prisma.property.count({
      where: { status: 'ACTIVE' },
    })
  },

  // Get booking statistics
  async getBookingStats(startDate?: Date, endDate?: Date) {
    const where: any = {}
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const [total, pending, approved, completed, cancelled] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.count({ where: { ...where, status: 'PENDING' } }),
      prisma.booking.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.booking.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.booking.count({ where: { ...where, status: 'CANCELLED' } }),
    ])

    const revenue = await prisma.booking.aggregate({
      where: {
        ...where,
        status: { in: ['APPROVED', 'COMPLETED'] },
        paymentStatus: 'PAID',
      },
      _sum: {
        total: true,
      },
    })

    return {
      total,
      pending,
      approved,
      completed,
      cancelled,
      revenue: revenue._sum.total || 0,
    }
  },
}

export default prisma