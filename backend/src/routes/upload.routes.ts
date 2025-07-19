// MAR ABU PROJECTS SERVICES LLC - File Upload and Media Management Routes
import { Router } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { UserRole } from '@prisma/client'
import { requireAuth } from '../services/authservice'
import { asyncHandler } from '../middlewares/error.middleware'
import { AppError } from '../middlewares/error.middleware'
import { prisma } from '../server'
import { auditLog } from '../middlewares/logger.middleware'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import fs from 'fs/promises'
import { APP_CONSTANTS } from '../utils/constants'

const router = Router()

// Configure multer for different file types
const createStorage = (destination: string) => multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, destination)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  },
})

// Image upload configuration
const imageUpload = multer({
  storage: createStorage('uploads/images'),
  limits: {
    fileSize: APP_CONSTANTS.UPLOAD.MAX_IMAGE_SIZE,
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

// Document upload configuration
const documentUpload = multer({
  storage: createStorage('uploads/documents'),
  limits: {
    fileSize: APP_CONSTANTS.UPLOAD.MAX_DOCUMENT_SIZE,
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    if (APP_CONSTANTS.UPLOAD.ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX files are allowed.'))
    }
  },
})

// General file upload configuration
const fileUpload = multer({
  storage: createStorage('uploads/files'),
  limits: {
    fileSize: APP_CONSTANTS.UPLOAD.MAX_FILE_SIZE,
    files: 5,
  },
})

// Validation middleware
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    })
  }
  next()
}

// Helper function to resize and optimize images
const processImage = async (inputPath: string, outputPath: string, options: any = {}) => {
  const {
    width = 1200,
    height = 800,
    quality = 80,
    format = 'jpeg',
  } = options

  await sharp(inputPath)
    .resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality })
    .toFile(outputPath)
}

// ===============================
// IMAGE UPLOAD ROUTES
// ===============================

/**
 * @route   POST /api/v1/uploads/images
 * @desc    Upload multiple images
 * @access  Protected
 */
router.post(
  '/images',
  requireAuth(),
  imageUpload.array('images', 10),
  asyncHandler(async (req: any, res: any) => {
    if (!req.files || req.files.length === 0) {
      throw new AppError('No images uploaded', 400)
    }

    const uploadedImages = []

    try {
      for (const file of req.files) {
        // Create optimized versions
        const originalPath = file.path
        const optimizedPath = path.join(path.dirname(originalPath), `opt_${file.filename}`)
        const thumbnailPath = path.join(path.dirname(originalPath), `thumb_${file.filename}`)

        // Process images
        await Promise.all([
          processImage(originalPath, optimizedPath, { width: 1200, height: 800, quality: 80 }),
          processImage(originalPath, thumbnailPath, { width: 300, height: 200, quality: 70 }),
        ])

        // Save to database
        const image = await prisma.media.create({
          data: {
            fileName: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            filePath: file.path,
            optimizedPath,
            thumbnailPath,
            uploadedBy: req.user.id,
            type: 'IMAGE',
            metadata: {
              width: 1200,
              height: 800,
              format: 'jpeg',
            },
          },
        })

        uploadedImages.push({
          id: image.id,
          fileName: file.filename,
          originalName: file.originalname,
          fileSize: file.size,
          url: `/uploads/images/${file.filename}`,
          optimizedUrl: `/uploads/images/opt_${file.filename}`,
          thumbnailUrl: `/uploads/images/thumb_${file.filename}`,
          uploadedAt: image.createdAt,
        })

        // Delete original file after processing
        await fs.unlink(originalPath)
      }

      auditLog('IMAGES_UPLOADED', req.user.id, {
        imageCount: uploadedImages.length,
        totalSize: req.files.reduce((sum: number, file: any) => sum + file.size, 0),
      }, req.ip)

      res.status(201).json({
        success: true,
        message: `${uploadedImages.length} images uploaded successfully`,
        data: uploadedImages,
      })
    } catch (error) {
      // Clean up uploaded files on error
      for (const file of req.files) {
        try {
          await fs.unlink(file.path)
        } catch (cleanupError) {
          console.error('Failed to cleanup file:', cleanupError)
        }
      }
      throw new AppError('Failed to process images', 500)
    }
  })
)

