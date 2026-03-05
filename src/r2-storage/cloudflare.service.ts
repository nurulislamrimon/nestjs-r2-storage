import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';
import * as mime from 'mime-types';
import { StorageOptions } from './interfaces/storage-options.interface';
import { STORAGE_OPTIONS } from './constants';

export interface UploadUrlResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl?: string;
  mimeType: string;
}

export interface DownloadUrlResult {
  downloadUrl: string;
  publicUrl?: string;
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

  constructor(
    @Inject(STORAGE_OPTIONS) private readonly storageOptions: StorageOptions,
  ) {
    this.options = storageOptions;
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
    this.s3Client = new S3Client({
      endpoint: this.options.endpoint,
      region: this.options.region || 'auto',
      credentials: {
        accessKeyId: this.options.accessKeyId,
        secretAccessKey: this.options.secretAccessKey,
      },
      forcePathStyle: true,
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

    const command = new PutObjectCommand({
      Bucket: this.options.bucketName,
      Key: finalFileKey,
      ContentType: mimeType,
      ContentLength: fileSize,
    });

    const expiry = this.options.signedUrlExpiry || this.defaultExpiry;
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: expiry });

    let publicUrl: string | undefined;
    if (this.options.publicUrlBase) {
      publicUrl = `${this.options.publicUrlBase}/${finalFileKey}`;
    }

    return {
      uploadUrl,
      fileKey: finalFileKey,
      publicUrl,
      mimeType,
    };
  }

  async getDownloadUrl(fileKey: string): Promise<DownloadUrlResult> {
    const command = new GetObjectCommand({
      Bucket: this.options.bucketName,
      Key: fileKey,
    });

    const expiry = this.options.signedUrlExpiry || this.defaultExpiry;
    const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: expiry });

    let publicUrl: string | undefined;
    if (this.options.publicUrlBase) {
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
