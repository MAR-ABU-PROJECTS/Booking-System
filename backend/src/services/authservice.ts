// MAR ABU PROJECTS SERVICES LLC - Authentication Service
import { PrismaClient, UserRole, UserStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const prisma = new PrismaClient()

// ===============================
// VALIDATION SCHEMAS
// ===============================
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

// ===============================
// TYPES
// ===============================
export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  status: UserStatus
  emailVerified: Date | null
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

// ===============================
// AUTH SERVICE CLASS
// ===============================
export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'mar-abu-secret-key'
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'mar-abu-refresh-secret'
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'
  private readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

  /**
   * Register a new user
   */
  async register(userData: z.infer<typeof registerSchema>): Promise<AuthTokens> {
    try {
      // Validate input
      const validatedData = registerSchema.parse(userData)

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email.toLowerCase() }
      })

      if (existingUser) {
        throw new Error('User with this email already exists')
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 12)

      // Create user
      const user = await prisma.user.create({
        data: {
          email: validatedData.email.toLowerCase(),
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          password: hashedPassword,
          phone: validatedData.phone,
          role: validatedData.role || UserRole.CUSTOMER,
          status: UserStatus.PENDING_VERIFICATION,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          emailVerified: true,
        }
      })

      // Log audit
      await this.logAudit(user.id, 'CREATE', 'User', user.id, { action: 'User registration' })

      // Generate tokens
      const tokens = await this.generateTokens(user)

      return tokens
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
  }

  /**
   * Login user
   */
  async login(credentials: z.infer<typeof loginSchema>, ipAddress?: string, userAgent?: string): Promise<AuthTokens> {
    try {
      // Validate input
      const validatedCredentials = loginSchema.parse(credentials)

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: validatedCredentials.email.toLowerCase() },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          password: true,
          role: true,
          status: true,
          emailVerified: true,
        }
      })

      if (!user) {
        throw new Error('Invalid email or password')
      }

      // Check if user is active
      if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.INACTIVE) {
        throw new Error('Account is suspended or inactive. Please contact support.')
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(validatedCredentials.password, user.password)
      if (!isPasswordValid) {
        throw new Error('Invalid email or password')
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })

      // Log audit
      await this.logAudit(user.id, 'LOGIN', 'User', user.id, { 
        ipAddress, 
        userAgent,
        loginTime: new Date() 
      })

      // Generate tokens
      const { password, ...userWithoutPassword } = user
      const tokens = await this.generateTokens(userWithoutPassword)

      return tokens
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(user: AuthUser): Promise<AuthTokens> {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    })

    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN,
    })

    return {
      accessToken,
      refreshToken,
      user,
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JWTPayload
    } catch (error) {
      throw new Error('Invalid or expired token')
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as JWTPayload

      // Get updated user data
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          emailVerified: true,
        }
      })

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new Error('User not found or inactive')
      }

      return await this.generateTokens(user)
    } catch (error) {
      throw new Error('Invalid refresh token')
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string, 
    passwordData: z.infer<typeof changePasswordSchema>
  ): Promise<void> {
    try {
      // Validate input
      const validatedData = changePasswordSchema.parse(passwordData)

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password: true }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        validatedData.currentPassword, 
        user.password
      )

      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect')
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(validatedData.newPassword, 12)

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
      })

      // Log audit
      await this.logAudit(userId, 'UPDATE', 'User', userId, { action: 'Password changed' })

    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { 
        emailVerified: new Date(),
        status: UserStatus.ACTIVE 
      }
    })

    await this.logAudit(userId, 'UPDATE', 'User', userId, { action: 'Email verified' })
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        emailVerified: true,
      }
    })

    return user
  }

  /**
   * Check if user has permission
   */
  hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.CUSTOMER]: 0,
      [UserRole.PROPERTY_HOST]: 1,
      [UserRole.ADMIN]: 2,
      [UserRole.SUPER_ADMIN]: 3,
    }

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  }

  /**
   * Logout user (invalidate tokens would go here in a real implementation)
   */
  async logout(userId: string): Promise<void> {
    // In a real implementation, you might want to blacklist the token
    // or store it in a cache/database to prevent reuse
    
    await this.logAudit(userId, 'LOGOUT', 'User', userId, { 
      logoutTime: new Date() 
    })
  }

  /**
   * Log audit trail
   */
  private async logAudit(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT',
    entity: string,
    entityId: string,
    changes?: any
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          changes: changes || {},
        }
      })
    } catch (error) {
      // Log error but don't throw to avoid disrupting main flow
      console.error('Failed to log audit:', error)
    }
  }
}

// ===============================
// MIDDLEWARE FUNCTIONS
// ===============================
export const authService = new AuthService()

/**
 * Authentication middleware
 */
export function requireAuth(requiredRole?: UserRole) {
  return async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false, 
          message: 'Access token required' 
        })
      }

      const token = authHeader.substring(7)
      const payload = authService.verifyToken(token)

      // Get user data
      const user = await authService.getUserById(payload.userId)
      
      if (!user || user.status !== UserStatus.ACTIVE) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found or inactive' 
        })
      }

      // Check role permission if required
      if (requiredRole && !authService.hasPermission(user.role, requiredRole)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions' 
        })
      }

      req.user = user
      next()
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      })
    }
  }
}

/**
 * Optional authentication middleware
 */
export function optionalAuth() {
  return async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const payload = authService.verifyToken(token)
        const user = await authService.getUserById(payload.userId)
        
        if (user && user.status === UserStatus.ACTIVE) {
          req.user = user
        }
      }
      
      next()
    } catch (error) {
      // Continue without authentication
      next()
    }
  }
}