/**
 * @route   POST /api/v1/uploads/images/property/:propertyId
 * @desc    Upload images for a property
 * @access  Property Host, Admin
 */
router.post(
  '/images/property/:propertyId',
  requireAuth(UserRole.PROPERTY_HOST),
  imageUpload.array('images', 20),
  [
    param('propertyId').isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { propertyId } = req.params

    if (!req.files || req.files.length === 0) {
      throw new AppError('No images uploaded', 400)
    }

    // Check property ownership
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    })

    if (!property) {
      throw new AppError('Property not found', 404)
    }

    // Check authorization
    const isOwner = property.hostId === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to upload images for this property', 403)
    }

    const uploadedImages = []

    try {
      for (const file of req.files) {
        // Process image
        const originalPath = file.path
        const optimizedPath = path.join(path.dirname(originalPath), `opt_${file.filename}`)
        const thumbnailPath = path.join(path.dirname(originalPath), `thumb_${file.filename}`)

        await Promise.all([
          processImage(originalPath, optimizedPath, { width: 1200, height: 800, quality: 85 }),
          processImage(originalPath, thumbnailPath, { width: 300, height: 200, quality: 70 }),
        ])

        // Save to database
        const image = await prisma.media.create({
          data: {
            fileName: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            filePath: optimizedPath,
            thumbnailPath,
            uploadedBy: req.user.id,
            type: 'IMAGE',
            entityType: 'PROPERTY',
            entityId: propertyId,
            metadata: {
              width: 1200,
              height: 800,
              format: 'jpeg',
              propertyId,
            },
          },
        })

        uploadedImages.push({
          id: image.id,
          fileName: file.filename,
          originalName: file.originalname,
          fileSize: file.size,
          url: `/uploads/images/opt_${file.filename}`,
          thumbnailUrl: `/uploads/images/thumb_${file.filename}`,
          uploadedAt: image.createdAt,
        })

        // Delete original file
        await fs.unlink(originalPath)
      }

      // Update property images
      const currentImages = property.images || []
      const newImageUrls = uploadedImages.map(img => img.url)
      
      await prisma.property.update({
        where: { id: propertyId },
        data: {
          images: [...currentImages, ...newImageUrls],
        },
      })

      auditLog('PROPERTY_IMAGES_UPLOADED', req.user.id, {
        propertyId,
        imageCount: uploadedImages.length,
        totalSize: req.files.reduce((sum: number, file: any) => sum + file.size, 0),
      }, req.ip)

      res.status(201).json({
        success: true,
        message: `${uploadedImages.length} images uploaded for property`,
        data: uploadedImages,
      })
    } catch (error) {
      // Clean up files on error
      for (const file of req.files) {
        try {
          await fs.unlink(file.path)
        } catch (cleanupError) {
          console.error('Failed to cleanup file:', cleanupError)
        }
      }
      throw new AppError('Failed to upload property images', 500)
    }
  })
)

// ===============================
// DOCUMENT UPLOAD ROUTES
// ===============================

/**
 * @route   POST /api/v1/uploads/documents
 * @desc    Upload documents
 * @access  Protected
 */
