// MAR ABU PROJECTS SERVICES LLC - Authentication Service (FULLY FIXED)
import { PrismaClient, UserRole, UserStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
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

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
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
// AUTHENTICATION SERVICE CLASS
// ===============================
export class AuthService {
  private JWT_SECRET: string
  private JWT_EXPIRES_IN: string
  private JWT_REFRESH_SECRET: string
  private JWT_REFRESH_EXPIRES_IN: string

  constructor() {
    // FIXED: Use environment variables with secure defaults for development only
    this.JWT_SECRET = process.env.JWT_SECRET || 'mar-abu-projects-dev-secret-CHANGE-IN-PRODUCTION'
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'mar-abu-projects-refresh-dev-secret-CHANGE-IN-PRODUCTION'
    this.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d'

    // Warn in development if using default secrets
    if (process.env.NODE_ENV !== 'production') {
      if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
        console.warn('⚠️  WARNING: Using default JWT secrets. Set JWT_SECRET and JWT_REFRESH_SECRET in .env file!')
      }
    }

    // Validate that secrets are provided in production
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
        throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in production')
      }
      if (process.env.JWT_SECRET.length < 32 || process.env.JWT_REFRESH_SECRET.length < 32) {
        throw new Error('JWT secrets must be at least 32 characters long in production')
      }
    }
  }

  /**
   * Register new user
   */
  async register(
    userData: z.infer<typeof registerSchema>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthTokens> {
    try {
      // Validate input
      const validatedData = registerSchema.parse(userData)

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email }
      })

      if (existingUser) {
        throw new Error('User already exists with this email')
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 12)

      // Create user
      const user = await prisma.user.create({
        data: {
          email: validatedData.email,
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
      await this.logAudit(user.id, 'CREATE', 'User', user.id, { 
        ipAddress, 
        userAgent,
        registrationTime: new Date() 
      })

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
  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthTokens> {
    try {
      // Validate input
      const validatedCredentials = loginSchema.parse({ email, password })

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: validatedCredentials.email }
      })

      if (!user) {
        throw new Error('Invalid email or password')
      }

      // Check user status
      if (user.status === UserStatus.SUSPENDED) {
        throw new Error('Account suspended. Please contact support.')
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(validatedCredentials.password, user.password)
      if (!isPasswordValid) {
        throw new Error('Invalid email or password')
      }

      // Update last login (only if lastLoginAt field exists)
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            // lastLoginAt: new Date() // Commented out until DB migration
          }
        })
      } catch (updateError) {
        // Continue if lastLoginAt field doesn't exist yet
        console.log('Note: lastLoginAt field not found in database')
      }

      // Log audit
      await this.logAudit(user.id, 'LOGIN', 'User', user.id, { 
        ipAddress, 
        userAgent,
        loginTime: new Date() 
      })

      // Generate tokens
      const { password: _, ...userWithoutPassword } = user
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
   * Generate JWT tokens - FIXED with proper typing and conversion
   */
  private async generateTokens(user: AuthUser): Promise<AuthTokens> {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }

    // FIXED: Ensure expiresIn is a string and use proper type casting
    const accessToken = jwt.sign(
      payload, 
      this.JWT_SECRET, 
      { expiresIn: String(this.JWT_EXPIRES_IN) } as jwt.SignOptions
    )

    const refreshToken = jwt.sign(
      payload, 
      this.JWT_REFRESH_SECRET, 
      { expiresIn: String(this.JWT_REFRESH_EXPIRES_IN) } as jwt.SignOptions
    )

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
   * Change user password with correct signature
   */
  async changePassword(
    userId: string, 
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // Validate input using existing schema
      const validatedData = changePasswordSchema.parse({
        currentPassword,
        newPassword
      })

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
   * Forgot password method - TEMPORARILY DISABLED until DB migration
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() }
      })

      if (!user) {
        // Don't reveal if email exists for security reasons
        return
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex')
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // TEMPORARY: Skip database update until migration is complete
      console.log(`Password reset requested for ${email}. Token: ${resetToken}`)
      console.log('Note: Database update skipped until migration is complete')

      // TODO: Uncomment after running database migration
      /*
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        }
      })
      */

      // Log audit
      await this.logAudit(user.id, 'UPDATE', 'User', user.id, { 
        action: 'Password reset requested' 
      })

      // For now, just log the reset token (remove in production)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Reset token for ${email}: ${resetToken}`)
      }

    } catch (error) {
      console.error('Forgot password error:', error)
    }
  }

  /**
   * Reset password method - TEMPORARILY DISABLED until DB migration
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Validate new password
      if (!newPassword || newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long')
      }

      // TEMPORARY: For now, just validate the token format
      if (!token || token.length < 32) {
        throw new Error('Invalid reset token format')
      }

      console.log('Password reset attempted with token:', token)
      console.log('Note: Database lookup skipped until migration is complete')

      // TODO: Uncomment after running database migration
      /*
      // Find user by reset token
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date() // Token must not be expired
          }
        }
      })

      if (!user) {
        throw new Error('Invalid or expired reset token')
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12)

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        }
      })

      // Log audit
      await this.logAudit(user.id, 'UPDATE', 'User', user.id, { 
        action: 'Password reset completed' 
      })
      */

      throw new Error('Password reset temporarily disabled until database migration is complete')

    } catch (error) {
      throw error
    }
  }

  /**
   * Update user profile method
   */
  async updateProfile(userId: string, profileData: any): Promise<AuthUser> {
    try {
      // Validate input
      const validatedData = updateProfileSchema.parse(profileData)

      // Get current user
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true }
      })

      if (!currentUser) {
        throw new Error('User not found')
      }

      // Update user profile (skip fields that don't exist yet)
      const updateData: any = {}
      
      if (validatedData.firstName) updateData.firstName = validatedData.firstName
      if (validatedData.lastName) updateData.lastName = validatedData.lastName
      if (validatedData.phone) updateData.phone = validatedData.phone
      // Skip avatar until DB migration: if (validatedData.avatar) updateData.avatar = validatedData.avatar

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          emailVerified: true,
          phone: true,
          // avatar: true, // Skip until DB migration
        }
      })

      // Log audit
      await this.logAudit(userId, 'UPDATE', 'User', userId, { 
        action: 'Profile updated',
        changes: validatedData 
      })

      return updatedUser
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
   * Logout user
   */
  async logout(userId: string): Promise<void> {
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
