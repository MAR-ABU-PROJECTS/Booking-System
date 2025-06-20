import { Router } from 'express'
import { requireAuth } from '../services/authservice'
import { asyncHandler } from '../middleware/error.middleware'
import { prisma } from '../server'

const router = Router()

// GET /api/v1/users/profile
router.get('/profile', requireAuth(), asyncHandler(async (req: any, res: any) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      emailVerified: true,
      phoneVerified: true,
      address: true,
      city: true,
      state: true,
      country: true,
      avatar: true,
      createdAt: true,
    }
  })

  res.json({
    success: true,
    data: user
  })
}))

// UPDATE /api/v1/users/profile
router.put('/profile', requireAuth(), asyncHandler(async (req: any, res: any) => {
  const { password, email, role, status, ...updateData } = req.body

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData
  })

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: updated
  })
}))

export default router