router.post(
  '/documents',
  requireAuth(),
  documentUpload.array('documents', 5),
  [
    body('category').optional().isIn(['ID', 'RECEIPT', 'CONTRACT', 'OTHER']),
    body('description').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    if (!req.files || req.files.length === 0) {
      throw new AppError('No documents uploaded', 400)
    }

    const { category = 'OTHER', description } = req.body
    const uploadedDocuments = []

    try {
      for (const file of req.files) {
        const document = await prisma.media.create({
          data: {
            fileName: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            filePath: file.path,
            uploadedBy: req.user.id,
            type: 'DOCUMENT',
            metadata: {
              category,
              description,
            },
          },
        })

        uploadedDocuments.push({
          id: document.id,
          fileName: file.filename,
          originalName: file.originalname,
          fileSize: file.size,
          url: `/uploads/documents/${file.filename}`,
          category,
          uploadedAt: document.createdAt,
        })
      }

      auditLog('DOCUMENTS_UPLOADED', req.user.id, {
        documentCount: uploadedDocuments.length,
        category,
        totalSize: req.files.reduce((sum: number, file: any) => sum + file.size, 0),
      }, req.ip)

      res.status(201).json({
        success: true,
        message: `${uploadedDocuments.length} documents uploaded successfully`,
        data: uploadedDocuments,
      })
    } catch (error) {
      // Clean up files on error
      for (const file of req.files) {
        try {
          await fs.unlink(file.path)
        } catch (cleanupError) {
          console.error('Failed to cleanup file:', cleanupError)
        }
      }
      throw new AppError('Failed to upload documents', 500)
    }
  })
)

// ===============================
// MEDIA MANAGEMENT ROUTES
// ===============================

/**
 * @route   GET /api/v1/uploads/media
 * @desc    Get user's uploaded media
 * @access  Protected
 */
router.get(
  '/media',
  requireAuth(),
  [
    query('type').optional().isIn(['IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO']),
    query('entityType').optional().isIn(['PROPERTY', 'USER', 'BOOKING']),
    query('entityId').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const {
      type,
      entityType,
      entityId,
      page = 1,
      limit = 20,
    } = req.query

    // Build where clause
    const where: any = {}

    // Regular users can only see their own media
    if (req.user.role === UserRole.CUSTOMER) {
      where.uploadedBy = req.user.id
    } else if (req.user.role === UserRole.PROPERTY_HOST) {
      where.OR = [
        { uploadedBy: req.user.id },
        { entityType: 'PROPERTY', entity: { hostId: req.user.id } },
      ]
    }

    if (type) where.type = type
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          uploader: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.media.count({ where }),
    ])

    const mediaWithUrls = media.map(item => ({
      ...item,
      url: `/uploads/${item.type.toLowerCase()}s/${item.fileName}`,
      thumbnailUrl: item.thumbnailPath ? `/uploads/${item.type.toLowerCase()}s/thumb_${item.fileName}` : null,
      optimizedUrl: item.optimizedPath ? `/uploads/${item.type.toLowerCase()}s/opt_${item.fileName}` : null,
    }))

    res.json({
      success: true,
      data: {
        media: mediaWithUrls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    })
  })
)

/**
 * @route   DELETE /api/v1/uploads/media/:id
 * @desc    Delete media file
 * @access  Protected (owner, admin)
 */
router.delete(
  '/media/:id',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const media = await prisma.media.findUnique({
      where: { id: req.params.id },
    })

    if (!media) {
      throw new AppError('Media file not found', 404)
    }

    // Check authorization
    const isOwner = media.uploadedBy === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to delete this file', 403)
    }

    try {
      // Delete files from filesystem
      const filesToDelete = [
        media.filePath,
        media.optimizedPath,
        media.thumbnailPath,
      ].filter(Boolean)

      await Promise.all(
        filesToDelete.map(async (filePath) => {
          try {
            await fs.unlink(filePath!)
          } catch (error) {
            console.error(`Failed to delete file ${filePath}:`, error)
          }
        })
      )

      // Delete from database
      await prisma.media.delete({
        where: { id: req.params.id },
      })

      auditLog('MEDIA_DELETED', req.user.id, {
        mediaId: req.params.id,
        fileName: media.fileName,
        type: media.type,
      }, req.ip)

      res.json({
        success: true,
        message: 'Media file deleted successfully',
      })
    } catch (error) {
      throw new AppError('Failed to delete media file', 500)
    }
  })
)

