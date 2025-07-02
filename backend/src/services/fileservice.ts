// MAR ABU PROJECTS SERVICES LLC - File Upload Service
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import sharp from 'sharp'
import { APP_CONSTANTS } from '../utils/constants'
import { logger } from '../middlewares/logger.middleware'
import { AppError } from '../middlewares/error.middleware'

// File upload configuration
interface FileUploadConfig {
  destination: string
  maxSize: number
  allowedTypes: string[]
  generateUniqueName?: boolean
  resizeImages?: boolean
  imageMaxWidth?: number
  imageMaxHeight?: number
  imageQuality?: number
}

export class FileService {
  private uploadsDir: string

  constructor() {
    this.uploadsDir = process.env.UPLOAD_DIR || 'uploads'
    this.initializeDirectories()
  }

  /**
   * Initialize upload directories
   */
  private async initializeDirectories(): Promise<void> {
    const directories = [
      this.uploadsDir,
      path.join(this.uploadsDir, 'properties'),
      path.join(this.uploadsDir, 'receipts'),
      path.join(this.uploadsDir, 'avatars'),
      path.join(this.uploadsDir, 'temp'),
    ]

    for (const dir of directories) {
      try {
        await fs.access(dir)
      } catch {
        await fs.mkdir(dir, { recursive: true })
        logger.info(`Created directory: ${dir}`)
      }
    }
  }

  /**
   * Generate unique filename
   */
  private generateUniqueFilename(originalName: string): string {
    const ext = path.extname(originalName)
    const hash = crypto.randomBytes(16).toString('hex')
    const timestamp = Date.now()
    return `${timestamp}-${hash}${ext}`
  }

  /**
   * Create multer storage configuration
   */
  private createStorage(config: FileUploadConfig): multer.StorageEngine {
    return multer.diskStorage({
      destination: async (req, file, cb) => {
        const dir = path.join(this.uploadsDir, config.destination)
        try {
          await fs.access(dir)
        } catch {
          await fs.mkdir(dir, { recursive: true })
        }
        cb(null, dir)
      },
      filename: (req, file, cb) => {
        const filename = config.generateUniqueName
          ? this.generateUniqueFilename(file.originalname)
          : file.originalname

        cb(null, filename)
      },
    })
  }

