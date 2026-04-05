import { Injectable, OnModuleInit, OnModuleDestroy, Inject, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';
import * as mime from 'mime-types';
import { StorageOptions, AccessMode } from './interfaces/storage-options.interface';
import { STORAGE_OPTIONS } from './constants';

export class AccessModeError extends BadRequestException {
  constructor(message: string) {
    super(message);
    this.name = 'AccessModeError';
  }
}

export interface UploadUrlResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string | null;
  mimeType: string;
  /**
   * File size constraint for client-side validation.
   * This is NOT passed to AWS SDK signing to avoid SignatureDoesNotMatch errors.
   * Clients should validate file size before uploading.
   */
  sizeField?: number;
}

export interface DownloadUrlResult {
  downloadUrl: string;
  publicUrl: string | null;
}

export interface FileInfo {
  size: number;
  lastModified?: Date;
  contentType?: string;
}

@Injectable()
export class CloudflareService implements OnModuleInit, OnModuleDestroy {
  private s3Client: S3Client;
  private options: StorageOptions;
  private readonly defaultExpiry = 3600;
  private readonly defaultAccessMode: AccessMode = 'hybrid';

  constructor(
    @Inject(STORAGE_OPTIONS) private readonly storageOptions: StorageOptions,
  ) {
    this.options = storageOptions;
  }

  private get accessMode(): AccessMode {
    return this.options.accessMode || this.defaultAccessMode;
  }

  private isPublicAccessAllowed(): boolean {
    return this.accessMode === 'public-read' || this.accessMode === 'hybrid';
  }

  private ensurePublicAccessAllowed(): void {
    if (this.accessMode === 'private') {
      throw new AccessModeError(
        'Public URL generation is not allowed in "private" access mode. Use presigned URLs for file access.',
      );
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

  private initializeClient(): void {
    /**
     * Configure S3Client for Cloudflare R2.
     * 
     * requestChecksumCalculation: "WHEN_REQUIRED" prevents AWS SDK from automatically
     * adding checksum headers (MD5, CRC32, etc.) that break with R2's S3-compatible API.
     * 
     * forcePathStyle: true is required for R2 (uses path-style URLs).
     * region: "auto" is required for R2.
     */
    this.s3Client = new S3Client({
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

  setOptions(options: StorageOptions): void {
    this.options = options;
    this.initializeClient();
  }

  getOptions(): StorageOptions {
    return this.options;
  }

  private sanitizeFilename(filename: string): string {
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const ext = path.extname(sanitized);
    const basename = path.basename(sanitized, ext);
    return `${basename}_${timestamp}${ext}`;
  }

  private detectMimeType(filename: string, fallbackContentType: string = 'application/octet-stream'): string {
    const mimeType = mime.lookup(filename);
    return mimeType || fallbackContentType;
  }

  async getUploadUrl(
    fileKey: string,
    fileSize: number,
    customFilename?: string,
    contentType?: string,
  ): Promise<UploadUrlResult> {
    const filename = customFilename || path.basename(fileKey);
    const sanitizedFilename = this.sanitizeFilename(filename);
    const finalFileKey = fileKey.includes('/')
      ? `${path.dirname(fileKey)}/${sanitizedFilename}`
      : sanitizedFilename;

    const mimeType = contentType || this.detectMimeType(sanitizedFilename);

    /**
     * Create PutObjectCommand WITHOUT ContentLength.
     * 
     * Why ContentLength is NOT used in signing:
     * - Browsers may calculate Content-Length differently (with/without compression)
     * - This causes SignatureDoesNotMatch errors during upload
     * - The signed URL should only authorize the operation, not the exact payload size
     * 
     * Use sizeField instead to let clients validate file size before upload.
     */
    const command = new PutObjectCommand({
      Bucket: this.options.bucketName,
      Key: finalFileKey,
      ContentType: mimeType,
    });

    const expiry = this.options.signedUrlExpiry || this.defaultExpiry;
    /**
     * Generate presigned URL with minimal signing.
     * Only signs: host (and content-type if provided).
     * Explicitly prevents signing content-length to avoid browser inconsistency.
     */
    const uploadUrl = await getSignedUrl(this.s3Client, command, { 
      expiresIn: expiry,
      signableHeaders: new Set(['host', 'content-type']),
    });

    let publicUrl: string | null = null;
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

  async getDownloadUrl(fileKey: string): Promise<DownloadUrlResult> {
    const command = new GetObjectCommand({
      Bucket: this.options.bucketName,
      Key: fileKey,
    });

    const expiry = this.options.signedUrlExpiry || this.defaultExpiry;
    const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: expiry });

    let publicUrl: string | null = null;
    if (this.options.publicUrlBase && this.isPublicAccessAllowed()) {
      publicUrl = `${this.options.publicUrlBase}/${fileKey}`;
    }

    return {
      downloadUrl,
      publicUrl,
    };
  }

  async deleteFile(fileKey: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.options.bucketName,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error(`Failed to delete file ${fileKey}:`, error);
      return false;
    }
  }

  async deleteFiles(fileKeys: string[]): Promise<{ success: string[]; failed: string[] }> {
    const results = await Promise.all(
      fileKeys.map(async (fileKey) => {
        const success = await this.deleteFile(fileKey);
        return { fileKey, success };
      }),
    );

    return {
      success: results.filter((r) => r.success).map((r) => r.fileKey),
      failed: results.filter((r) => !r.success).map((r) => r.fileKey),
    };
  }

  async getFileInfo(fileKey: string): Promise<FileInfo | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.options.bucketName,
        Key: fileKey,
      });

      const response = await this.s3Client.send(command);
      return {
        size: response.ContentLength || 0,
        lastModified: response.LastModified,
        contentType: response.ContentType,
      };
    } catch (error) {
      return null;
    }
  }

  async fileExists(fileKey: string): Promise<boolean> {
    const fileInfo = await this.getFileInfo(fileKey);
    return fileInfo !== null;
  }

  generateFileKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const sanitizedFilename = this.sanitizeFilename(filename);
    return `${prefix}/${timestamp}_${sanitizedFilename}`;
  }
}