/**
 * @route   PUT /api/v1/uploads/media/:id
 * @desc    Update media metadata
 * @access  Protected (owner, admin)
 */
router.put(
  '/media/:id',
  requireAuth(),
  [
    body('description').optional().isString(),
    body('alt').optional().isString(),
    body('caption').optional().isString(),
    body('isPrimary').optional().isBoolean(),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const media = await prisma.media.findUnique({
      where: { id: req.params.id },
    })

    if (!media) {
      throw new AppError('Media file not found', 404)
    }

    // Check authorization
    const isOwner = media.uploadedBy === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to update this file', 403)
    }

    const { description, alt, caption, isPrimary } = req.body

    const updatedMedia = await prisma.media.update({
      where: { id: req.params.id },
      data: {
        metadata: {
          ...media.metadata,
          description,
          alt,
          caption,
          isPrimary,
        },
      },
    })

    auditLog('MEDIA_UPDATED', req.user.id, {
      mediaId: req.params.id,
      changes: req.body,
    }, req.ip)

    res.json({
      success: true,
      message: 'Media metadata updated successfully',
      data: updatedMedia,
    })
  })
)

/**
 * @route   POST /api/v1/uploads/media/:id/reorder
 * @desc    Reorder media files for an entity
 * @access  Protected (owner, admin)
 */
router.post(
  '/media/reorder',
  requireAuth(),
  [
    body('mediaIds').isArray().withMessage('Media IDs array required'),
    body('entityType').isIn(['PROPERTY', 'USER', 'BOOKING']).withMessage('Valid entity type required'),
    body('entityId').isString().withMessage('Entity ID required'),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { mediaIds, entityType, entityId } = req.body

    // Check authorization based on entity type
    if (entityType === 'PROPERTY') {
      const property = await prisma.property.findUnique({
        where: { id: entityId },
      })

      if (!property) {
        throw new AppError('Property not found', 404)
      }

      const isOwner = property.hostId === req.user.id
      const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN

      if (!isOwner && !isAdmin) {
        throw new AppError('Not authorized to reorder media for this property', 403)
      }
    }

    // Update order for each media item
    await Promise.all(
      mediaIds.map((mediaId: string, index: number) =>
        prisma.media.update({
          where: { id: mediaId },
          data: {
            metadata: {
              order: index,
            },
          },
        })
      )
    )

    auditLog('MEDIA_REORDERED', req.user.id, {
      entityType,
      entityId,
      mediaCount: mediaIds.length,
    }, req.ip)

    res.json({
      success: true,
      message: 'Media files reordered successfully',
    })
  })
)

/**
 * @route   GET /api/v1/uploads/stats
 * @desc    Get upload statistics
 * @access  Protected
 */
router.get(
  '/stats',
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    const where: any = {}

    // Regular users can only see their own stats
    if (req.user.role === UserRole.CUSTOMER) {
      where.uploadedBy = req.user.id
    } else if (req.user.role === UserRole.PROPERTY_HOST) {
      where.uploadedBy = req.user.id
    }

    const [
      totalFiles,
      totalSize,
      filesByType,
      recentUploads,
    ] = await Promise.all([
      prisma.media.count({ where }),
      prisma.media.aggregate({
        where,
        _sum: { fileSize: true },
      }),
      prisma.media.groupBy({
        by: ['type'],
        where,
        _count: { type: true },
        _sum: { fileSize: true },
      }),
      prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          fileName: true,
          originalName: true,
          type: true,
          fileSize: true,
          createdAt: true,
        },
      }),
    ])

    res.json({
      success: true,
      data: {
        summary: {
          totalFiles,
          totalSize: totalSize._sum.fileSize || 0,
          storageUsed: ((totalSize._sum.fileSize || 0) / APP_CONSTANTS.UPLOAD.MAX_TOTAL_SIZE * 100).toFixed(1) + '%',
        },
        byType: filesByType,
        recentUploads,
      },
    })
  })
)

export default router