  /**
   * Create multer file filter
   */
  private createFileFilter(allowedTypes: string[]): multer.Options['fileFilter'] {
    return (req, file, cb) => {
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true)
      } else {
        cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`))
      }
    }
  }

  /**
   * Create multer upload instance
   */
  createUploader(config: FileUploadConfig): multer.Multer {
    return multer({
      storage: this.createStorage(config),
      limits: {
        fileSize: config.maxSize,
      },
      fileFilter: this.createFileFilter(config.allowedTypes),
    })
  }

  /**
   * Property image uploader
   */
  propertyImageUploader(): multer.Multer {
    return this.createUploader({
      destination: 'properties',
      maxSize: APP_CONSTANTS.UPLOAD.MAX_IMAGE_SIZE,
      allowedTypes: APP_CONSTANTS.UPLOAD.ALLOWED_IMAGE_TYPES,
      generateUniqueName: true,
      resizeImages: true,
    })
  }

  /**
   * Receipt document uploader
   */
  receiptUploader(): multer.Multer {
    return this.createUploader({
      destination: 'receipts',
      maxSize: APP_CONSTANTS.UPLOAD.MAX_DOCUMENT_SIZE,
      allowedTypes: APP_CONSTANTS.UPLOAD.ALLOWED_DOCUMENT_TYPES,
      generateUniqueName: true,
    })
  }

  /**
   * Avatar uploader
   */
  avatarUploader(): multer.Multer {
    return this.createUploader({
      destination: 'avatars',
      maxSize: 2 * 1024 * 1024, // 2MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
      generateUniqueName: true,
      resizeImages: true,
    })
  }

  /**
   * Process uploaded image
   */
  async processImage(
    filePath: string,
    options: {
      maxWidth?: number
      maxHeight?: number
      quality?: number
      format?: 'jpeg' | 'png' | 'webp'
    } = {}
  ): Promise<string> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 85,
      format = 'jpeg',
    } = options

    try {
      const processedPath = filePath.replace(
        path.extname(filePath),
        `.processed.${format}`
      )

      await sharp(filePath)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality })
        .toFile(processedPath)

      // Delete original and rename processed
      await fs.unlink(filePath)
      await fs.rename(processedPath, filePath)

      logger.info(`Image processed: ${filePath}`)
      return filePath
    } catch (error) {
      logger.error('Image processing failed:', error)
      return filePath // Return original if processing fails
    }
  }

  /**
   * Create image thumbnails
   */
  async createThumbnails(
    filePath: string,
    sizes: Array<{ width: number; height: number; suffix: string }>
  ): Promise<string[]> {
    const thumbnails: string[] = []

    for (const size of sizes) {
      try {
        const ext = path.extname(filePath)
        const thumbnailPath = filePath.replace(ext, `${size.suffix}${ext}`)

        await sharp(filePath)
          .resize(size.width, size.height, {
            fit: 'cover',
            position: 'center',
          })
          .toFile(thumbnailPath)

        thumbnails.push(thumbnailPath)
      } catch (error) {
        logger.error(`Failed to create thumbnail ${size.suffix}:`, error)
      }
    }

    return thumbnails
  }

  /**
   * Delete file
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath)

      await fs.unlink(fullPath)
      logger.info(`File deleted: ${filePath}`)
      return true
    } catch (error) {
      logger.error(`Failed to delete file ${filePath}:`, error)
      return false
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(filePaths: string[]): Promise<void> {
    await Promise.all(filePaths.map(path => this.deleteFile(path)))
  }

  /**
   * Move file
   */
  async moveFile(source: string, destination: string): Promise<string> {
    try {
      const destDir = path.dirname(destination)
      await fs.mkdir(destDir, { recursive: true })
      await fs.rename(source, destination)
      logger.info(`File moved from ${source} to ${destination}`)
      return destination
    } catch (error) {
      logger.error(`Failed to move file:`, error)
      throw new AppError('Failed to move file', 500)
    }
  }

  /**
   * Get file stats
   */
  async getFileStats(filePath: string): Promise<{
    size: number
    mimeType: string
    createdAt: Date
    modifiedAt: Date
  } | null> {
    try {
      const stats = await fs.stat(filePath)
      const mimeType = this.getMimeType(filePath)

      return {
        size: stats.size,
        mimeType,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      }
    } catch (error) {
      logger.error(`Failed to get file stats:`, error)
      return null
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }

    return mimeTypes[ext] || 'application/octet-stream'
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(olderThanHours: number = 24): Promise<void> {
    try {
      const tempDir = path.join(this.uploadsDir, 'temp')
      const files = await fs.readdir(tempDir)
      const now = Date.now()
      const maxAge = olderThanHours * 60 * 60 * 1000

      for (const file of files) {
        const filePath = path.join(tempDir, file)
        const stats = await fs.stat(filePath)
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath)
          logger.info(`Cleaned up temp file: ${file}`)
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup temp files:', error)
    }
  }

  /**
   * Get upload directory size
   */
  async getDirectorySize(dirPath: string): Promise<number> {
    let size = 0

    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true })

      for (const file of files) {
        const filePath = path.join(dirPath, file.name)
        
        if (file.isDirectory()) {
          size += await this.getDirectorySize(filePath)
        } else {
          const stats = await fs.stat(filePath)
          size += stats.size
        }
      }
    } catch (error) {
      logger.error(`Failed to calculate directory size:`, error)
    }

    return size
  }

  /**
   * Generate secure download URL
   */
  generateSecureUrl(filePath: string, expiresIn: number = 3600): string {
    // In a production environment, you would:
    // 1. Use a CDN with signed URLs (CloudFront, Cloudflare)
    // 2. Or implement JWT-based temporary access tokens
    // 3. Or use cloud storage signed URLs (S3, GCS)
    
    // For now, return a simple URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000'
    return `${baseUrl}/${filePath}`
  }
}

// Export singleton instance
export const fileService = new FileService()

// Export multer middleware for direct use
export const uploadMiddleware = {
  propertyImages: fileService.propertyImageUploader().array('images', APP_CONSTANTS.UPLOAD.MAX_PROPERTY_IMAGES),
  receipt: fileService.receiptUploader().single('receipt'),
  avatar: fileService.avatarUploader().single('avatar'),
}
