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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareService = exports.AccessModeError = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const path = __importStar(require("path"));
const mime = __importStar(require("mime-types"));
const constants_1 = require("./constants");
class AccessModeError extends common_1.BadRequestException {
    constructor(message) {
        super(message);
        this.name = 'AccessModeError';
    }
}
exports.AccessModeError = AccessModeError;
let CloudflareService = class CloudflareService {
    constructor(storageOptions) {
        this.storageOptions = storageOptions;
        this.defaultExpiry = 3600;
        this.defaultAccessMode = 'hybrid';
        this.options = storageOptions;
    }
    get accessMode() {
        return this.options.accessMode || this.defaultAccessMode;
    }
    isPublicAccessAllowed() {
        return this.accessMode === 'public-read' || this.accessMode === 'hybrid';
    }
    ensurePublicAccessAllowed() {
        if (this.accessMode === 'private') {
            throw new AccessModeError('Public URL generation is not allowed in "private" access mode. Use presigned URLs for file access.');
        }
    }
    onModuleInit() {
        this.initializeClient();
    }
    onModuleDestroy() {
        if (this.s3Client) {
            this.s3Client.destroy();
        }
    }
    initializeClient() {
        this.s3Client = new client_s3_1.S3Client({
            endpoint: this.options.endpoint,
            region: this.options.region || 'auto',
            credentials: {
                accessKeyId: this.options.accessKeyId,
                secretAccessKey: this.options.secretAccessKey,
            },
            forcePathStyle: true,
            requestChecksumCalculation: 'WHEN_REQUIRED',
        });
    }
    setOptions(options) {
        this.options = options;
        this.initializeClient();
    }
    getOptions() {
        return this.options;
    }
    sanitizeFilename(filename) {
        const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const timestamp = Date.now();
        const ext = path.extname(sanitized);
        const basename = path.basename(sanitized, ext);
        return `${basename}_${timestamp}${ext}`;
    }
    detectMimeType(filename, fallbackContentType = 'application/octet-stream') {
        const mimeType = mime.lookup(filename);
        return mimeType || fallbackContentType;
    }
    async getUploadUrl(fileKey, fileSize, customFilename, contentType) {
        const filename = customFilename || path.basename(fileKey);
        const sanitizedFilename = this.sanitizeFilename(filename);
        const finalFileKey = fileKey.includes('/')
            ? `${path.dirname(fileKey)}/${sanitizedFilename}`
            : sanitizedFilename;
        const mimeType = contentType || this.detectMimeType(sanitizedFilename);
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.options.bucketName,
            Key: finalFileKey,
            ContentType: mimeType,
        });
        const expiry = this.options.signedUrlExpiry || this.defaultExpiry;
        const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, {
            expiresIn: expiry,
            signableHeaders: new Set(['host', 'content-type']),
        });
        let publicUrl = null;
        if (this.options.publicUrlBase && this.isPublicAccessAllowed()) {
            publicUrl = `${this.options.publicUrlBase}/${finalFileKey}`;
        }
        return {
            uploadUrl,
            fileKey: finalFileKey,
            publicUrl,
            mimeType,
            sizeField: fileSize,
        };
    }
    async getDownloadUrl(fileKey) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.options.bucketName,
            Key: fileKey,
        });
        const expiry = this.options.signedUrlExpiry || this.defaultExpiry;
        const downloadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn: expiry });
        let publicUrl = null;
        if (this.options.publicUrlBase && this.isPublicAccessAllowed()) {
            publicUrl = `${this.options.publicUrlBase}/${fileKey}`;
        }
        return {
            downloadUrl,
            publicUrl,
        };
    }
    async deleteFile(fileKey) {
        try {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: this.options.bucketName,
                Key: fileKey,
            });
            await this.s3Client.send(command);
            return true;
        }
        catch (error) {
            console.error(`Failed to delete file ${fileKey}:`, error);
            return false;
        }
    }
    async deleteFiles(fileKeys) {
        const results = await Promise.all(fileKeys.map(async (fileKey) => {
            const success = await this.deleteFile(fileKey);
            return { fileKey, success };
        }));
        return {
            success: results.filter((r) => r.success).map((r) => r.fileKey),
            failed: results.filter((r) => !r.success).map((r) => r.fileKey),
        };
    }
    async getFileInfo(fileKey) {
        try {
            const command = new client_s3_1.HeadObjectCommand({
                Bucket: this.options.bucketName,
                Key: fileKey,
            });
            const response = await this.s3Client.send(command);
            return {
                size: response.ContentLength || 0,
                lastModified: response.LastModified,
                contentType: response.ContentType,
            };
        }
        catch (error) {
            return null;
        }
    }
    async fileExists(fileKey) {
        const fileInfo = await this.getFileInfo(fileKey);
        return fileInfo !== null;
    }
    generateFileKey(prefix, filename) {
        const timestamp = Date.now();
        const sanitizedFilename = this.sanitizeFilename(filename);
        return `${prefix}/${timestamp}_${sanitizedFilename}`;
    }
};
exports.CloudflareService = CloudflareService;
exports.CloudflareService = CloudflareService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(constants_1.STORAGE_OPTIONS)),
    __metadata("design:paramtypes", [Object])
], CloudflareService);
//# sourceMappingURL=cloudflare.service.js.map