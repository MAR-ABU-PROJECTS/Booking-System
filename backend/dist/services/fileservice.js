"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = exports.fileService = exports.FileService = void 0;
// MAR ABU PROJECTS SERVICES LLC - File Upload Service
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const crypto = __importStar(require("crypto"));
const sharp = require("sharp");
const constants_1 = require("../utils/constants");
const logger_middleware_1 = require("../middlewares/logger.middleware");
const error_middleware_1 = require("../middlewares/error.middleware");
class FileService {
    constructor() {
        this.uploadsDir = process.env.UPLOAD_DIR || "uploads";
        this.initializeDirectories();
    }
    /**
     * Initialize upload directories
     */
    async initializeDirectories() {
        const directories = [
            this.uploadsDir,
            path.join(this.uploadsDir, "properties"),
            path.join(this.uploadsDir, "receipts"),
            path.join(this.uploadsDir, "avatars"),
            path.join(this.uploadsDir, "id-documents"),
            path.join(this.uploadsDir, "temp"),
        ];
        for (const dir of directories) {
            try {
                await fs.access(dir);
            }
            catch {
                await fs.mkdir(dir, { recursive: true });
                logger_middleware_1.logger.info(`Created directory: ${dir}`);
            }
        }
    }
    /**
     * Generate unique filename
     */
    generateUniqueFilename(originalName) {
        const ext = path.extname(originalName);
        const hash = crypto.randomBytes(16).toString("hex");
        const timestamp = Date.now();
        return `${timestamp}-${hash}${ext}`;
    }
    /**
     * Create multer storage configuration
     */
    createStorage(config) {
        return multer.diskStorage({
            destination: async (req, file, cb) => {
                const dir = path.join(this.uploadsDir, config.destination);
                try {
                    await fs.access(dir);
                }
                catch {
                    await fs.mkdir(dir, { recursive: true });
                }
                cb(null, dir);
            },
            filename: (req, file, cb) => {
                const filename = config.generateUniqueName
                    ? this.generateUniqueFilename(file.originalname)
                    : file.originalname;
                cb(null, filename);
            },
        });
    }
    /**
     * Create multer file filter
     */
    createFileFilter(allowedTypes) {
        return (req, file, cb) => {
            if (allowedTypes.includes(file.mimetype)) {
                cb(null, true);
            }
            else {
                cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(", ")}`));
            }
        };
    }
    /**
     * Create multer upload instance
     */
    createUploader(config) {
        return multer({
            storage: this.createStorage(config),
            limits: {
                fileSize: config.maxSize,
            },
            fileFilter: this.createFileFilter(config.allowedTypes),
        });
    }
    /**
     * Property image uploader
     */
    propertyImageUploader() {
        return this.createUploader({
            destination: "properties",
            maxSize: constants_1.APP_CONSTANTS.UPLOAD.MAX_IMAGE_SIZE,
            allowedTypes: constants_1.APP_CONSTANTS.UPLOAD.ALLOWED_IMAGE_TYPES,
            generateUniqueName: true,
            resizeImages: true,
        });
    }
    /**
     * Receipt document uploader
     */
    receiptUploader() {
        return this.createUploader({
            destination: "receipts",
            maxSize: constants_1.APP_CONSTANTS.UPLOAD.MAX_DOCUMENT_SIZE,
            allowedTypes: constants_1.APP_CONSTANTS.UPLOAD.ALLOWED_DOCUMENT_TYPES,
            generateUniqueName: true,
        });
    }
    /**
     * Avatar uploader
     */
    avatarUploader() {
        return this.createUploader({
            destination: "avatars",
            maxSize: 2 * 1024 * 1024, // 2MB
            allowedTypes: ["image/jpeg", "image/jpg", "image/png"],
            generateUniqueName: true,
            resizeImages: true,
        });
    }
    /**
     * ID Document uploader (for KYC verification)
     */
    idDocumentUploader() {
        return this.createUploader({
            destination: "id-documents",
            maxSize: 5 * 1024 * 1024, // 5MB
            allowedTypes: ["image/jpeg", "image/jpg", "image/png", "application/pdf"],
            generateUniqueName: true,
            resizeImages: false, // Don't resize ID documents to preserve quality
        });
    }
    /**
     * Process uploaded image
     */
    async processImage(filePath, options = {}) {
        const { maxWidth = 1920, maxHeight = 1080, quality = 85, format = "jpeg", } = options;
        try {
            const processedPath = filePath.replace(path.extname(filePath), `.processed.${format}`);
            await sharp(filePath)
                .resize(maxWidth, maxHeight, {
                fit: "inside",
                withoutEnlargement: true,
            })
                .jpeg({ quality })
                .toFile(processedPath);
            // Delete original and rename processed
            await fs.unlink(filePath);
            await fs.rename(processedPath, filePath);
            logger_middleware_1.logger.info(`Image processed: ${filePath}`);
            return filePath;
        }
        catch (error) {
            logger_middleware_1.logger.error("Image processing failed:", error);
            return filePath; // Return original if processing fails
        }
    }
    /**
     * Create image thumbnails
     */
    async createThumbnails(filePath, sizes) {
        const thumbnails = [];
        for (const size of sizes) {
            try {
                const ext = path.extname(filePath);
                const thumbnailPath = filePath.replace(ext, `${size.suffix}${ext}`);
                await sharp(filePath)
                    .resize(size.width, size.height, {
                    fit: "cover",
                    position: "center",
                })
                    .toFile(thumbnailPath);
                thumbnails.push(thumbnailPath);
            }
            catch (error) {
                logger_middleware_1.logger.error(`Failed to create thumbnail ${size.suffix}:`, error);
            }
        }
        return thumbnails;
    }
    /**
     * Delete file
     */
    async deleteFile(filePath) {
        try {
            const fullPath = path.isAbsolute(filePath)
                ? filePath
                : path.join(process.cwd(), filePath);
            await fs.unlink(fullPath);
            logger_middleware_1.logger.info(`File deleted: ${filePath}`);
            return true;
        }
        catch (error) {
            logger_middleware_1.logger.error(`Failed to delete file ${filePath}:`, error);
            return false;
        }
    }
    /**
     * Delete multiple files
     */
    async deleteFiles(filePaths) {
        await Promise.all(filePaths.map((path) => this.deleteFile(path)));
    }
    /**
     * Move file
     */
    async moveFile(source, destination) {
        try {
            const destDir = path.dirname(destination);
            await fs.mkdir(destDir, { recursive: true });
            await fs.rename(source, destination);
            logger_middleware_1.logger.info(`File moved from ${source} to ${destination}`);
            return destination;
        }
        catch (error) {
            logger_middleware_1.logger.error(`Failed to move file:`, error);
            throw new error_middleware_1.AppError("Failed to move file", 500);
        }
    }
    /**
     * Get file stats
     */
    async getFileStats(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const mimeType = this.getMimeType(filePath);
            return {
                size: stats.size,
                mimeType,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
            };
        }
        catch (error) {
            logger_middleware_1.logger.error(`Failed to get file stats:`, error);
            return null;
        }
    }
    /**
     * Get MIME type from file extension
     */
    getMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".pdf": "application/pdf",
            ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };
        return mimeTypes[ext] || "application/octet-stream";
    }
    /**
     * Clean up temporary files
     */
    async cleanupTempFiles(olderThanHours = 24) {
        try {
            const tempDir = path.join(this.uploadsDir, "temp");
            const files = await fs.readdir(tempDir);
            const now = Date.now();
            const maxAge = olderThanHours * 60 * 60 * 1000;
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = await fs.stat(filePath);
                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.unlink(filePath);
                    logger_middleware_1.logger.info(`Cleaned up temp file: ${file}`);
                }
            }
        }
        catch (error) {
            logger_middleware_1.logger.error("Failed to cleanup temp files:", error);
        }
    }
    /**
     * Get upload directory size
     */
    async getDirectorySize(dirPath) {
        let size = 0;
        try {
            const files = await fs.readdir(dirPath, { withFileTypes: true });
            for (const file of files) {
                const filePath = path.join(dirPath, file.name);
                if (file.isDirectory()) {
                    size += await this.getDirectorySize(filePath);
                }
                else {
                    const stats = await fs.stat(filePath);
                    size += stats.size;
                }
            }
        }
        catch (error) {
            logger_middleware_1.logger.error(`Failed to calculate directory size:`, error);
        }
        return size;
    }
    /**
     * Generate secure download URL
     */
    generateSecureUrl(filePath, expiresIn = 3600) {
        // In a production environment, you would:
        // 1. Use a CDN with signed URLs (CloudFront, Cloudflare)
        // 2. Or implement JWT-based temporary access tokens
        // 3. Or use cloud storage signed URLs (S3, GCS)
        // For now, return a simple URL
        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        return `${baseUrl}/${filePath}`;
    }
}
exports.FileService = FileService;
// Export singleton instance
exports.fileService = new FileService();
// Export multer middleware for direct use
exports.uploadMiddleware = {
    propertyImages: exports.fileService
        .propertyImageUploader()
        .array("images", constants_1.APP_CONSTANTS.UPLOAD.MAX_PROPERTY_IMAGES),
    receipt: exports.fileService.receiptUploader().single("receipt"),
    avatar: exports.fileService.avatarUploader().single("avatar"),
};
