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
exports.uploadMiddleware = exports.fileService = exports.FileService = void 0;
// MAR ABU PROJECTS SERVICES LLC - File Upload Service
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const crypto_1 = __importDefault(require("crypto"));
const sharp_1 = __importDefault(require("sharp"));
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
    initializeDirectories() {
        return __awaiter(this, void 0, void 0, function* () {
            const directories = [
                this.uploadsDir,
                path_1.default.join(this.uploadsDir, "properties"),
                path_1.default.join(this.uploadsDir, "receipts"),
                path_1.default.join(this.uploadsDir, "avatars"),
                path_1.default.join(this.uploadsDir, "temp"),
            ];
            for (const dir of directories) {
                try {
                    yield promises_1.default.access(dir);
                }
                catch (_a) {
                    yield promises_1.default.mkdir(dir, { recursive: true });
                    logger_middleware_1.logger.info(`Created directory: ${dir}`);
                }
            }
        });
    }
    /**
     * Generate unique filename
     */
    generateUniqueFilename(originalName) {
        const ext = path_1.default.extname(originalName);
        const hash = crypto_1.default.randomBytes(16).toString("hex");
        const timestamp = Date.now();
        return `${timestamp}-${hash}${ext}`;
    }
    /**
     * Create multer storage configuration
     */
    createStorage(config) {
        return multer_1.default.diskStorage({
            destination: (req, file, cb) => __awaiter(this, void 0, void 0, function* () {
                const dir = path_1.default.join(this.uploadsDir, config.destination);
                try {
                    yield promises_1.default.access(dir);
                }
                catch (_a) {
                    yield promises_1.default.mkdir(dir, { recursive: true });
                }
                cb(null, dir);
            }),
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
        return (0, multer_1.default)({
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
     * Process uploaded image
     */
    processImage(filePath_1) {
        return __awaiter(this, arguments, void 0, function* (filePath, options = {}) {
            const { maxWidth = 1920, maxHeight = 1080, quality = 85, format = "jpeg", } = options;
            try {
                const processedPath = filePath.replace(path_1.default.extname(filePath), `.processed.${format}`);
                yield (0, sharp_1.default)(filePath)
                    .resize(maxWidth, maxHeight, {
                    fit: "inside",
                    withoutEnlargement: true,
                })
                    .jpeg({ quality })
                    .toFile(processedPath);
                // Delete original and rename processed
                yield promises_1.default.unlink(filePath);
                yield promises_1.default.rename(processedPath, filePath);
                logger_middleware_1.logger.info(`Image processed: ${filePath}`);
                return filePath;
            }
            catch (error) {
                logger_middleware_1.logger.error("Image processing failed:", error);
                return filePath; // Return original if processing fails
            }
        });
    }
    /**
     * Create image thumbnails
     */
    createThumbnails(filePath, sizes) {
        return __awaiter(this, void 0, void 0, function* () {
            const thumbnails = [];
            for (const size of sizes) {
                try {
                    const ext = path_1.default.extname(filePath);
                    const thumbnailPath = filePath.replace(ext, `${size.suffix}${ext}`);
                    yield (0, sharp_1.default)(filePath)
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
        });
    }
    /**
     * Delete file
     */
    deleteFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fullPath = path_1.default.isAbsolute(filePath)
                    ? filePath
                    : path_1.default.join(process.cwd(), filePath);
                yield promises_1.default.unlink(fullPath);
                logger_middleware_1.logger.info(`File deleted: ${filePath}`);
                return true;
            }
            catch (error) {
                logger_middleware_1.logger.error(`Failed to delete file ${filePath}:`, error);
                return false;
            }
        });
    }
    /**
     * Delete multiple files
     */
    deleteFiles(filePaths) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(filePaths.map((path) => this.deleteFile(path)));
        });
    }
    /**
     * Move file
     */
    moveFile(source, destination) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const destDir = path_1.default.dirname(destination);
                yield promises_1.default.mkdir(destDir, { recursive: true });
                yield promises_1.default.rename(source, destination);
                logger_middleware_1.logger.info(`File moved from ${source} to ${destination}`);
                return destination;
            }
            catch (error) {
                logger_middleware_1.logger.error(`Failed to move file:`, error);
                throw new error_middleware_1.AppError("Failed to move file", 500);
            }
        });
    }
    /**
     * Get file stats
     */
    getFileStats(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield promises_1.default.stat(filePath);
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
        });
    }
    /**
     * Get MIME type from file extension
     */
    getMimeType(filePath) {
        const ext = path_1.default.extname(filePath).toLowerCase();
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
    cleanupTempFiles() {
        return __awaiter(this, arguments, void 0, function* (olderThanHours = 24) {
            try {
                const tempDir = path_1.default.join(this.uploadsDir, "temp");
                const files = yield promises_1.default.readdir(tempDir);
                const now = Date.now();
                const maxAge = olderThanHours * 60 * 60 * 1000;
                for (const file of files) {
                    const filePath = path_1.default.join(tempDir, file);
                    const stats = yield promises_1.default.stat(filePath);
                    if (now - stats.mtime.getTime() > maxAge) {
                        yield promises_1.default.unlink(filePath);
                        logger_middleware_1.logger.info(`Cleaned up temp file: ${file}`);
                    }
                }
            }
            catch (error) {
                logger_middleware_1.logger.error("Failed to cleanup temp files:", error);
            }
        });
    }
    /**
     * Get upload directory size
     */
    getDirectorySize(dirPath) {
        return __awaiter(this, void 0, void 0, function* () {
            let size = 0;
            try {
                const files = yield promises_1.default.readdir(dirPath, { withFileTypes: true });
                for (const file of files) {
                    const filePath = path_1.default.join(dirPath, file.name);
                    if (file.isDirectory()) {
                        size += yield this.getDirectorySize(filePath);
                    }
                    else {
                        const stats = yield promises_1.default.stat(filePath);
                        size += stats.size;
                    }
                }
            }
            catch (error) {
                logger_middleware_1.logger.error(`Failed to calculate directory size:`, error);
            }
            return size;
        });
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
